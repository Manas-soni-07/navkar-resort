import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const currentDb = await prisma.$queryRawUnsafe('SELECT DATABASE() as active_database;');
  const allDatabases = await prisma.$queryRawUnsafe('SHOW DATABASES;');
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');

  console.log('--- TIDB CLUSTER DETAILS ---');
  console.log('1. All databases on your cluster:', allDatabases.map(d => d.Database));
  console.log('2. Currently connected active database:', currentDb[0].active_database);
  console.log(`3. Total tables inside "${currentDb[0].active_database}":`, tables.length);
  console.log('4. Table names:');
  tables.forEach((t, i) => {
    console.log(`   ${i + 1}. ${Object.values(t)[0]}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
