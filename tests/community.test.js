import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { onRequest } from '../functions/api/[[path]].js';
import { D1, fixture, request, sampleMission } from './helpers.js';
import { initialize, schemaReady } from '../lib/schema.js';
import { verifyGoogle, now } from '../lib/auth.js';
const run = (env, path, options) => onRequest({ request: request(path, options), env });
const topicData = { title: 'Discussão para testes', body: 'Uma mensagem de teste da comunidade.', category: 'geral', spoiler: true };
async function topic(env, user = 'player') { const response = await run(env, 'topics', { user, method: 'POST', data: topicData }); assert.equal(response.status, 201); return (await response.json()).id; }
async function mission(env) { const response = await run(env, 'admin/missions', { user: 'owner', method: 'POST', data: sampleMission }); assert.equal(response.status, 201); return (await response.json()).id; }

test('database initialization is idempotent and never seeded with fictional missions', async () => {
  const db = new D1(); assert.equal(await schemaReady(db), false); await initialize(db); await initialize(db);
  assert.equal(await schemaReady(db), true);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM missions').first()).n, 0);
});
test('public requests do not create tables; missing configuration fails clearly', async () => {
  const DB = new D1(); const response = await run({ DB }, 'topics');
  assert.deepEqual(await response.json(), { items: [], next: null, ready: false });
  assert.equal(await schemaReady(DB), false);
  assert.equal((await run({}, 'topics')).status, 503);
  assert.equal((await run({}, 'config')).headers.get('Cache-Control'), 'no-store');
});
test('Google JWT validation rejects forgery, wrong audience, expiry and replay with another nonce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'test'; const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (aud = 'valid-client', nonce = 'nonce', expiry = now() + 3600) => new SignJWT({ nonce }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject('google-user').setIssuer('https://accounts.google.com').setAudience(aud).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  assert.equal((await verifyGoogle(await sign(), 'valid-client', 'nonce', keys)).sub, 'google-user');
  await assert.rejects(verifyGoogle(await sign('attacker-client'), 'valid-client', 'nonce', keys));
  await assert.rejects(verifyGoogle(await sign('valid-client', 'different'), 'valid-client', 'nonce', keys));
  await assert.rejects(verifyGoogle(await sign('valid-client', 'nonce', now() - 1), 'valid-client', 'nonce', keys));
  await assert.rejects(verifyGoogle('forged.token.signature', 'valid-client', 'nonce', keys));
});
test('Google callback requires CSRF and never initializes a database for an invalid request', async () => {
  const DB = new D1(); const response = await onRequest({ env: { DB, GOOGLE_CLIENT_ID: 'client' }, request: new Request('https://centralgta6.pages.dev/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'credential=invalid&g_csrf_token=forged' }) });
  assert.equal(response.status, 303); assert.equal(response.headers.get('Location'), '/conta.html?erro=login'); assert.equal(await schemaReady(DB), false);
});
test('anonymous and cross-origin users cannot post; users cannot grant themselves admin', async () => {
  const env = await fixture();
  assert.equal((await run(env, 'topics', { method: 'POST', data: topicData })).status, 401);
  assert.equal((await run(env, 'topics', { user: 'player', method: 'POST', origin: 'https://attacker.example', data: topicData })).status, 403);
  const response = await run(env, 'profile', { user: 'player', method: 'PATCH', data: { nickname: 'Meu apelido', admin: true, google_sub: 'google-owner' } });
  assert.equal(response.status, 200); assert.equal((await response.json()).user.admin, false);
  assert.equal((await run(env, 'admin/missions', { user: 'player', method: 'POST', data: sampleMission })).status, 403);
});
test('topic publishing preserves text, validates fields and rate limits repeated posts', async () => {
  const env = await fixture(); const id = await topic(env);
  assert.equal((await run(env, 'topics', { user: 'player', method: 'POST', data: topicData })).status, 429);
  assert.equal((await (await run(env, `topics/${id}`)).json()).topic.spoiler, 1);
  assert.equal((await run(env, 'topics', { user: 'other', method: 'POST', data: { ...topicData, category: 'admin' } })).status, 400);
  assert.equal((await run(env, 'topics', { user: 'other', method: 'POST', data: { ...topicData, body: 'x'.repeat(21000) } })).status, 413);
  assert.equal((await run(env, 'topics', { user: 'other', method: 'POST', data: { ...topicData, spoiler: 'false' } })).status, 400);
});
test('only the author or admin can remove a topic or a reply', async () => {
  const env = await fixture(); const id = await topic(env);
  const reply = await run(env, `topics/${id}/replies`, { user: 'other', method: 'POST', data: { body: 'Uma resposta válida.' } }); const replyId = (await reply.json()).id;
  assert.equal((await run(env, `replies/${replyId}`, { user: 'player', method: 'DELETE' })).status, 403);
  assert.equal((await run(env, `replies/${replyId}`, { user: 'other', method: 'DELETE' })).status, 200);
  assert.equal((await run(env, `topics/${id}`, { user: 'other', method: 'DELETE' })).status, 403);
  assert.equal((await run(env, `topics/${id}`, { user: 'player', method: 'DELETE' })).status, 200);
  assert.equal((await run(env, `topics/${id}`)).status, 404);
});
test('keyset pagination returns every public topic without repeating records', async () => {
  const env = await fixture();
  for (let i = 0; i < 23; i++) await env.DB.prepare('INSERT INTO topics(user_id,category,title,body,created_at) VALUES (?,?,?,?,?)').bind('player', 'geral', `Topic ${i}`, 'Body for pagination.', now()).run();
  const first = await (await run(env, 'topics')).json(); const second = await (await run(env, `topics?before=${first.next}`)).json();
  assert.equal(first.items.length, 20); assert.equal(second.items.length, 3); assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 23);
});
test('mission drafts are private, progress belongs to the session user and SQL-looking input stays text', async () => {
  const env = await fixture(); const publishedId = await mission(env);
  const draft = await run(env, 'admin/missions', { user: 'owner', method: 'POST', data: { ...sampleMission, published: false } }); const draftId = (await draft.json()).id;
  assert.equal((await run(env, `missions/${draftId}`)).status, 404);
  assert.equal((await (await run(env, 'missions')).json()).items.length, 1);
  assert.equal((await run(env, 'admin/missions', { user: 'owner', method: 'POST', data: { ...sampleMission, source_url: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await run(env, 'admin/missions', { user: 'owner', method: 'POST', data: { ...sampleMission, source_url: '' } })).status, 400);
  assert.equal((await run(env, `progress/${publishedId}`, { user: 'player', method: 'PUT', data: { completed: true, user_id: 'other' } })).status, 200);
  assert.deepEqual((await (await run(env, 'progress', { user: 'player' })).json()).completed, [publishedId]);
  assert.deepEqual((await (await run(env, 'progress', { user: 'other' })).json()).completed, []);
  assert.equal((await run(env, `progress/${draftId}`, { user: 'player', method: 'PUT', data: { completed: true } })).status, 404);
  assert.equal((await run(env, 'missions?q=%27%3B%20DROP%20TABLE%20users%3B--')).status, 200);
  assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM users').first()).n, 3);
});
test('reports are private, duplicate reports do not multiply, and admin can suspend an abusive author', async () => {
  const env = await fixture(); const id = await topic(env);
  const report = { kind: 'topic', target_id: id, reason: 'Conteúdo inadequado para a comunidade.' };
  await run(env, 'reports', { user: 'other', method: 'POST', data: report }); await run(env, 'reports', { user: 'other', method: 'POST', data: report });
  assert.equal((await run(env, 'admin/reports', { user: 'other' })).status, 403);
  const reports = (await (await run(env, 'admin/reports', { user: 'owner' })).json()).items;
  assert.equal(reports.length, 1);
  assert.equal((await run(env, `admin/reports/${reports[0].id}`, { user: 'owner', method: 'PATCH', data: { action: 'block' } })).status, 200);
  assert.equal((await run(env, 'me', { user: 'player' })).status, 403);
  assert.equal((await run(env, `topics/${id}`)).status, 404);
});
test('logout revokes the session immediately and expires its cookie', async () => {
  const env = await fixture(); assert((await (await run(env, 'me', { user: 'player' })).json()).user);
  const response = await run(env, 'logout', { user: 'player', method: 'POST' });
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax; Max-Age=0/);
  assert.equal((await (await run(env, 'me', { user: 'player' })).json()).user, null);
});
