// Applied only after a verified Google sign-in. CREATE IF NOT EXISTS never erases data.
export const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL, blocked INTEGER NOT NULL DEFAULT 0 CHECK(blocked IN (0,1)), created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id,expires_at)`,
  `CREATE TABLE IF NOT EXISTS topics (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, spoiler INTEGER NOT NULL DEFAULT 0 CHECK(spoiler IN (0,1)), hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)), created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS topics_category ON topics(hidden,category,id)`,
  `CREATE INDEX IF NOT EXISTS topics_public ON topics(hidden,id)`,
  `CREATE TABLE IF NOT EXISTS replies (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES topics(id), user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, spoiler INTEGER NOT NULL DEFAULT 0 CHECK(spoiler IN (0,1)), hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)), created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS replies_topic ON replies(topic_id,hidden,id)`,
  `CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('topic','reply')), target_id INTEGER NOT NULL, reason TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN (0,1)), created_at INTEGER NOT NULL, UNIQUE(user_id,kind,target_id))`,
  `CREATE INDEX IF NOT EXISTS reports_pending ON reports(resolved,id)`,
  `CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL, type TEXT NOT NULL, character TEXT NOT NULL, region TEXT NOT NULL, rewards TEXT NOT NULL, source_url TEXT NOT NULL, spoiler INTEGER NOT NULL DEFAULT 1 CHECK(spoiler IN (0,1)), published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS missions_public ON missions(published,id)`,
  `CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL REFERENCES users(id), mission_id INTEGER NOT NULL REFERENCES missions(id), completed_at INTEGER NOT NULL, PRIMARY KEY(user_id,mission_id))`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS rate_expiration ON rate_limits(expires_at)`,
  `CREATE TABLE IF NOT EXISTS app_schema (version INTEGER PRIMARY KEY)`,
  `INSERT OR IGNORE INTO app_schema(version) VALUES (1)`,
];
const initialized = new WeakMap();
export async function schemaReady(db) {
  if (initialized.has(db)) return initialized.get(db);
  const exists = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_schema'").first();
  if (!exists) return false;
  initialized.set(db, true);
  return true;
}
export async function initialize(db) {
  if (await schemaReady(db)) return;
  await db.batch(schema.map(sql => db.prepare(sql)));
  initialized.set(db, true);
}
