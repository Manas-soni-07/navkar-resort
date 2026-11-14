import { successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import type { HealthCheckResponse } from '@resortos/shared';

const START_TIME = Date.now();

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let latencyMs: number | undefined;

  try {
    const dbStart = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1;');
    latencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health probe error:', error);
    dbStatus = 'error';
  }

  const healthData: HealthCheckResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'ResortOS API Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      provider: 'TiDB Cloud Serverless (MySQL)',
      latencyMs,
    },
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  };

  return successResponse(
    healthData,
    dbStatus === 'connected'
      ? 'ResortOS API service and TiDB Cloud database are operational'
      : 'ResortOS API service is running with database degraded'
  );
}
