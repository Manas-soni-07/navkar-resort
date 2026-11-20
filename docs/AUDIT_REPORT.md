# ResortOS — Phase 0 Audit Report & Stabilization Fixes

**Date:** 2026-11-20 · **Location audited:** `C:\ManagementApp\navkar-resort` (the spec names `E:/APP/NewOne`, which does not exist on this machine)
**Scope:** Read-only audit of the existing Phase 1/2 work, then fixes limited to startup, security and correctness problems found in it. No new modules (attendance, bookings, billing, …) were built. The TiDB Cloud database was **not** accessed or modified; all testing used a separate local MySQL container.

A full copy of the project as it was before any change was saved as `navkar-resort-backup-before-fixes.zip` (session scratchpad).

---

## 1. Status summary

| Area | Before | After |
| :--- | :--- | :--- |
| Dependencies install | Not installed; pnpm 12 not runnable via bundled corepack | Installs with `npx pnpm@12.18.0 install` |
| Android bundle | Failed (`@babel/runtime`, then `query-string` unresolved) | Builds (4.66 MB Hermes bundle); runs in Expo Go on Android emulator |
| `expo-doctor` | 2 failures (missing `react-native-svg`, SDK version drift) + Metro override | 17/17 checks pass |
| TypeScript (api, mobile, shared) | Passed | Pass |
| API lint | Passed | Passes (0 warnings) |
| API auth & hotel isolation | Read endpoints public; no hotel check on writes | Enforced server-side; 24/24 smoke tests pass |

---

## 2. Problems found and fixed

### Startup / build
1. **pnpm 12 ignored `.npmrc`** (`node-linker=hoisted` etc.), producing an isolated `node_modules` that Expo SDK 52's Metro cannot resolve. Settings moved to `pnpm-workspace.yaml` (`nodeLinker: hoisted`, …). `.npmrc` left in place (now inert).
2. **`@expo/metro-runtime ^58`** paired with Expo SDK 52 → `~4.0.1`.
3. **`react-native-svg` missing** — required by `lucide-react-native`; every icon would crash outside Expo Go. Added `15.8.0`.
4. `react-native 0.76.7 → 0.76.9`, `react-native-web ^0.21 → ~0.19.13` (SDK 52 expected versions).
5. **`query-string` missing** — `expo-router@4.0.22` imports it but relies on `@react-navigation/native` to provide it; the resolved 7.5.x no longer does. Added `query-string@7.1.3` (CommonJS line).
6. `metro.config.js` replaced Expo's monorepo defaults by hand; reverted to `getDefaultConfig` (SDK 52 auto-detects workspaces).

### Security (requirements §10)
7. **Hardcoded JWT secret fallback** in `lib/auth.ts` — anyone could forge admin tokens if `JWT_SECRET` was unset. Now required (≥32 chars, placeholder rejected); read lazily via `lib/env.ts`. `JWT_EXPIRES_IN` is now honoured and `expiresAt` comes from the token itself.
8. **Unauthenticated endpoints**: `GET /hotels/primary`, `/hotels/[id]/dashboard`, `/hotels/[id]/rooms` were public (including revenue). All now require login.
9. **No hotel isolation**: any logged-in user could change any room in any hotel. New `requireHotelAccess()` — Admin: hotels in own organization; everyone else: only the assigned hotel. Room access is derived from the room's own `hotelId`, never from client input.
10. **Room creation** allowed Managers; spec §6 says Admin configures rooms → Admin-only.
11. **Login** now verifies the selected portal against the real role (`ROLE_MISMATCH` 403), blocks Managers with no hotel, and checks the password before revealing account status.
12. Every request re-loads the user from the database, so deactivation / reassignment applies immediately rather than at token expiry.
13. 500 responses no longer leak internal/database messages in production (`handleRouteError`).
14. **Mobile**: admin/manager screens had no route guard (reachable by deep link). Added `RoleGuard`; demo credentials pre-fill only in `__DEV__` builds.

