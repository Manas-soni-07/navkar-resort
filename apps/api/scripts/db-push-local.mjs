/**
 * `prisma db push` for LOCAL development databases only.
 * TiDB Cloud holds live data and extra tables/columns this schema does not know about;
 * pushing to it would drop them. Use `pnpm db:check:tidb` (read-only) instead.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

if (/tidbcloud\.com/i.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to run `prisma db push` against TiDB Cloud (it would drop live tables/columns).');
  console.error('Use `pnpm --filter api db:check:tidb` to see differences without changing anything.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
const r = spawnSync(process.execPath, [cli, 'db', 'push', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
