import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESORTOS SEED ENGINE STARTING ---');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'azure-horizon' },
    update: {},
    create: {
      name: 'Azure Horizon Luxury Resorts',
      slug: 'azure-horizon',
      taxNumber: 'TAX-AH-99201',
      contactEmail: 'corporate@azurehorizon.com',
      contactPhone: '+1 (800) 555-0199',
    },
  });
  console.log('✓ Organization provisioned:', org.name, `(${org.id})`);

  // 2. Primary Hotel
  const hotel = await prisma.hotel.upsert({
    where: { code: 'AZR-01' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Grand Azure Horizon Resort',
      slug: 'grand-azure-horizon',
      code: 'AZR-01',
      status: 'ACTIVE',
      starRating: 5,
      address: '77 Coastal Ocean Boulevard',
      city: 'Malibu',
      state: 'California',
      country: 'United States',
      postalCode: '90265',
      contactPhone: '+1 (310) 555-0144',
      contactEmail: 'grandazure@resortos.com',
      receptionPhone: '+1 (310) 555-0145',
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      checkInTime: '15:00',
      checkOutTime: '11:00',
    },
  });
  console.log('✓ Hotel provisioned:', hotel.name, `(${hotel.code})`);

  // 3. Admin User
  const adminPasswordHash = await bcrypt.hash('admin12345', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@resortos.com' },
    update: { passwordHash: adminPasswordHash },
    create: {
      organizationId: org.id,
      hotelId: hotel.id,
      email: 'admin@resortos.com',
      passwordHash: adminPasswordHash,
      fullName: 'Alexander Wright',
      phone: '+1 (310) 555-9001',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Admin user provisioned:', adminUser.email);

  // 4. Manager User
  const managerPasswordHash = await bcrypt.hash('manager12345', 10);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@resortos.com' },
    update: { passwordHash: managerPasswordHash },
    create: {
      organizationId: org.id,
      hotelId: hotel.id,
      email: 'manager@resortos.com',
      passwordHash: managerPasswordHash,
      fullName: 'Elena Rostova',
      phone: '+1 (310) 555-9002',
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Manager user provisioned:', managerUser.email);

  // 5. Manager Assignment
  await prisma.managerAssignment.upsert({
    where: {
      userId_hotelId: {
        userId: managerUser.id,
        hotelId: hotel.id,
      },
    },
    update: {},
    create: {
      userId: managerUser.id,
      hotelId: hotel.id,
      isPrimary: true,
    },
  });
  console.log('✓ Manager assignment linked to:', hotel.code);

  // 6. Rooms Seed
  const sampleRooms = [
    { num: '101', floor: 1, type: 'DELUXE', status: 'AVAILABLE', price: 280, occ: 2, balc: true, ocean: false, desc: 'Garden Deluxe with Private Patio' },
    { num: '102', floor: 1, type: 'DELUXE', status: 'OCCUPIED', price: 280, occ: 2, balc: true, ocean: false, desc: 'Garden Deluxe with Courtyard Access' },
    { num: '103', floor: 1, type: 'STANDARD', status: 'DIRTY', price: 220, occ: 2, balc: false, ocean: false, desc: 'Standard King Room' },
    { num: '104', floor: 1, type: 'STANDARD', status: 'CLEANING', price: 220, occ: 2, balc: false, ocean: false, desc: 'Standard King Room' },
    { num: '201', floor: 2, type: 'EXECUTIVE_SUITE', status: 'AVAILABLE', price: 540, occ: 4, balc: true, ocean: true, desc: 'Panoramic Ocean Suite' },
    { num: '202', floor: 2, type: 'EXECUTIVE_SUITE', status: 'OCCUPIED', price: 540, occ: 4, balc: true, ocean: true, desc: 'Panoramic Ocean Suite with Terrace' },
    { num: '203', floor: 2, type: 'DELUXE', status: 'INSPECTION', price: 320, occ: 2, balc: true, ocean: true, desc: 'Oceanfront Deluxe Balcony' },
    { num: '204', floor: 2, type: 'DELUXE', status: 'AVAILABLE', price: 320, occ: 2, balc: true, ocean: true, desc: 'Oceanfront Deluxe Balcony' },
    { num: '301', floor: 3, type: 'PRESIDENTIAL_SUITE', status: 'AVAILABLE', price: 1250, occ: 6, balc: true, ocean: true, desc: 'Presidential Penthouse with Butler Bar' },
    { num: 'V01', floor: 1, type: 'VILLA', status: 'OCCUPIED', price: 1800, occ: 8, balc: true, ocean: true, desc: 'Beachfront Private Pool Villa' },
    { num: 'V02', floor: 1, type: 'VILLA', status: 'AVAILABLE', price: 1800, occ: 8, balc: true, ocean: true, desc: 'Beachfront Private Pool Villa' },
    { num: '302', floor: 3, type: 'EXECUTIVE_SUITE', status: 'DIRTY', price: 580, occ: 4, balc: true, ocean: true, desc: 'Sunset Terrace Suite' },
  ];

  for (const r of sampleRooms) {
    await prisma.room.upsert({
      where: {
        hotelId_roomNumber: {
          hotelId: hotel.id,
          roomNumber: r.num,
        },
      },
      update: {
        status: r.status,
        basePricePerNight: r.price,
      },
      create: {
        hotelId: hotel.id,
        roomNumber: r.num,
        floor: r.floor,
        type: r.type,
        status: r.status,
        basePricePerNight: r.price,
        maxOccupancy: r.occ,
        bedCount: r.occ > 2 ? 2 : 1,
        hasBalcony: r.balc,
        hasOceanView: r.ocean,
        description: r.desc,
      },
    });
  }
  console.log(`✓ Seeded ${sampleRooms.length} luxury rooms across 3 floors & beachfront`);

  // 7. Staff Seed
  const staffMembers = [
    { code: 'EMP-001', fn: 'Maria', ln: 'Santos', dept: 'Housekeeping', desig: 'Head Housekeeper', sal: 3800 },
    { code: 'EMP-002', fn: 'Liam', ln: 'Chen', dept: 'Front Desk', desig: 'Concierge Lead', sal: 4200 },
    { code: 'EMP-003', fn: 'David', ln: 'Miller', dept: 'Engineering', desig: 'Chief Engineer', sal: 4600 },
  ];

  for (const s of staffMembers) {
    await prisma.staff.upsert({
      where: {
        hotelId_employeeCode: {
          hotelId: hotel.id,
          employeeCode: s.code,
        },
      },
      update: {},
      create: {
        hotelId: hotel.id,
        employeeCode: s.code,
        firstName: s.fn,
        lastName: s.ln,
        email: `${s.fn.toLowerCase()}.${s.ln.toLowerCase()}@resortos.com`,
        phone: '+1 (310) 555-800' + s.code.slice(-1),
        department: s.dept,
        designation: s.desig,
        baseSalary: s.sal,
        joiningDate: new Date('2024-01-15'),
        isActive: true,
      },
    });
  }
  console.log(`✓ Seeded ${staffMembers.length} active hotel staff members`);

  console.log('\n--- SEED ENGINE COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
