/**
 * Load a JSON backup (from backup-db.mjs) into a LOCAL database, replacing its rows.
 * Refuses to run against anything that is not localhost/127.0.0.1 (never touches TiDB).
 *
 * Usage (from apps/api):
 *   node --env-file=.env.mysql.local scripts/restore-backup-local.mjs ../../backups/<file>.json
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

const file = process.argv[2];
if (!file) { console.error('Usage: restore-backup-local.mjs <backup.json>'); process.exit(1); }

const url = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error(`Refusing to restore into ${url.hostname}: only local databases are allowed.`);
  process.exit(1);
}

const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
const conn = await mysql.createConnection({
  host: url.hostname, port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
});

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const toSql = (v) => {
  if (typeof v === 'string' && ISO.test(v)) return v.replace('T', ' ').replace('Z', '');
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
};

const [existing] = await conn.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
const localTables = new Set(existing.map((r) => r.t));

await conn.query('SET FOREIGN_KEY_CHECKS = 0');
let total = 0;
for (const [table, rows] of Object.entries(dump.tables)) {
  if (!localTables.has(table)) { console.log(`skip ${table} (not in local schema)`); continue; }
  await conn.query(`DELETE FROM \`${table}\``);
  for (const row of rows) {
    const cols = Object.keys(row);
    await conn.query(
      `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map((c) => toSql(row[c]))
    );
  }
  total += rows.length;
  console.log(`${table.padEnd(24)} ${rows.length}`);
}
await conn.query('SET FOREIGN_KEY_CHECKS = 1');
await conn.end();
console.log(`Restored ${total} rows from ${dump.host} (${dump.takenAt}) into local ${url.pathname.slice(1)}.`);
