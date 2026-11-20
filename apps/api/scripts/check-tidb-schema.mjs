/**
 * READ-ONLY comparison of a live database against prisma/schema.prisma.
 *
 * Usage (from apps/api):  pnpm db:check:tidb
 * Reads DATABASE_URL from .env.tidb.local. Prints the SQL that WOULD be needed
 * to make the database match the schema. It never executes that SQL.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Resolves whether node_modules is hoisted to the repo root or local to apps/api.
const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');

const url = process.env.DATABASE_URL;
if (!url || url.includes('<')) {
  console.error('DATABASE_URL is not set in apps/api/.env.tidb.local');
  process.exit(1);
}

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = new URL(url).hostname;
console.log(`Comparing database at ${host} with prisma/schema.prisma (read-only)...\n`);

const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    'migrate',
    'diff',
    '--from-url',
    url,
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--script',
  ],
  { cwd: apiDir, encoding: 'utf8' }
);

if (result.status !== 0) {
  // Never echo the URL (it contains the password).
  console.error((result.stderr || result.stdout || 'prisma migrate diff failed').split(url).join('<DATABASE_URL>'));
  process.exit(result.status ?? 1);
}

const sql = result.stdout.trim();
if (!sql || /empty migration/i.test(sql)) {
  console.log('Database matches the schema. Nothing to change.');
} else {
  console.log('Differences found. SQL that would align the database (NOT executed):\n');
  console.log(sql);
  if (/DROP\s+(TABLE|COLUMN|INDEX)|ALTER\s+TABLE[^;]*\bMODIFY\b/i.test(sql)) {
    console.log('\n!! Contains DROP/MODIFY statements: review before applying anything.');
  }
}
