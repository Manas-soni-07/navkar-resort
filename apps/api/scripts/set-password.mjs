/**
 * Set (or reset) a user's password. The password is typed at a hidden prompt and never echoed or logged.
 *
 * Usage (from apps/api):  pnpm user:set-password manager.villa@resortos.com
 * Uses DATABASE_URL from .env.local (TiDB when the API is pointed at TiDB).
 */
import { createRequire } from 'node:module';
import readline from 'node:readline';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: pnpm user:set-password <email>');
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);
  console.log(`User: ${user.fullName} (${user.role}) on ${new URL(process.env.DATABASE_URL).hostname}`);

  const pw = await askHidden('New password (min 8 characters): ');
  if (pw.length < 8) throw new Error('Password must be at least 8 characters.');
  if ((await askHidden('Repeat password: ')) !== pw) throw new Error('Passwords do not match.');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(pw, 12) } });
  await prisma.auditLog.create({
    data: { userId: user.id, hotelId: user.hotelId, action: 'UPDATE', entityType: 'User', entityId: user.id,
      details: 'Password reset via scripts/set-password.mjs' },
  });
  console.log('Password updated.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
