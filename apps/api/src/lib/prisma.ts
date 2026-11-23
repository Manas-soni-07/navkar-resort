import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * DATABASE_URL as pasted into a hosting dashboard can carry invisible leading/trailing
 * whitespace or line breaks, or surrounding quotes. mysql2 tolerates that (WHATWG URL
 * parsing trims it); Prisma does not, and fails with PrismaClientInitializationError.
 */
export function cleanDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: cleanDatabaseUrl(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
