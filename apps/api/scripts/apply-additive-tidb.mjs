/**
 * Apply ONLY additive schema changes (new tables / new indexes) to TiDB.
 * Computes the diff between TiDB and prisma/schema.prisma; refuses to run if the diff
 * contains anything that could change or remove existing data (DROP, ALTER, MODIFY, RENAME...).
 *
 * Usage (from apps/api):
 *   node --env-file=.env.local scripts/apply-additive-tidb.mjs          # show the SQL only
 *   node --env-file=.env.local scripts/apply-additive-tidb.mjs --apply  # execute it
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

const url = (process.env.DATABASE_URL || '').trim().replace(/^["']+|["']+$/g, '');
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
const apply = process.argv.includes('--apply');

const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
const diff = spawnSync(process.execPath, [cli, 'migrate', 'diff', '--from-url', url, '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
if (diff.status !== 0) {
  console.error((diff.stderr || diff.stdout).split(url).join('<DATABASE_URL>'));
  process.exit(1);
}
const sql = diff.stdout.trim();
if (!sql || /empty migration/i.test(sql)) { console.log('Nothing to apply: database already matches the schema.'); process.exit(0); }

const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);
const unsafe = statements.filter((s) => !/^(CREATE TABLE|CREATE (UNIQUE )?INDEX)\b/i.test(s));
console.log(sql + '\n');
if (unsafe.length) {
  console.error(`REFUSING: ${unsafe.length} statement(s) are not purely additive:\n` + unsafe.map((s) => '  - ' + s.split('\n')[0]).join('\n'));
  process.exit(1);
}
if (!apply) { console.log(`${statements.length} additive statement(s). Re-run with --apply to execute.`); process.exit(0); }

const u = new URL(url);
const conn = await mysql.createConnection({
  host: u.hostname, port: Number(u.port) || 4000,
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.slice(1),
  ssl: /tidbcloud\.com$/i.test(u.hostname) ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});
for (const s of statements) {
  await conn.query(s);
  console.log('applied:', s.split('\n')[0]);
}
await conn.end();
console.log('Done.');
