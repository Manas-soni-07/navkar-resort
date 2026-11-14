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
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_health (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        service VARCHAR(191) NOT NULL,
        status VARCHAR(191) NOT NULL,
        timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Successfully created test table in sys database!');

    const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
    console.log('Tables now in sys:', tables);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
