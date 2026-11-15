// Local browser fixture server only. This file is never copied to dist/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { onRequest } from '../functions/api/[[path]].js';
import { fixture, sampleMission } from './helpers.js';
import { now } from '../lib/auth.js';
const env = await fixture();
await env.DB.prepare('INSERT INTO missions(title,summary,body,type,character,region,rewards,source_url,spoiler,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(...['Missão apenas de teste', sampleMission.summary, sampleMission.body, 'principal', 'dupla', 'Leonida', 'Nenhuma recompensa real', sampleMission.source_url, 1, 1, now(), now()]).run();
await env.DB.prepare('INSERT INTO topics(user_id,category,title,body,spoiler,created_at) VALUES (?,?,?,?,?,?)').bind('other', 'geral', 'Conversa de teste', '<img src=x onerror="window.injected=true"> Apenas texto.', 0, now()).run();
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://localhost:4176');
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const response = await onRequest({ env, request: new Request(url, { method: req.method, headers: req.headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) }) });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
  }
  const file = resolve(root, `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
  if (!file.startsWith(root + '/') || file.includes('_worker.js')) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); res.end(await readFile(file));
 } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4176, '127.0.0.1', () => console.log('Local fixture server: http://localhost:4176'));
