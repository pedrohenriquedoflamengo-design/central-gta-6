import { schemaReady, initialize } from '../../lib/schema.js';
import { SESSION_COOKIE, NONCE_COOKIE, now, cookies, randomToken, hashToken, cookie, verifyGoogle, publicUser, isAdmin } from '../../lib/auth.js';

const CATEGORIES = ['geral', 'duvidas', 'teorias', 'missoes'];
const TYPES = ['principal', 'secundaria', 'atividade'];
const CHARACTERS = ['lucia', 'jason', 'dupla', 'outros'];
const MAX_BODY = 20000;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
function text(value, min, max, label) {
  if (typeof value !== 'string') fail(400, `${label}: preencha o campo.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) fail(400, `${label}: use de ${min} a ${max} caracteres.`);
  return trimmed;
}
function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') fail(400, 'Valor de seleção inválido.');
  return value;
}
function choice(value, options) {
  if (!options.includes(value)) fail(400, 'Opção inválida.');
  return value;
}
function id(value) {
  if (!/^\d{1,12}$/.test(String(value)) || Number(value) < 1) fail(400, 'Identificador inválido.');
  return Number(value);
}
async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) fail(413, 'O conteúdo é muito grande.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Conteúdo ausente.');
  let length = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); fail(413, 'O conteúdo é muito grande.'); }
    chunks.push(value);
  }
  const data = new Uint8Array(length); let offset = 0;
  chunks.forEach(chunk => { data.set(chunk, offset); offset += chunk.length; });
  return new TextDecoder().decode(data);
}
async function bodyJSON(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'Envie conteúdo JSON.');
  let body;
  const raw = await readBody(request);
  try { body = JSON.parse(raw); } catch { fail(400, 'Conteúdo inválido.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Conteúdo inválido.');
  return body;
}
function protectOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) fail(403, 'Origem da solicitação inválida.');
}
async function userFor(request, env) {
  const token = cookies(request)[SESSION_COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  if (!env.DB || !await schemaReady(env.DB)) return null;
  const user = await env.DB.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(await hashToken(token), now()).first();
  if (user?.blocked) fail(403, 'Esta conta está suspensa.');
  return user;
}
async function requireUser(request, env, admin = false) {
  const user = await userFor(request, env);
  if (!user) fail(401, 'Entre na sua conta para continuar.');
  if (admin && !await isAdmin(user, env)) fail(403, 'Acesso reservado à administração.');
  return user;
}
async function rate(db, user, action, maximum, window) {
  const bucket = Math.floor(now() / window);
  const result = await db.prepare(`INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<?`).bind(`${action}:${user.id}:${bucket}`, (bucket + 1) * window, maximum).run();
  if (!result.meta.changes) fail(429, 'Você fez muitas tentativas. Aguarde um pouco e tente novamente.');
}
async function publicTopic(db, topicId) {
  return db.prepare(`SELECT t.*,u.nickname FROM topics t JOIN users u ON u.id=t.user_id WHERE t.id=? AND t.hidden=0 AND u.blocked=0`).bind(topicId).first();
}
function pageRows(rows) {
  return { items: rows.slice(0, 20), next: rows.length > 20 ? rows[19].id : null };
}
function missionData(body) {
  const source = text(body.source_url, 0, 500, 'Fonte');
  if (source) { try { if (new URL(source).protocol !== 'https:') fail(400, 'A fonte deve usar HTTPS.'); } catch { fail(400, 'URL da fonte inválida.'); } }
  const published = boolean(body.published);
  if (published && !source) fail(400, 'Adicione uma fonte antes de publicar a missão.');
  return [text(body.title, 3, 120, 'Título'), text(body.summary, 10, 500, 'Resumo'), text(body.body, 10, 8000, 'Guia'), choice(body.type, TYPES), choice(body.character, CHARACTERS), text(body.region, 0, 80, 'Região'), text(body.rewards, 0, 500, 'Recompensas'), source, Number(boolean(body.spoiler, true)), Number(published)];
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url); const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const method = request.method;
  try {
    if (path === 'config' && method === 'GET') {
      const nonce = randomToken();
      return json({ loginReady: !!env.GOOGLE_CLIENT_ID && !!env.DB, clientId: env.GOOGLE_CLIENT_ID || null, nonce }, 200, { 'Set-Cookie': cookie(NONCE_COOKIE, nonce, 600, 'None') });
    }
    if (path === 'auth/google' && method === 'POST') {
      try {
        if (!env.GOOGLE_CLIENT_ID || !env.DB) fail(503, 'O login ainda está sendo preparado.');
        if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) fail(415, 'Formato inválido.');
        const form = new URLSearchParams(await readBody(request)); const jar = cookies(request);
        const csrf = form.get('g_csrf_token');
        if (!csrf || csrf.length > 512 || csrf !== jar.g_csrf_token) fail(403, 'Não foi possível confirmar a solicitação.');
        const claims = await verifyGoogle(form.get('credential'), env.GOOGLE_CLIENT_ID, jar[NONCE_COOKIE]);
        await initialize(env.DB);
        const userId = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO users(id,google_sub,nickname,created_at) VALUES (?,?,?,?) ON CONFLICT(google_sub) DO NOTHING`).bind(userId, claims.sub, `Jogador ${userId.slice(0, 6)}`, now()).run();
        const user = await env.DB.prepare('SELECT * FROM users WHERE google_sub=?').bind(claims.sub).first();
        if (user.blocked) fail(403, 'Conta suspensa.');
        const token = randomToken();
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),
          env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now()),
          env.DB.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY expires_at DESC LIMIT -1 OFFSET 4)').bind(user.id),
          env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hashToken(token), user.id, now() + 604800),
        ]);
        const headers = new Headers({ Location: '/conta.html', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        headers.append('Set-Cookie', cookie(SESSION_COOKIE, token, 604800));
        headers.append('Set-Cookie', cookie(NONCE_COOKIE, '', 0, 'None'));
        return new Response(null, { status: 303, headers });
      } catch {
        return new Response(null, { status: 303, headers: { Location: '/conta.html?erro=login', 'Cache-Control': 'no-store' } });
      }
    }
    if (method !== 'GET' && method !== 'HEAD') protectOrigin(request);
    if (path === 'me' && method === 'GET') {
      const user = await userFor(request, env);
      return json({ user: user ? await publicUser(user, env) : null });
    }
    if (path === 'logout' && method === 'POST') {
      const token = cookies(request)[SESSION_COOKIE];
      if (token && env.DB && await schemaReady(env.DB)) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hashToken(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) });
    }
    if (!env.DB) fail(503, 'A comunidade está sendo preparada. Tente novamente mais tarde.');
    const ready = await schemaReady(env.DB);
    if (!ready) {
      if (method === 'GET' && (path === 'topics' || path === 'missions')) return json({ items: [], next: null, ready: false });
      fail(503, 'A comunidade está sendo preparada. Tente novamente mais tarde.');
    }
    if (path === 'profile' && method === 'PATCH') {
      const user = await requireUser(request, env); const body = await bodyJSON(request);
      const nickname = text(body.nickname, 3, 24, 'Apelido');
      if (!/^[\p{L}\p{N} ._-]+$/u.test(nickname)) fail(400, 'Use letras, números, espaços, ponto, hífen ou sublinhado no apelido.');
      await rate(env.DB, user, 'nickname', 5, 3600);
      await env.DB.prepare('UPDATE users SET nickname=? WHERE id=?').bind(nickname, user.id).run();
      return json({ user: await publicUser({ ...user, nickname }, env) });
    }
    if (path === 'topics' && method === 'GET') {
      const cursor = url.searchParams.has('before') ? id(url.searchParams.get('before')) : Number.MAX_SAFE_INTEGER;
      const category = url.searchParams.get('category');
      const where = category ? ' AND t.category=?' : '';
      if (category) choice(category, CATEGORIES);
      const args = category ? [cursor, category] : [cursor];
      const { results } = await env.DB.prepare(`SELECT t.id,t.title,t.category,t.spoiler,t.created_at,t.user_id,u.nickname FROM topics t JOIN users u ON u.id=t.user_id WHERE t.hidden=0 AND u.blocked=0 AND t.id<?${where} ORDER BY t.id DESC LIMIT 21`).bind(...args).all();
      return json({ ...pageRows(results), ready: true });
    }
    if (path === 'topics' && method === 'POST') {
      const user = await requireUser(request, env); const body = await bodyJSON(request);
      const title = text(body.title, 5, 120, 'Título'); const content = text(body.body, 10, 6000, 'Mensagem');
      const category = choice(body.category, CATEGORIES); const spoiler = boolean(body.spoiler);
      await rate(env.DB, user, 'topic', 1, 60);
      const result = await env.DB.prepare('INSERT INTO topics(user_id,category,title,body,spoiler,created_at) VALUES (?,?,?,?,?,?)').bind(user.id, category, title, content, Number(spoiler), now()).run();
      return json({ id: result.meta.last_row_id }, 201);
    }
    const topic = path.match(/^topics\/(\d+)$/);
    if (topic && method === 'GET') {
      const record = await publicTopic(env.DB, id(topic[1]));
      if (!record) fail(404, 'Tópico não encontrado.');
      delete record.hidden;
      return json({ topic: record });
    }
    if (topic && method === 'DELETE') {
      const user = await requireUser(request, env); const record = await publicTopic(env.DB, id(topic[1]));
      if (!record) fail(404, 'Tópico não encontrado.');
      if (record.user_id !== user.id && !await isAdmin(user, env)) fail(403, 'Você só pode remover suas próprias publicações.');
      await env.DB.prepare('UPDATE topics SET hidden=1 WHERE id=?').bind(record.id).run();
      return json({ ok: true });
    }
    const replies = path.match(/^topics\/(\d+)\/replies$/);
    if (replies) {
      const topicId = id(replies[1]);
      if (!await publicTopic(env.DB, topicId)) fail(404, 'Tópico não encontrado.');
      if (method === 'GET') {
        const cursor = url.searchParams.has('after') ? id(url.searchParams.get('after')) : 0;
        const { results } = await env.DB.prepare(`SELECT r.id,r.body,r.spoiler,r.created_at,r.user_id,u.nickname FROM replies r JOIN users u ON u.id=r.user_id WHERE r.topic_id=? AND r.hidden=0 AND u.blocked=0 AND r.id>? ORDER BY r.id LIMIT 21`).bind(topicId, cursor).all();
        return json(pageRows(results));
      }
      if (method === 'POST') {
        const user = await requireUser(request, env); const body = await bodyJSON(request);
        const content = text(body.body, 2, 4000, 'Resposta'); const spoiler = boolean(body.spoiler);
        await rate(env.DB, user, 'reply', 5, 60);
        const result = await env.DB.prepare('INSERT INTO replies(topic_id,user_id,body,spoiler,created_at) VALUES (?,?,?,?,?)').bind(topicId, user.id, content, Number(spoiler), now()).run();
        return json({ id: result.meta.last_row_id }, 201);
      }
    }
    const reply = path.match(/^replies\/(\d+)$/);
    if (reply && method === 'DELETE') {
      const user = await requireUser(request, env); const record = await env.DB.prepare('SELECT * FROM replies WHERE id=? AND hidden=0').bind(id(reply[1])).first();
      if (!record) fail(404, 'Resposta não encontrada.');
      if (record.user_id !== user.id && !await isAdmin(user, env)) fail(403, 'Você só pode remover suas próprias publicações.');
      await env.DB.prepare('UPDATE replies SET hidden=1 WHERE id=?').bind(record.id).run();
      return json({ ok: true });
    }
    if (path === 'reports' && method === 'POST') {
      const user = await requireUser(request, env); const body = await bodyJSON(request);
      const kind = choice(body.kind, ['topic', 'reply']); const target = id(body.target_id); const reason = text(body.reason, 5, 500, 'Motivo');
      const record = kind === 'topic' ? await publicTopic(env.DB, target) : await env.DB.prepare('SELECT id FROM replies WHERE id=? AND hidden=0').bind(target).first();
      if (!record) fail(404, 'Publicação não encontrada.');
      await rate(env.DB, user, 'report', 5, 3600);
      await env.DB.prepare('INSERT OR IGNORE INTO reports(user_id,kind,target_id,reason,created_at) VALUES (?,?,?,?,?)').bind(user.id, kind, target, reason, now()).run();
      return json({ ok: true }, 201);
    }
    if ((path === 'missions' || path === 'admin/missions') && method === 'GET') {
      const admin = path.startsWith('admin/'); if (admin) await requireUser(request, env, true);
      const cursor = url.searchParams.has('before') ? id(url.searchParams.get('before')) : Number.MAX_SAFE_INTEGER;
      const terms = ['id<?']; const args = [cursor];
      if (!admin) terms.push('published=1');
      for (const [field, allowed] of [['type', TYPES], ['character', CHARACTERS]]) {
        const value = url.searchParams.get(field);
        if (value) { choice(value, allowed); terms.push(`${field}=?`); args.push(value); }
      }
      const query = url.searchParams.get('q')?.trim();
      if (query) { if (query.length > 80) fail(400, 'Busca muito longa.'); terms.push("title LIKE ? ESCAPE '\\'"); args.push(`%${query.replace(/[\\%_]/g, '\\$&')}%`); }
      const { results } = await env.DB.prepare(`SELECT id,title,summary,type,character,region,spoiler,published FROM missions WHERE ${terms.join(' AND ')} ORDER BY id DESC LIMIT 21`).bind(...args).all();
      return json({ ...pageRows(results), ready: true });
    }
    const mission = path.match(/^missions\/(\d+)$/);
    if (mission && method === 'GET') {
      const record = await env.DB.prepare('SELECT * FROM missions WHERE id=? AND published=1').bind(id(mission[1])).first();
      if (!record) fail(404, 'Missão não encontrada.');
      return json({ mission: record });
    }
    if (path === 'progress' && method === 'GET') {
      const user = await requireUser(request, env);
      const { results } = await env.DB.prepare('SELECT p.mission_id FROM progress p JOIN missions m ON m.id=p.mission_id WHERE p.user_id=? AND m.published=1 LIMIT 2000').bind(user.id).all();
      return json({ completed: results.map(item => item.mission_id) });
    }
    const progress = path.match(/^progress\/(\d+)$/);
    if (progress && method === 'PUT') {
      const user = await requireUser(request, env); const body = await bodyJSON(request); const missionId = id(progress[1]);
      const complete = boolean(body.completed);
      if (!await env.DB.prepare('SELECT id FROM missions WHERE id=? AND published=1').bind(missionId).first()) fail(404, 'Missão não encontrada.');
      await rate(env.DB, user, 'progress', 120, 60);
      if (complete) await env.DB.prepare('INSERT OR IGNORE INTO progress(user_id,mission_id,completed_at) VALUES (?,?,?)').bind(user.id, missionId, now()).run();
      else await env.DB.prepare('DELETE FROM progress WHERE user_id=? AND mission_id=?').bind(user.id, missionId).run();
      return json({ completed: complete });
    }
    if (path === 'admin/missions' && method === 'POST') {
      await requireUser(request, env, true); const data = missionData(await bodyJSON(request));
      const result = await env.DB.prepare('INSERT INTO missions(title,summary,body,type,character,region,rewards,source_url,spoiler,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(...data, now(), now()).run();
      return json({ id: result.meta.last_row_id }, 201);
    }
    const adminMission = path.match(/^admin\/missions\/(\d+)$/);
    if (adminMission) {
      await requireUser(request, env, true); const missionId = id(adminMission[1]);
      if (!await env.DB.prepare('SELECT id FROM missions WHERE id=?').bind(missionId).first()) fail(404, 'Missão não encontrada.');
      if (method === 'GET') return json({ mission: await env.DB.prepare('SELECT * FROM missions WHERE id=?').bind(missionId).first() });
      if (method === 'PATCH') {
        const data = missionData(await bodyJSON(request));
        await env.DB.prepare('UPDATE missions SET title=?,summary=?,body=?,type=?,character=?,region=?,rewards=?,source_url=?,spoiler=?,published=?,updated_at=? WHERE id=?').bind(...data, now(), missionId).run();
        return json({ ok: true });
      }
    }
    if (path === 'admin/reports' && method === 'GET') {
      await requireUser(request, env, true);
      const { results } = await env.DB.prepare(`SELECT r.*,CASE WHEN r.kind='topic' THEN t.title ELSE '' END AS title,CASE WHEN r.kind='topic' THEN t.body ELSE p.body END AS body,CASE WHEN r.kind='topic' THEN t.user_id ELSE p.user_id END AS author_id FROM reports r LEFT JOIN topics t ON r.kind='topic' AND t.id=r.target_id LEFT JOIN replies p ON r.kind='reply' AND p.id=r.target_id WHERE r.resolved=0 ORDER BY r.id LIMIT 20`).all();
      return json({ items: results });
    }
    const report = path.match(/^admin\/reports\/(\d+)$/);
    if (report && method === 'PATCH') {
      const admin = await requireUser(request, env, true); const body = await bodyJSON(request);
      const action = choice(body.action, ['resolve', 'hide', 'block']);
      const record = await env.DB.prepare('SELECT * FROM reports WHERE id=? AND resolved=0').bind(id(report[1])).first();
      if (!record) fail(404, 'Denúncia não encontrada.');
      const table = record.kind === 'topic' ? 'topics' : 'replies';
      const target = await env.DB.prepare(`SELECT user_id FROM ${table} WHERE id=?`).bind(record.target_id).first();
      if (action === 'hide') await env.DB.prepare(`UPDATE ${table} SET hidden=1 WHERE id=?`).bind(record.target_id).run();
      if (action === 'block' && target) {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(target.user_id).first();
        if (await isAdmin(user, env) || target.user_id === admin.id) fail(400, 'A conta administradora não pode ser bloqueada.');
        await env.DB.prepare('UPDATE users SET blocked=1 WHERE id=?').bind(target.user_id).run();
      }
      await env.DB.prepare('UPDATE reports SET resolved=1 WHERE id=?').bind(record.id).run();
      return json({ ok: true });
    }
    fail(404, 'Recurso não encontrado.');
  } catch (error) {
    return json({ error: error instanceof HttpError ? error.message : 'Não foi possível concluir agora. Tente novamente.' }, error instanceof HttpError ? error.status : 503);
  }
}
