import { DatabaseSync } from 'node:sqlite';
import { initialize } from '../lib/schema.js';
import { hashToken, now, SESSION_COOKIE } from '../lib/auth.js';
export class D1 {
  constructor() { this.raw = new DatabaseSync(':memory:'); this.raw.exec('PRAGMA foreign_keys=ON'); }
  prepare(sql) {
    const wrap = args => ({
      bind: (...values) => wrap(values),
      first: async () => this.raw.prepare(sql).get(...args) || null,
      all: async () => ({ results: this.raw.prepare(sql).all(...args) }),
      run: async () => { const r = this.raw.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    }); return wrap([]);
  }
  async batch(statements) {
    this.raw.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); this.raw.exec('COMMIT'); return results; }
    catch (error) { this.raw.exec('ROLLBACK'); throw error; }
  }
}
export const TOKENS = { owner: 'a'.repeat(64), player: 'b'.repeat(64), other: 'c'.repeat(64) };
export async function fixture() {
  const DB = new D1(); await initialize(DB);
  for (const name of Object.keys(TOKENS)) {
    await DB.prepare('INSERT INTO users(id,google_sub,nickname,created_at) VALUES (?,?,?,?)').bind(name, `google-${name}`, `Jogador ${name}`, now()).run();
    await DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hashToken(TOKENS[name]), name, now() + 3600).run();
  }
  return { DB, ADMIN_GOOGLE_SUB: 'google-owner' };
}
export function request(path, { user, method = 'GET', data, origin = 'https://centralgta6.pages.dev', headers = {} } = {}) {
  return new Request(`https://centralgta6.pages.dev/api/${path}`, { method, headers: { Origin: origin, ...(user ? { Cookie: `${SESSION_COOKIE}=${TOKENS[user]}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(data ? { body: JSON.stringify(data) } : {}) });
}
export const sampleMission = { title: 'Missão de teste local', summary: 'Resumo criado apenas para validar a interface.', body: 'Objetivos usados exclusivamente nos testes locais.', type: 'principal', character: 'dupla', region: 'Leonida', rewards: 'Progresso de teste', source_url: 'https://www.rockstargames.com/VI', spoiler: true, published: true };
