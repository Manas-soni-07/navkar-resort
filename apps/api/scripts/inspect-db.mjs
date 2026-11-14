import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    const dbs = await prisma.$queryRawUnsafe('SHOW DATABASES;');
    console.log('Databases available on TiDB cluster:', dbs);
  } catch (error) {
    console.error('Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
