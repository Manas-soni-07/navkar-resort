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
    const grants = await prisma.$queryRawUnsafe('SHOW GRANTS;');
    console.log('User Grants:', grants);
  } catch (error) {
    console.error('Grants error:', error.message);
  }

  try {
    const testCreateDb = await prisma.$queryRawUnsafe('CREATE DATABASE IF NOT EXISTS resortos;');
    console.log('Create Database resortos result:', testCreateDb);
  } catch (error) {
    console.error('Create DB error:', error.message);
  }

  await prisma.$disconnect();
}

main();
