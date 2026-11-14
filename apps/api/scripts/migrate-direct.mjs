import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const ddlStatements = [
  // 1. system_health
  `CREATE TABLE IF NOT EXISTS system_health (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    service VARCHAR(191) NOT NULL,
    status VARCHAR(191) NOT NULL,
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. organizations
  `CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    slug VARCHAR(191) NOT NULL UNIQUE,
    taxNumber VARCHAR(191) NULL,
    contactEmail VARCHAR(191) NOT NULL,
    contactPhone VARCHAR(191) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. hotels
  `CREATE TABLE IF NOT EXISTS hotels (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    name VARCHAR(191) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    code VARCHAR(191) NOT NULL UNIQUE,
    status ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    starRating INT NULL DEFAULT 4,
    address VARCHAR(191) NOT NULL,
    city VARCHAR(191) NOT NULL,
    state VARCHAR(191) NULL,
    country VARCHAR(191) NOT NULL,
    postalCode VARCHAR(191) NULL,
    contactPhone VARCHAR(191) NOT NULL,
    contactEmail VARCHAR(191) NOT NULL,
    receptionPhone VARCHAR(191) NULL,
    currency VARCHAR(191) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(191) NOT NULL DEFAULT 'UTC',
    checkInTime VARCHAR(191) NOT NULL DEFAULT '14:00',
    checkOutTime VARCHAR(191) NOT NULL DEFAULT '11:00',
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_hotels_org (organizationId),
    INDEX idx_hotels_slug (slug),
    INDEX idx_hotels_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    hotelId VARCHAR(191) NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    passwordHash VARCHAR(191) NOT NULL,
    fullName VARCHAR(191) NOT NULL,
    phone VARCHAR(191) NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF') NOT NULL DEFAULT 'MANAGER',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    lastLoginAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_users_org (organizationId),
    INDEX idx_users_hotel (hotelId),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. manager_assignments
  `CREATE TABLE IF NOT EXISTS manager_assignments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    hotelId VARCHAR(191) NOT NULL,
    isPrimary BOOLEAN NOT NULL DEFAULT true,
    assignedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_manager_hotel (userId, hotelId),
    INDEX idx_manager_hotel (hotelId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. staff
  `CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    employeeCode VARCHAR(191) NOT NULL,
    firstName VARCHAR(191) NOT NULL,
    lastName VARCHAR(191) NOT NULL,
    email VARCHAR(191) NULL,
    phone VARCHAR(191) NOT NULL,
    department VARCHAR(191) NOT NULL,
    designation VARCHAR(191) NOT NULL,
    baseSalary DECIMAL(12, 2) NOT NULL,
    hourlyRate DECIMAL(10, 2) NULL,
    joiningDate DATETIME(3) NOT NULL,
    terminationDate DATETIME(3) NULL,
    isActive BOOLEAN NOT NULL DEFAULT true,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_staff_hotel_emp (hotelId, employeeCode),
    INDEX idx_staff_hotel (hotelId),
    INDEX idx_staff_dept (department),
    INDEX idx_staff_active (isActive)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. attendances
  `CREATE TABLE IF NOT EXISTS attendances (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    staffId VARCHAR(191) NOT NULL,
    hotelId VARCHAR(191) NOT NULL,
    date DATE NOT NULL,
    checkIn DATETIME(3) NULL,
    checkOut DATETIME(3) NULL,
    status ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE') NOT NULL DEFAULT 'PRESENT',
    notes TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_staff_date (staffId, date),
    INDEX idx_att_hotel (hotelId),
    INDEX idx_att_date (date),
    INDEX idx_att_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 8. staff_advances
  `CREATE TABLE IF NOT EXISTS staff_advances (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    staffId VARCHAR(191) NOT NULL,
    hotelId VARCHAR(191) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    repaidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DEDUCTED') NOT NULL DEFAULT 'PENDING',
    requestDate DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    approvedDate DATETIME(3) NULL,
    notes TEXT NULL,
    INDEX idx_adv_hotel (hotelId),
    INDEX idx_adv_staff (staffId),
    INDEX idx_adv_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. salary_payments
  `CREATE TABLE IF NOT EXISTS salary_payments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    staffId VARCHAR(191) NOT NULL,
    hotelId VARCHAR(191) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    baseSalary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    netAmount DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    paidAt DATETIME(3) NULL,
    paymentMethod ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'UPI', 'ONLINE', 'FOLIO_CHARGE') NULL,
    reference VARCHAR(191) NULL,
    UNIQUE KEY uq_salary_staff_period (staffId, month, year),
    INDEX idx_sal_hotel (hotelId),
    INDEX idx_sal_period (year, month),
    INDEX idx_sal_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. rooms
  `CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    roomNumber VARCHAR(191) NOT NULL,
    floor INT NOT NULL,
    type ENUM('STANDARD', 'DELUXE', 'EXECUTIVE_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE') NOT NULL DEFAULT 'STANDARD',
    status ENUM('AVAILABLE', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTION', 'MAINTENANCE', 'BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
    basePricePerNight DECIMAL(10, 2) NOT NULL,
    maxOccupancy INT NOT NULL DEFAULT 2,
    bedCount INT NOT NULL DEFAULT 1,
    hasBalcony BOOLEAN NOT NULL DEFAULT false,
    hasOceanView BOOLEAN NOT NULL DEFAULT false,
    description TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_rooms_hotel_num (hotelId, roomNumber),
    INDEX idx_rooms_hotel (hotelId),
    INDEX idx_rooms_type (type),
    INDEX idx_rooms_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 11. guests
  `CREATE TABLE IF NOT EXISTS guests (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    firstName VARCHAR(191) NOT NULL,
    lastName VARCHAR(191) NOT NULL,
    email VARCHAR(191) NULL,
    phone VARCHAR(191) NULL,
    idType VARCHAR(191) NULL,
    idNumber VARCHAR(191) NULL,
    nationality VARCHAR(191) NULL,
    address VARCHAR(191) NULL,
    city VARCHAR(191) NULL,
    country VARCHAR(191) NULL,
    vipStatus BOOLEAN NOT NULL DEFAULT false,
    specialRequests TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_guests_org (organizationId),
    INDEX idx_guests_email (email),
    INDEX idx_guests_phone (phone),
    INDEX idx_guests_idnum (idNumber)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 12. bookings
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    guestId VARCHAR(191) NOT NULL,
    createdById VARCHAR(191) NULL,
    bookingReference VARCHAR(191) NOT NULL UNIQUE,
    status ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    checkInDate DATETIME(3) NOT NULL,
    checkOutDate DATETIME(3) NOT NULL,
    totalGuests INT NOT NULL DEFAULT 1,
    totalRooms INT NOT NULL DEFAULT 1,
    totalAmount DECIMAL(12, 2) NOT NULL,
    taxAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discountAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_bookings_hotel (hotelId),
    INDEX idx_bookings_guest (guestId),
    INDEX idx_bookings_creator (createdById),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_checkin (checkInDate),
    INDEX idx_bookings_checkout (checkOutDate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 13. booking_rooms
  `CREATE TABLE IF NOT EXISTS booking_rooms (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    bookingId VARCHAR(191) NOT NULL,
    roomId VARCHAR(191) NOT NULL,
    nightlyRate DECIMAL(10, 2) NOT NULL,
    UNIQUE KEY uq_booking_room (bookingId, roomId),
    INDEX idx_bkroom_room (roomId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 14. booking_extra_charges
  `CREATE TABLE IF NOT EXISTS booking_extra_charges (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    bookingId VARCHAR(191) NOT NULL,
    title VARCHAR(191) NOT NULL,
    category VARCHAR(191) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    chargedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_extra_booking (bookingId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 15. stays
  `CREATE TABLE IF NOT EXISTS stays (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    bookingId VARCHAR(191) NOT NULL UNIQUE,
    roomId VARCHAR(191) NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'EXTENDED', 'EARLY_CHECKOUT') NOT NULL DEFAULT 'ACTIVE',
    actualCheckIn DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    actualCheckOut DATETIME(3) NULL,
    keyCardCount INT NOT NULL DEFAULT 1,
    remarks TEXT NULL,
    INDEX idx_stays_hotel (hotelId),
    INDEX idx_stays_room (roomId),
    INDEX idx_stays_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 16. stay_guests
  `CREATE TABLE IF NOT EXISTS stay_guests (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    stayId VARCHAR(191) NOT NULL,
    guestId VARCHAR(191) NOT NULL,
    isPrimaryGuest BOOLEAN NOT NULL DEFAULT false,
    UNIQUE KEY uq_stay_guest (stayId, guestId),
    INDEX idx_stay_guest_id (guestId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 17. payments
  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    bookingId VARCHAR(191) NULL,
    invoiceId VARCHAR(191) NULL,
    processedById VARCHAR(191) NULL,
    transactionReference VARCHAR(191) NOT NULL UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(191) NOT NULL DEFAULT 'USD',
    paymentMethod ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'UPI', 'ONLINE', 'FOLIO_CHARGE') NOT NULL DEFAULT 'CASH',
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    gatewayResponse TEXT NULL,
    paidAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_pay_hotel (hotelId),
    INDEX idx_pay_booking (bookingId),
    INDEX idx_pay_invoice (invoiceId),
    INDEX idx_pay_user (processedById),
    INDEX idx_pay_status (status),
    INDEX idx_pay_date (paidAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 18. invoices
  `CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    bookingId VARCHAR(191) NOT NULL,
    invoiceNumber VARCHAR(191) NOT NULL UNIQUE,
    subtotal DECIMAL(12, 2) NOT NULL,
    taxAmount DECIMAL(10, 2) NOT NULL,
    discountAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    totalAmount DECIMAL(12, 2) NOT NULL,
    paidAmount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'ISSUED', 'PAID', 'VOID', 'PARTIALLY_PAID') NOT NULL DEFAULT 'DRAFT',
    dueDate DATETIME(3) NULL,
    issuedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_inv_hotel (hotelId),
    INDEX idx_inv_booking (bookingId),
    INDEX idx_inv_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 19. expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NOT NULL,
    category ENUM('UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'FOOD_BEVERAGE', 'MARKETING', 'PAYROLL', 'TAXES', 'MISCELLANEOUS') NOT NULL DEFAULT 'SUPPLIES',
    title VARCHAR(191) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    paymentMethod ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'UPI', 'ONLINE', 'FOLIO_CHARGE') NOT NULL DEFAULT 'CASH',
    reference VARCHAR(191) NULL,
    receiptUrl VARCHAR(191) NULL,
    incurredAt DATETIME(3) NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_exp_hotel (hotelId),
    INDEX idx_exp_category (category),
    INDEX idx_exp_date (incurredAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 20. audit_logs
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    hotelId VARCHAR(191) NULL,
    userId VARCHAR(191) NULL,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'PAYMENT_PROCESSED', 'VOID') NOT NULL,
    entityType VARCHAR(191) NOT NULL,
    entityId VARCHAR(191) NOT NULL,
    ipAddress VARCHAR(191) NULL,
    userAgent VARCHAR(191) NULL,
    details TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_audit_hotel (hotelId),
    INDEX idx_audit_user (userId),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entityType),
    INDEX idx_audit_created (createdAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

async function main() {
  console.log('Connecting to TiDB Cloud and applying ResortOS Phase 2 schema...');
  const currentDb = await prisma.$queryRawUnsafe('SELECT DATABASE() as db;');
  console.log('Current Active Database:', currentDb);

  let successCount = 0;
  for (const [index, sql] of ddlStatements.entries()) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const tableNameMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const tableName = tableNameMatch ? tableNameMatch[1] : `Statement #${index + 1}`;
      console.log(`[${index + 1}/${ddlStatements.length}] Table created/verified: ${tableName}`);
      successCount++;
    } catch (err) {
      console.error(`Failed on statement #${index + 1}:`, err.message);
      throw err;
    }
  }

  console.log(`\nAll ${successCount} ResortOS tables successfully created and verified!`);
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
  console.log('\nVerified tables in database:', tables.map(t => Object.values(t)[0]));
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
