/**
 * mysql2 connection pool for the mobile ("/api/m") endpoints ported from the
 * mobile-nav Express server. Reads the same DATABASE_URL as Prisma.
 * TLS is required for TiDB Cloud; plain connections are allowed for a local MySQL.
 */
import mysql from 'mysql2/promise';

type Pool = mysql.Pool;

const globalForPool = globalThis as unknown as { mobilePool?: Pool };

function createPool(): Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set');
  const u = new URL(raw);
  const isTiDB = /tidbcloud\.com$/i.test(u.hostname);

  return mysql.createPool({
    host: u.hostname,
    port: Number(u.port) || (isTiDB ? 4000 : 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'resortos',
    ssl: isTiDB ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 15000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

export function getPool(): Pool {
  if (!globalForPool.mobilePool) globalForPool.mobilePool = createPool();
  return globalForPool.mobilePool;
}

/** Same shape as the original `require('../db')` export: `pool.query(sql, params)`. */
const pool = {
  query: (sql: string, values?: unknown[]) => getPool().query(sql, values as never),
};

export default pool;
