# ResortOS - Development Lifecycle & Roadmap

## Overview of Development Phases

The ResortOS platform is developed in disciplined, strictly sequenced architectural phases.

---

### [x] Phase 1: Complete Setup from Absolute Zero
**Status**: COMPLETED & VERIFIED
- [x] Environment inspection (Windows, Node 22, pnpm, Git, Java, Android SDK).
- [x] pnpm Monorepo initialization (`mobile`, `api`, `shared`, `config`).
- [x] Shared package (`@resortos/shared`) with shared models and types.
- [x] Next.js 15 App Router backend (`apps/api`) with Zod validation, error handling, and `GET /api/health`.
- [x] Prisma ORM configuration prepared for TiDB Cloud Serverless MySQL compatibility.
- [x] Expo SDK 52 + React Native 0.76 mobile client (`apps/mobile`) with Expo Router v4 navigation.
- [x] White-smoke luxury design system (Tokens, Theme, and 8 Reusable UI components).
- [x] Foundational UI screens: Welcome, Login, Admin Dashboard, Manager Dashboard.
- [x] Strict environment variable segregation with `.env.example` templates.

---

### [x] Phase 2: TiDB Cloud Database Integration & Enterprise Schema
**Status**: COMPLETED & VERIFIED
- [x] TiDB Cloud Serverless live database provisioning (`8.0.11-TiDB-v8.5.3-serverless`).
- [x] Full ResortOS database schema with 20 tables:
  `organizations`, `hotels`, `users`, `manager_assignments`, `staff`, `attendances`,
  `staff_advances`, `salary_payments`, `rooms`, `guests`, `bookings`, `booking_rooms`,
  `booking_extra_charges`, `stays`, `stay_guests`, `payments`, `invoices`, `expenses`,
  `audit_logs`, `system_health`.
- [x] High-precision `DECIMAL(12, 2)` monetary fields across all financial entities.
- [x] Proper relations, indexes, and unique constraints optimized for `relationMode = "prisma"`.
- [x] Generated Prisma Client v6.19.3.
- [x] Non-destructive DDL migration executed directly against TiDB Cloud cluster.
- [x] Backwards compatibility maintained.

---

### [x] Phase 3: Core Authentication & Dynamic Room Inventory Management
**Status**: COMPLETED & VERIFIED
- [x] Database seed engine: Provisioned Organization, Primary Hotel (`AZR-01`), Admin & Manager accounts, 12 luxury rooms across 3 floors, and staff personnel.
- [x] Password hashing with `bcryptjs` and session tokens with `jose` (HS256).
- [x] REST API endpoints:
  - `POST /api/auth/login`: Credential validation & JWT generation.
  - `GET /api/auth/me`: Authenticated profile retrieval.
  - `GET /api/hotels/primary`: Primary resort metadata.
  - `GET /api/hotels/:id/rooms`: Room inventory list with status filters.
  - `POST /api/hotels/:id/rooms`: Room registry (restricted to ADMIN/MANAGER).
  - `PATCH /api/rooms/:id/status`: Room status state machine (`DIRTY` -> `CLEANING` -> `INSPECTION` -> `AVAILABLE` -> `OCCUPIED`).
  - `GET /api/hotels/:id/dashboard`: Real-time aggregated KPIs (Occupancy %, daily revenue, staff count).
- [x] Mobile Client Integration:
  - `api.ts`: Centralized HTTP client with automatic `Authorization: Bearer <token>` injection.
  - `AuthContext`: React state and session manager with hardware-backed `expo-secure-store`.
  - `login.tsx`: Interactive login form with role switcher, pre-filled demo credentials, and automatic routing.
  - `admin.tsx`: Live executive dashboard rendering real KPIs, daily revenue, and active staff counts from TiDB.
  - `manager.tsx`: Interactive housekeeping dispatch console allowing managers to tap rooms to trigger lifecycle status transitions.
- [x] Full TypeScript and production build verification.

---

### [ ] Phase 4: Guest Concierge, Bookings & Front Desk Flow
*Status: READY FOR NEXT STEP*
- [ ] Fast guest check-in & registration flow.
- [ ] Room reservation calendar and direct booking engine.
- [ ] Extra charges / folio itemization (Spa, minibar, airport pickup, dining).
- [ ] Payment gateway recording (Cash, Card, UPI, Folio charge) and tax invoice generation.
- [ ] Key card dispatch logging.

---

### [ ] Phase 5: Staff Attendance, Advances & Payroll
*Status: FUTURE*
- [ ] Daily digital clock-in / clock-out logging.
- [ ] Staff salary advances request and approval workflow.
- [ ] Monthly payroll calculation and disbursement ledger.
- [ ] Departmental efficiency analytics.

---

### [ ] Phase 6: Production Hardening & EAS Build
*Status: FUTURE*
- [ ] EAS Build pipeline for standalone Android APK / AAB.
- [ ] Next.js API Docker containerization & deployment.
- [ ] Cloud monitoring, rate limiting & CDN caching.