### Correctness
15. Dashboard showed invented numbers (`expectedArrivals = min(available, 3)`, revenue = sum of nightly rates). Now real: arrivals/departures from bookings, revenue = completed payments today, "today" computed in the hotel's timezone.
16. Invalid room filters (`?status=NOPE`) caused a 500; now validated → 400.
17. Mobile API client crashed with a cryptic error on non-JSON responses / network failure; now returns clear messages, has a 15 s timeout, and keeps the session on transient network errors.
18. Hardcoded `$` → hotel currency (₹); removed fake fallback counts (`?? 3`, `?? 12`) and copy that claimed things not true ("biometric", "Live TiDB Multi-Region Sync", "5-Star Luxury").
19. Sign-out raced with the route guard and landed on inconsistent screens; now deterministic.
20. Seed script reset demo passwords on every run and created a fictional US hotel. Rewritten for **The Villa** and **Navkar Palace Hotel & Resort** (INR, Asia/Kolkata, one Manager each), never overwrites passwords, refuses to run with `NODE_ENV=production`.
21. `/api/health` always reported "TiDB Cloud"; now reports the actual provider.

---

## 3. Test evidence

- `apps/api/scripts/smoke-test.mjs` (`pnpm test:api`) — **24 passed, 0 failed**: wrong password 401, three logins, portal mismatch 403, tampered token 401, unauthenticated access 401 ×3, each Manager lands on own hotel, Manager → other hotel dashboard/rooms/room-status **403**, Manager room creation 403, Admin reads both hotels, invalid filter 400. Non-destructive (one no-op status update).
- Android emulator (Pixel 9a, Expo Go SDK 52), verified by screenshot and API logs: welcome screen; signed-out deep link to `/admin` redirected to Sign In; Villa Manager sees only The Villa's 5 rooms with ₹ prices; app force-stopped and relaunched → session restored via `/auth/me`; Admin dashboard shows real counts (1/5 occupied, ₹0 collected, 2 staff); sign-out → Sign In; back → Welcome; no JS errors in logcat.
- `tsc --noEmit` clean in api, mobile, shared; `next lint` clean; `expo-doctor` 17/17.

---

## 4. Gaps against the requirements document (not built — later phases)

| Requirement | Current state | Phase |
| :--- | :--- | :--- |
| Room statuses: Available / Occupied / Maintenance | Schema has 7 (adds DIRTY, CLEANING, INSPECTION, BLOCKED); Manager screen cycles a housekeeping flow | **Decision needed** (1–2) |
| Attendance statuses incl. **Weekly Off** | Enum has PRESENT/ABSENT/HALF_DAY/LATE/ON_LEAVE, no WEEKLY_OFF | 2 / 5 |
| Hotel & Manager management APIs, Admin hotel switching | None; Admin dashboard shows first hotel only | 4 |
| Manager↔hotel link | Stored twice (`User.hotelId` and `ManagerAssignment`) — pick one source of truth | 2 / 4 |
| Event Booking (tent, lighting, sound amounts) | No model | 7 |
| Check-in "Coming From" / "Going To" | Not in `Stay` | 8 |
| Billing: food / water / other charges, PDF | `Invoice` has no itemised charges; no PDF | 9 |
| Expenses: description, "Added By", audit | `Expense` lacks description and creator | 10 |
| Salary-advance deduction linkage | `StaffAdvance` and `SalaryPayment` not linked | 6 |
| Daily Summary (Admin-only) | None | 11 |
| Default currency | Schema defaults to USD (seed sets INR) | 2 |

---

## 5. TiDB Cloud findings (read-only inspection, 2026-11-20)

Connected to database `resortos` and compared it with `schema.prisma` (`pnpm --filter api db:check:tidb`). Nothing was written.

