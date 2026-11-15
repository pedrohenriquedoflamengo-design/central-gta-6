import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { initialize } from '../lib/schema.js';
import { hashToken, now } from '../lib/auth.js';
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: 'dist/_worker.js/index.js', d1Databases: ['DB'], compatibilityDate: '2026-11-13' }));
try {
 const db = await mf.getD1Database('DB'); await initialize(db);
 await db.prepare('INSERT INTO users(id,google_sub,nickname,created_at) VALUES (?,?,?,?)').bind('smoke-player', 'smoke-google', 'Teste local', now()).run();
 const token = 'd'.repeat(64);
 await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hashToken(token), 'smoke-player', now()+3600).run();
 const origin = 'https://centralgta6.pages.dev';
 const response = await mf.dispatchFetch(`${origin}/api/topics`, { method: 'POST', headers: { Origin: origin, Cookie: `__Host-gta_session=${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({title:'Teste no D1 emulado',body:'Uma publicação local para validar D1 e Worker.',category:'geral',spoiler:false}) });
 assert.equal(response.status,201); const { id } = await response.json(); assert(id>0);
 const record = await (await mf.dispatchFetch(`${origin}/api/topics/${id}`)).json();assert.equal(record.topic.title,'Teste no D1 emulado');
 const repeated = await mf.dispatchFetch(`${origin}/api/topics`, {method:'POST',headers:{Origin:origin,Cookie:`__Host-gta_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify({title:'Outro tópico local',body:'Uma segunda mensagem para verificar limite.',category:'geral'})});
 assert.equal(repeated.status,429);
 console.log('PASS compiled Cloudflare Worker + real D1 emulator: schema, session, publish, read, rate limit');
} finally { await mf.dispose(); }
