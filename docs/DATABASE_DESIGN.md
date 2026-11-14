# ResortOS — Database Architecture & Design Specification

## 1. Executive Summary

ResortOS utilizes a modern, distributed relational data architecture designed specifically for **TiDB Cloud Serverless** (MySQL 8.0 wire-compatible protocol).

### Core Architectural Decisions:
- **Distributed SQL Engine**: Hosted on TiDB Cloud Serverless (AWS `ap-northeast-1`), providing automatic horizontal sharding, distributed transactions, and multi-AZ resilience.
- **ORM & Relation Mode**: **Prisma ORM 6** configured with `relationMode = "prisma"`. In distributed databases like TiDB and PlanetScale, enforcing foreign key constraints at the application layer eliminates distributed locks and round-trips across TiKV Raft regions, ensuring ultra-low latency and horizontal scale.
- **Primary Keys**: CUID (`cuid()`) strings are used for all distributed entity primary keys instead of sequential auto-increment integers. This prevents monotonic write hotspots across TiKV region leaders.
- **Monetary Precision**: All financial fields (room rates, salaries, advances, taxes, payments, invoices, expenses) use `DECIMAL(12, 2)` or `DECIMAL(10, 2)` to eliminate floating-point rounding errors.

---

## 2. Entity Model Architecture (20 Tables)

### 2.1 Multi-Tenant & Governance Domain
1. **`organizations` (`Organization`)**: Root multi-tenant entity representing the resort holding company or hospitality group.
   - Fields: `id`, `name`, `slug` (unique), `taxNumber`, `contactEmail`, `contactPhone`, `createdAt`, `updatedAt`.
   - Relations: Has many `hotels`, `users`.
2. **`hotels` (`Hotel`)**: Individual resort, boutique hotel, or branch property under an organization.
   - Fields: `id`, `organizationId`, `name`, `slug`, `code` (unique), `status` (Enum), `starRating`, address, `contactPhone`, `contactEmail`, `currency`, `timezone`, check-in/out times.
   - Indexes: `[organizationId]`, `[slug]`, `[status]`.
3. **`users` (`User`)**: Corporate staff, administrators, managers, and front-desk accounts.
   - Fields: `id`, `organizationId`, `hotelId` (optional default), `email` (unique), `passwordHash`, `fullName`, `phone`, `role` (Enum), `status` (Enum), `lastLoginAt`.
   - Indexes: `[organizationId]`, `[hotelId]`, `[role]`, `[status]`.
4. **`manager_assignments` (`ManagerAssignment`)**: Property governance linking managers to specific hotel branches.
   - Unique Constraint: `@@unique([userId, hotelId])`.

