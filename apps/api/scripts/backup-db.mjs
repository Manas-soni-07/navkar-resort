/**
 * READ-ONLY logical backup: dumps every table of the configured database to one JSON file.
 * Usage (from apps/api): node --env-file=.env.local scripts/backup-db.mjs
 * Output: <repo>/backups/<db>-<timestamp>.json  (git-ignored)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const url = new URL(process.env.DATABASE_URL);
const db = url.pathname.slice(1);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outDir = path.join(repoRoot, 'backups');
fs.mkdirSync(outDir, { recursive: true });

const tables = await prisma.$queryRawUnsafe(
  'SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', db);
const dump = { host: url.hostname, database: db, takenAt: new Date().toISOString(), tables: {} };
for (const { t } of tables) {
  dump.tables[t] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${t}\``);
}
await prisma.$disconnect();

const file = path.join(outDir, `${db}-${dump.takenAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(dump, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
const total = Object.values(dump.tables).reduce((n, rows) => n + rows.length, 0);
console.log(`Backed up ${Object.keys(dump.tables).length} tables, ${total} rows -> ${file}`);
