# ResortOS — REST API Architecture & Endpoint Specification

## 1. Overview

The ResortOS backend is built on the **Next.js 15 App Router** (`apps/api/src/app/api/...`), utilizing TypeScript, Prisma ORM, and Zod runtime schema validation.

---

## 2. Standardized Communication Envelope

Every API response follows the strictly typed `ApiResponse<T>` contract defined in `@resortos/shared`:

### 2.1 Success Response (`status: 200/201`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-11-14T11:42:43.847Z"
}
```

### 2.2 Error Response (`status: 400/401/403/404/422/500`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [
      { "field": "email", "message": "Valid corporate email required" }
    ]
  },
  "timestamp": "2026-11-14T11:42:43.847Z"
}
```

---

## 3. Implemented Endpoints (Phase 2 Status)

### 3.1 System Health & Database Probe
- **Route**: `GET /api/health`
- **Access**: Public / Monitoring
- **Live Output**:
```json
{
  "success": true,
  "message": "ResortOS API service and TiDB Cloud database are operational",
  "data": {
    "status": "ok",
    "service": "ResortOS API Backend",
    "version": "1.0.0",
    "environment": "production",
    "database": {
      "status": "connected",
      "provider": "TiDB Cloud Serverless (MySQL)",
      "latencyMs": 4603
    },
    "uptimeSeconds": 4,
    "timestamp": "2026-11-14T11:42:43.847Z"
  },
  "timestamp": "2026-11-14T11:42:43.848Z"
}
```

---

## 4. Planned Endpoint Hierarchy (Roadmap for Phase 3+)

### 4.1 Authentication & Profile (`/api/auth`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Email/password sign-in with JWT issuance | Public |
| `POST` | `/api/auth/refresh` | Rotate access token via refresh token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & permissions | Authenticated |
| `POST` | `/api/auth/logout` | Revoke active refresh token | Authenticated |

### 4.2 Property & Hotel Management (`/api/hotels`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels` | List hotels under tenant organization | `ADMIN` / `MANAGER` |
| `GET` | `/api/hotels/:id` | Detailed property configuration & settings | `ADMIN` / `MANAGER` |
| `PATCH` | `/api/hotels/:id` | Update hotel profile, check-in rules, currency | `ADMIN` |

### 4.3 Room Inventory & Live Status (`/api/rooms`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels/:hotelId/rooms` | List rooms with real-time status filter | `ADMIN` / `MANAGER` |
| `POST` | `/api/hotels/:hotelId/rooms` | Register new room / villa inventory | `ADMIN` |
| `PATCH` | `/api/rooms/:id/status` | Transition room status (`AVAILABLE` -> `DIRTY` -> `CLEANING`) | `MANAGER` / `STAFF` |

### 4.4 Staff & Payroll Operations (`/api/staff`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels/:hotelId/staff` | Roster of active employees by department | `ADMIN` / `MANAGER` |
| `POST` | `/api/hotels/:hotelId/staff/attendance` | Record daily check-in / check-out | `MANAGER` |
| `GET` | `/api/hotels/:hotelId/staff/advances` | Staff advance ledger & approvals | `ADMIN` / `MANAGER` |
| `POST` | `/api/hotels/:hotelId/payroll/disburse` | Process monthly salary batch | `ADMIN` |

### 4.5 Reservations, Stays & Concierge (`/api/bookings`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Create new reservation | `MANAGER` / `RECEPTIONIST` |
| `POST` | `/api/bookings/:id/check-in` | Execute guest check-in & initialize `Stay` | `MANAGER` / `RECEPTIONIST` |
| `POST` | `/api/stays/:id/check-out` | Settle charges, inspect room & check out | `MANAGER` / `RECEPTIONIST` |
| `POST` | `/api/stays/:id/charges` | Post incidental / extra charge to stay | `STAFF` / `MANAGER` |

### 4.6 Payments & Folio Invoices (`/api/payments`)
| Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/invoices/:id` | Fetch complete guest tax folio | Authenticated |
| `POST` | `/api/payments/process` | Record cash/card/UPI payment settlement | `MANAGER` / `RECEPTIONIST` |
