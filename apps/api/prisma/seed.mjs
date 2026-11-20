/**
 * ResortOS development seed.
 *
 * - Idempotent: only upserts; never deletes or resets data.
 * - Never overwrites an existing user's password on re-run.
 * - Refuses to run when NODE_ENV=production (demo accounts must not reach production).
 *
 * Run from apps/api:  pnpm db:seed   (reads DATABASE_URL from apps/api/.env.local)
 * Optional overrides: SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data with NODE_ENV=production.');
  process.exit(1);
}
if (/tidbcloud\.com/i.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to seed demo data into TiDB Cloud (live data). Point DATABASE_URL at a local database.');
  process.exit(1);
}

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD || 'manager12345';

// Placeholder addresses/contacts — replace with the real hotel details.
const HOTELS = [
  {
    code: 'VILLA-01',
    name: 'The Villa',
    slug: 'the-villa',
    managerEmail: 'manager.villa@resortos.com',
    managerName: 'The Villa Manager',
    rooms: [
      { num: '101', floor: 1, type: 'DELUXE', status: 'AVAILABLE', price: 3500, occ: 2 },
      { num: '102', floor: 1, type: 'DELUXE', status: 'OCCUPIED', price: 3500, occ: 2 },
      { num: '103', floor: 1, type: 'STANDARD', status: 'AVAILABLE', price: 2500, occ: 2 },
      { num: '201', floor: 2, type: 'EXECUTIVE_SUITE', status: 'MAINTENANCE', price: 6000, occ: 4 },
      { num: 'V1', floor: 0, type: 'VILLA', status: 'AVAILABLE', price: 9000, occ: 6 },
    ],
    staff: [
      { code: 'VIL-001', fn: 'Ramesh', ln: 'Kumar', dept: 'Housekeeping', desig: 'Housekeeper', sal: 12000 },
      { code: 'VIL-002', fn: 'Sunita', ln: 'Devi', dept: 'Front Desk', desig: 'Receptionist', sal: 15000 },
    ],
  },
  {
    code: 'NAVKAR-01',
    name: 'Navkar Palace Hotel & Resort',
    slug: 'navkar-palace',
    managerEmail: 'manager.navkar@resortos.com',
    managerName: 'Navkar Palace Manager',
    rooms: [
      { num: '101', floor: 1, type: 'STANDARD', status: 'AVAILABLE', price: 2200, occ: 2 },
      { num: '102', floor: 1, type: 'STANDARD', status: 'OCCUPIED', price: 2200, occ: 2 },
      { num: '103', floor: 1, type: 'DELUXE', status: 'OCCUPIED', price: 3200, occ: 3 },
      { num: '201', floor: 2, type: 'DELUXE', status: 'AVAILABLE', price: 3200, occ: 3 },
      { num: '202', floor: 2, type: 'EXECUTIVE_SUITE', status: 'AVAILABLE', price: 5500, occ: 4 },
      { num: '203', floor: 2, type: 'STANDARD', status: 'MAINTENANCE', price: 2200, occ: 2 },
    ],
    staff: [
      { code: 'NAV-001', fn: 'Mahesh', ln: 'Patel', dept: 'Kitchen', desig: 'Cook', sal: 14000 },
      { code: 'NAV-002', fn: 'Anita', ln: 'Sharma', dept: 'Housekeeping', desig: 'Housekeeper', sal: 12000 },
      { code: 'NAV-003', fn: 'Vikram', ln: 'Singh', dept: 'Security', desig: 'Guard', sal: 11000 },
    ],
  },
];

/** Create the user if missing; on re-run update profile fields but never the password. */
async function ensureUser({ email, password, ...profile }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({ where: { email }, data: profile });
  }
  return prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), ...profile },
  });
}

async function main() {
  console.log('--- RESORTOS DEV SEED ---');

  const org = await prisma.organization.upsert({
    where: { slug: 'resortos-owner' },
    update: {},
    create: {
      name: 'ResortOS Owner Group',
      slug: 'resortos-owner',
      contactEmail: 'owner@resortos.com',
    },
  });
  console.log('Organization:', org.name);

  const admin = await ensureUser({
    email: 'admin@resortos.com',
    password: ADMIN_PASSWORD,
    organizationId: org.id,
    hotelId: null, // Admin is not tied to one hotel
    fullName: 'Owner / Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  console.log('Admin:', admin.email);

  for (const h of HOTELS) {
    const hotel = await prisma.hotel.upsert({
      where: { code: h.code },
      update: {},
      create: {
        organizationId: org.id,
        name: h.name,
        slug: h.slug,
        code: h.code,
        status: 'ACTIVE',
        starRating: null,
        address: 'Address to be updated',
        city: 'City to be updated',
        country: 'India',
        contactPhone: '+91 00000 00000',
        contactEmail: `${h.slug}@resortos.com`,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        checkInTime: '12:00',
        checkOutTime: '11:00',
      },
    });

    const manager = await ensureUser({
      email: h.managerEmail,
      password: MANAGER_PASSWORD,
      organizationId: org.id,
      hotelId: hotel.id,
      fullName: h.managerName,
      role: 'MANAGER',
      status: 'ACTIVE',
    });

    await prisma.managerAssignment.upsert({
      where: { userId_hotelId: { userId: manager.id, hotelId: hotel.id } },
      update: {},
      create: { userId: manager.id, hotelId: hotel.id, isPrimary: true },
    });

    for (const r of h.rooms) {
      await prisma.room.upsert({
        where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: r.num } },
        update: {},
        create: {
          hotelId: hotel.id,
          roomNumber: r.num,
          floor: r.floor,
          type: r.type,
          status: r.status,
          basePricePerNight: r.price,
          maxOccupancy: r.occ,
          bedCount: r.occ > 2 ? 2 : 1,
        },
      });
    }

    for (const s of h.staff) {
      await prisma.staff.upsert({
        where: { hotelId_employeeCode: { hotelId: hotel.id, employeeCode: s.code } },
        update: {},
        create: {
          hotelId: hotel.id,
          employeeCode: s.code,
          firstName: s.fn,
          lastName: s.ln,
          phone: '+91 00000 00000',
          department: s.dept,
          designation: s.desig,
          baseSalary: s.sal,
          joiningDate: new Date('2025-01-01'),
          isActive: true,
        },
      });
    }

    console.log(
      `Hotel: ${hotel.name} (${hotel.code}) — manager ${manager.email}, ` +
        `${h.rooms.length} rooms, ${h.staff.length} staff`
    );
  }

  console.log('--- SEED COMPLETE ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
