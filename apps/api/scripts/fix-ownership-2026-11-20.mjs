/**
 * One-off data fix (approved by the client 2026-11-20). Backup taken first in /backups.
 * - admin@resortos.com and manager@resortos.com move to the "ResortOS Hospitality" organization
 *   (which owns THE VILLA and NAVKAR PALACE & RESORT).
 * - manager_assignments is made consistent with users.hotelId (the field the API uses).
 * Nothing is deleted. The sample Taj hotel and its organization are left untouched.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG = 'org-resortos';
const show = async (label) => {
  console.log(`\n== ${label}`);
  console.table(await prisma.user.findMany({
    select: { email: true, role: true, organizationId: true, hotelId: true }, orderBy: { email: 'asc' } }));
  console.table(await prisma.managerAssignment.findMany({ select: { userId: true, hotelId: true } }));
};

await show('Before');
await prisma.$transaction(async (tx) => {
  const org = await tx.organization.findUniqueOrThrow({ where: { id: ORG } });
  await tx.user.update({ where: { email: 'admin@resortos.com' }, data: { organizationId: org.id } });
  await tx.user.update({ where: { email: 'manager@resortos.com' }, data: { organizationId: org.id } });

  const managers = await tx.user.findMany({ where: { role: 'MANAGER', hotelId: { not: null } } });
  for (const m of managers) {
    // Point any existing assignment rows of this manager at the hotel the API actually uses...
    await tx.managerAssignment.updateMany({ where: { userId: m.id, NOT: { hotelId: m.hotelId } }, data: { hotelId: m.hotelId } });
    // ...and make sure one exists.
    await tx.managerAssignment.upsert({
      where: { userId_hotelId: { userId: m.id, hotelId: m.hotelId } },
      update: {},
      create: { userId: m.id, hotelId: m.hotelId, isPrimary: true },
    });
  }
});
await show('After');
await prisma.$disconnect();
