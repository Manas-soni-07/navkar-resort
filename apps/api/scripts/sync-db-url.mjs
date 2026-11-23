/**
 * After a TiDB password change: copy DATABASE_URL from .env.tidb.local into
 * .env.local (local API + scripts) and .env.vercel.local (values to paste into Vercel),
 * then test the connection with a read-only query. Never prints the password.
 *
 * Usage (from apps/api):  node scripts/sync-db-url.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

const readUrl = (file) => {
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  return line ? line.slice('DATABASE_URL='.length).trim().replace(/^"(.*)"$/, '$1') : null;
};

const url = readUrl('.env.tidb.local');
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('DATABASE_URL in .env.tidb.local is missing or not a valid URL.');
  process.exit(1);
}
if (/[<>]/.test(url) || !parsed.password) {
  console.error('The password in .env.tidb.local is missing or still a <PLACEHOLDER>.');
  process.exit(1);
}

// 1. Test first, so a typo never overwrites working settings.
try {
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });
  const [rows] = await conn.query('SELECT COUNT(*) AS users FROM users');
  await conn.end();
  console.log(`Connection OK (${rows[0].users} users). Updating files...`);
} catch (e) {
  console.error(`Connection FAILED (${e.code || e.message}). Files were not changed. Check the password in .env.tidb.local.`);
  process.exit(1);
}

// 2. Write it into the other files.
const setLine = (file, value) => {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith('DATABASE_URL='));
  if (i >= 0) lines[i] = `DATABASE_URL=${value}`;
  else lines.unshift(`DATABASE_URL=${value}`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`  updated ${file}`);
};
setLine('.env.local', `"${url}"`);
setLine('.env.vercel.local', url); // no quotes: this is pasted into Vercel as-is

console.log('\nNext: Vercel -> Settings -> Environment Variables -> DATABASE_URL -> Edit,');
console.log('paste the DATABASE_URL value from .env.vercel.local (starts with mysql://, no quotes), Save, then Redeploy.');
