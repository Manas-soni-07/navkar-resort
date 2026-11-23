import { successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import type { HealthCheckResponse } from '@resortos/shared';

const START_TIME = Date.now();

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let latencyMs: number | undefined;
  let errorCode: string | undefined;

  try {
    const dbStart = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1;');
    latencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health probe error:', error);
    dbStatus = 'error';
    // Safe to expose: error class + Prisma error code only (e.g. P1000 = bad credentials,
    // P1001 = unreachable, P1013 = malformed URL). Never the message, which can echo the URL.
    const e = error as { name?: string; errorCode?: string; code?: string; message?: string };
    const engineMissing = /could not locate the Query Engine|Query Engine library/i.test(e.message ?? '');
    errorCode = [e.name, e.errorCode ?? e.code, engineMissing ? 'ENGINE_NOT_FOUND' : undefined]
      .filter(Boolean)
      .join(':');
  }

  const provider = (process.env.DATABASE_URL ?? '').includes('tidbcloud.com')
    ? 'TiDB Cloud Serverless (MySQL)'
    : 'MySQL';

  const healthData: HealthCheckResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'ResortOS API Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      provider,
      latencyMs,
      ...(errorCode ? { errorCode } : {}),
    },
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  };

  return successResponse(
    healthData,
    dbStatus === 'connected'
      ? `ResortOS API service and ${provider} database are operational`
      : 'ResortOS API service is running with database degraded'
  );
}