- **TiDB is a superset of the schema.** It has 8 tables the code does not model (`banquet_events`, `spa_bookings`, `spa_treatments`, `dining_orders`, `concierge_bookings`, `excursion_packages`, `housekeeping_tickets`, `shift_handovers`) and ~60 extra columns (e.g. `bookings.guestName/eventName/roomNumber`, `staff.fullName/monthlySalary/shift`, `invoices.itemsJson`, `expenses.description/vendor`). Running `prisma db push` would **drop all of these and their data**. `db:push` and `db:seed` now refuse to run against TiDB.
- **The current app works against it unchanged:** every required column without a default is one the schema already knows, and the app only reads/writes modelled columns. Verified with read-only GET calls: Villa manager → THE VILLA (15 rooms), Navkar manager → NAVKAR PALACE & RESORT (70 rooms), cross-hotel access 403.
- **Live data:** 97 rooms, 21 bookings, 16 staff, 13 attendance, 11 expenses, 8 invoices, 7 advances, 5 salary payments, 4 users.
- **Ownership inconsistency (needs approval to fix):** `admin@resortos.com` belongs to organization "Taj & Oberoi Palace Resorts India", which owns only a sample hotel (TLH-01). THE VILLA and NAVKAR are in "ResortOS Hospitality", which has no admin, so the Admin sees the sample hotel. Also `manager@resortos.com` is in the Taj organization but assigned to THE VILLA, and its `manager_assignments` row points to the Taj hotel.
- **Room statuses:** live rows use AVAILABLE, OCCUPIED, MAINTENANCE, CLEANING (7), DIRTY (1), INSPECTION (1). Reducing to the spec's 3 statuses requires a data migration of those 9 rooms.
### Actions taken (client-approved, 2026-11-20)

1. **Full backup** before any write: `backups/resortos-2026-11-20T11-53-11-563Z.json` (28 tables, 217 rows; git-ignored, contains password hashes). Re-run with `pnpm --filter api db:backup`.
2. **Ownership fix** (`apps/api/scripts/fix-ownership-2026-11-20.mjs`, single transaction): `admin@resortos.com` and `manager@resortos.com` moved to "ResortOS Hospitality"; `manager_assignments` corrected/added to match `users.hotelId` (manager@ → THE VILLA, manager.villa → THE VILLA, manager.navkar → NAVKAR). Nothing deleted; the sample Taj organization/hotel is untouched. Admin now lands on NAVKAR PALACE & RESORT and can access THE VILLA.
3. **`schema.prisma` aligned with TiDB:** added the 8 legacy tables and all legacy columns, TiDB index names, `TEXT` types, `updatedAt` defaults, and `Booking.guestId` optional. `db:check:tidb` now reports **"Database matches the schema. Nothing to change."**
4. Local MySQL synced to the same schema; smoke test 24/24 on local, read-only checks pass on TiDB.
5. `pnpm --filter api user:set-password <email>` added (hidden prompt, audit-logged) for accounts whose password is unknown.

## 6. Open items / risks

- **TiDB Cloud schema not verified.** No credentials were available. Before pointing the app at TiDB, compare its schema with `prisma/schema.prisma` (`prisma db pull` into a scratch file) — do **not** run `db push --accept-data-loss` or the seed against production.
- `apps/api/scripts/migrate-direct.mjs` (raw SQL migration script) and `check-grants.mjs` (attempts `CREATE DATABASE`) were **not reviewed**; do not run them against production until they are.
- `prisma/migration_phase2.sql` is empty. Left in place (no deletions without approval).
- App icons and splash are 1×1 px placeholders — replace before release (Phase 14).
- The "Transition" button on MAINTENANCE / BLOCKED rooms does nothing (pre-existing).
- `next lint` is deprecated in Next.js 16; migrate to the ESLint CLI when upgrading.
- `C:\ManagementApp\mobile-nav` is an unrelated blank Expo SDK 58 starter — confirm whether it can be removed.
- The project is not under git. Recommend `git init` + an initial commit before Phase 1.
- Docs in `docs/` still reference `E:\APP\NewOne` and TiDB-only setup; see README "Run locally (verified)".