### 2.2 Human Resources & Payroll Domain
5. **`staff` (`Staff`)**: Hotel employees across all departments (Housekeeping, F&B, Front Desk, Security, Engineering).
   - Fields: `id`, `hotelId`, `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `department`, `designation`, `baseSalary` (Decimal), `hourlyRate` (Decimal), `joiningDate`, `isActive`.
   - Unique Constraint: `@@unique([hotelId, employeeCode])`.
   - Indexes: `[hotelId]`, `[department]`, `[isActive]`.
6. **`attendances` (`Attendance`)**: Daily clock-in / clock-out duty records.
   - Fields: `id`, `staffId`, `hotelId`, `date` (Date), `checkIn`, `checkOut`, `status` (Enum: PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE), `notes`.
   - Unique Constraint: `@@unique([staffId, date])`.
   - Indexes: `[hotelId]`, `[date]`, `[status]`.
7. **`staff_advances` (`StaffAdvance`)**: Salary advance requests, approvals, and repayment tracking.
   - Fields: `id`, `staffId`, `hotelId`, `amount` (Decimal), `repaidAmount` (Decimal), `status` (Enum), `requestDate`, `approvedDate`.
   - Indexes: `[hotelId]`, `[staffId]`, `[status]`.
8. **`salary_payments` (`SalaryPayment`)**: Monthly payroll disbursement ledger.
   - Fields: `id`, `staffId`, `hotelId`, `month`, `year`, `baseSalary` (Decimal), `allowances` (Decimal), `deductions` (Decimal), `netAmount` (Decimal), `status` (Enum), `paidAt`, `paymentMethod`.
   - Unique Constraint: `@@unique([staffId, month, year])`.
   - Indexes: `[hotelId]`, `[year, month]`, `[status]`.

### 2.3 Property Inventory & Guest Registry Domain
9. **`rooms` (`Room`)**: Individual physical rooms, villas, and suites.
   - Fields: `id`, `hotelId`, `roomNumber`, `floor`, `type` (Enum: STANDARD, DELUXE, EXECUTIVE_SUITE, PRESIDENTIAL_SUITE, VILLA, PENTHOUSE), `status` (Enum: AVAILABLE, OCCUPIED, DIRTY, CLEANING, INSPECTION, MAINTENANCE, BLOCKED), `basePricePerNight` (Decimal), `maxOccupancy`, `bedCount`, `hasBalcony`, `hasOceanView`.
   - Unique Constraint: `@@unique([hotelId, roomNumber])`.
   - Indexes: `[hotelId]`, `[type]`, `[status]`.
10. **`guests` (`Guest`)**: Universal guest customer profiles.
    - Fields: `id`, `organizationId`, `firstName`, `lastName`, `email`, `phone`, `idType`, `idNumber`, `nationality`, `vipStatus`, `specialRequests`.
    - Indexes: `[organizationId]`, `[email]`, `[phone]`, `[idNumber]`.

### 2.4 Reservations, Stays & Folios Domain
11. **`bookings` (`Booking`)**: Reservation requests and confirmed stays.
    - Fields: `id`, `hotelId`, `guestId`, `createdById`, `bookingReference` (unique), `status` (Enum), `checkInDate`, `checkOutDate`, `totalGuests`, `totalRooms`, `totalAmount` (Decimal), `taxAmount` (Decimal), `discountAmount` (Decimal).
    - Indexes: `[hotelId]`, `[guestId]`, `[createdById]`, `[status]`, `[checkInDate]`, `[checkOutDate]`.
12. **`booking_rooms` (`BookingRoom`)**: Room allocations within a multi-room booking.
    - Unique Constraint: `@@unique([bookingId, roomId])`.
13. **`booking_extra_charges` (`BookingExtraCharge`)**: Add-on charges (Spa, minibar, airport pickup, room service).
    - Fields: `id`, `bookingId`, `title`, `category`, `amount` (Decimal), `quantity`, `chargedAt`.
    - Indexes: `[bookingId]`.
14. **`stays` (`Stay`)**: Real-time stay lifecycle from check-in to check-out.
    - Fields: `id`, `hotelId`, `bookingId` (unique), `roomId`, `status` (Enum: ACTIVE, COMPLETED, EXTENDED, EARLY_CHECKOUT), `actualCheckIn`, `actualCheckOut`, `keyCardCount`.
    - Indexes: `[hotelId]`, `[roomId]`, `[status]`.
15. **`stay_guests` (`StayGuest`)**: All co-guests registered in the room for the stay.
    - Unique Constraint: `@@unique([stayId, guestId])`.

### 2.5 Financial Settlements & Auditing Domain
16. **`payments` (`Payment`)**: Financial transaction ledger.
    - Fields: `id`, `hotelId`, `bookingId`, `invoiceId`, `processedById`, `transactionReference` (unique), `amount` (Decimal), `currency`, `paymentMethod` (Enum), `status` (Enum), `gatewayResponse`, `paidAt`.
    - Indexes: `[hotelId]`, `[bookingId]`, `[invoiceId]`, `[status]`, `[paidAt]`.
17. **`invoices` (`Invoice`)**: Formal tax invoice & billing folios.
    - Fields: `id`, `hotelId`, `bookingId`, `invoiceNumber` (unique), `subtotal` (Decimal), `taxAmount` (Decimal), `discountAmount` (Decimal), `totalAmount` (Decimal), `paidAmount` (Decimal), `status` (Enum), `dueDate`, `issuedAt`.
    - Indexes: `[hotelId]`, `[bookingId]`, `[status]`.
18. **`expenses` (`Expense`)**: Property operational costs (Utilities, Supplies, F&B, Maintenance).
    - Fields: `id`, `hotelId`, `category` (Enum), `title`, `amount` (Decimal), `paymentMethod` (Enum), `reference`, `incurredAt`.
    - Indexes: `[hotelId]`, `[category]`, `[incurredAt]`.
19. **`audit_logs` (`AuditLog`)**: Immutable audit trail for regulatory compliance and security.
    - Fields: `id`, `hotelId`, `userId`, `action` (Enum), `entityType`, `entityId`, `ipAddress`, `userAgent`, `details` (JSON/Text), `createdAt`.
    - Indexes: `[hotelId]`, `[userId]`, `[action]`, `[entityType]`, `[createdAt]`.
20. **`system_health` (`SystemHealth`)**: System ping & connectivity verification record.

---

## 3. Enumerations Summary

- **`UserRole`**: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `RECEPTIONIST`, `STAFF`
- **`UserStatus`**: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **`HotelStatus`**: `ACTIVE`, `MAINTENANCE`, `INACTIVE`
- **`RoomType`**: `STANDARD`, `DELUXE`, `EXECUTIVE_SUITE`, `PRESIDENTIAL_SUITE`, `VILLA`, `PENTHOUSE`
- **`RoomStatus`**: `AVAILABLE`, `OCCUPIED`, `DIRTY`, `CLEANING`, `INSPECTION`, `MAINTENANCE`, `BLOCKED`
- **`BookingStatus`**: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `NO_SHOW`
- **`StayStatus`**: `ACTIVE`, `COMPLETED`, `EXTENDED`, `EARLY_CHECKOUT`
- **`PaymentStatus`**: `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`
- **`PaymentMethod`**: `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `UPI`, `ONLINE`, `FOLIO_CHARGE`
- **`InvoiceStatus`**: `DRAFT`, `ISSUED`, `PAID`, `VOID`, `PARTIALLY_PAID`
- **`AttendanceStatus`**: `PRESENT`, `ABSENT`, `HALF_DAY`, `LATE`, `ON_LEAVE`
- **`AdvanceStatus`**: `PENDING`, `APPROVED`, `REJECTED`, `DEDUCTED`
- **`SalaryStatus`**: `PENDING`, `PROCESSED`, `PAID`, `CANCELLED`
- **`ExpenseCategory`**: `UTILITIES`, `MAINTENANCE`, `SUPPLIES`, `FOOD_BEVERAGE`, `MARKETING`, `PAYROLL`, `TAXES`, `MISCELLANEOUS`
- **`AuditAction`**: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `STATUS_CHANGE`, `PAYMENT_PROCESSED`, `VOID`

---

## 4. Database Safety & Migration Procedures

1. **Zero Destructive Commands**: Commands such as `prisma migrate reset` and `prisma db push --force-reset` are strictly prohibited.
2. **Safe Migration Script**: Custom DDL migration runner (`apps/api/scripts/migrate-direct.mjs`) employs `CREATE TABLE IF NOT EXISTS` and non-destructive index declarations.
3. **Connection Pooling**: Managed via Next.js singleton instance (`apps/api/src/lib/prisma.ts`), preventing connection starvation on serverless functions.
