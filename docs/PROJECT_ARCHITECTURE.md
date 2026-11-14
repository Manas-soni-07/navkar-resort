# ResortOS - System Architecture Document

## 1. Executive Summary
**ResortOS** is a specialized, enterprise-grade operating system designed for luxury resorts, boutique hotels, and hospitality chains. It unifies multi-branch resort administration, guest concierge flows, daily front-desk operations, room inventory management, and financial settlements into a cohesive, high-performance platform.

---

## 2. Monorepo Topology
ResortOS is organized as a high-performance **pnpm monorepo**:

```
NewOne/
├── apps/
│   ├── mobile/             # React Native mobile application (Expo SDK 52 + Expo Router)
│   └── api/                # Backend API service (Next.js 15 App Router + Prisma ORM)
├── packages/
│   ├── shared/             # Universal TypeScript models, DTOs, interfaces & validation
│   └── config/             # Shared constants, global configurations & linting presets
├── docs/                   # Architecture, setup, and phase roadmap documentation
├── .env.example            # Root environment variable documentation template
├── .gitignore              # Multi-tier git exclusion rules
├── .npmrc                  # Hoisted pnpm package manager configuration
├── package.json            # Root workspace scripts & packageManager definition
├── pnpm-workspace.yaml     # Monorepo member workspace declarations
├── tsconfig.json           # Base TypeScript compiler settings
└── README.md               # Quick-start instructions & verification commands
```

---

## 3. Technology Stack Breakdown

### 3.1 Mobile Client (`apps/mobile`)
- **Framework**: [Expo SDK 52](https://docs.expo.dev/) running [React Native 0.76](https://reactnative.dev/).
- **Routing & Navigation**: `expo-router` v4 (file-based navigation matching Next.js paradigms).
- **Language**: TypeScript 5.7+ in strict mode.
- **Secure Storage**: `expo-secure-store` for hardware-backed token security (Biometric / KeyStore / Keychain).
- **Design Foundation**: White-smoke luxury aesthetic (`#F8F9FA` background, `#FFFFFF` rounded cards, `#2B6CB0` resort azure primary, subtle slate text and borders).
- **Iconography**: `lucide-react-native` vectors.
- **Device Support**: Android physical devices via Expo Go, Android Emulator, iOS Simulator, and Web preview.

### 3.2 Backend REST Engine (`apps/api`)
- **Framework**: [Next.js 15](https://nextjs.org/) App Router (`apps/api/src/app/api/...`).
- **Architecture**: REST API architecture with type-safe handlers.
- **Validation**: [Zod](https://zod.dev/) schemas with centralized runtime environment verification (`src/lib/env.ts`).
- **Response Format**: Standardized `ApiResponse<T>` envelope guaranteeing consistent `success`, `data`, `error`, and `timestamp` fields.
- **Error Handling**: Custom `AppError`, `NotFoundError`, `UnauthorizedError`, and `ValidationError` hierarchies.

### 3.3 Database Tier & ORM (`apps/api/prisma`)
- **ORM**: [Prisma ORM 6](https://www.prisma.io/).
- **Target Database**: [TiDB Cloud Serverless](https://www.pingcap.com/tidb-cloud/) (Distributed MySQL-compatible wire protocol with horizontal auto-scaling and multi-region resilience).
- **Relation Mode**: `prisma` (software-layer foreign key emulation optimized for distributed cloud databases).
- **Security**: TLS encrypted connections (`sslaccept=strict`).

### 3.4 Shared Core (`packages/shared`)
- Universal types consumed by both mobile and backend:
  - `UserRole`: `'ADMIN' | 'MANAGER'`
  - `UserProfile`, `Hotel`, `RoomSummary`, `RoomStatus`
  - `ApiResponse<T>`, `PaginatedResponse<T>`, `HealthCheckResponse`
  - Pure validation functions (`isValidEmail`, `isValidRole`)
- Completely eliminates drift between frontend state and backend schemas.

---

## 4. Security & Environment Isolation

| Layer | Environment File | Accessibility | Allowed Contents |
| :--- | :--- | :--- | :--- |
| **Backend** | `apps/api/.env.local` | Server-only runtime | TiDB credentials, JWT secrets, database connection strings |
| **Mobile** | `apps/mobile/.env` | Bundled in client app | ONLY `EXPO_PUBLIC_*` public variables (e.g., API Base URL) |
| **Root** | `.env` | Local development convenience | Shared non-secret flags |

> **Critical Security Rule**: Private backend secrets, database passwords, and administrative master keys MUST NEVER be prefixed with `EXPO_PUBLIC_` or placed inside `apps/mobile`.

---

## 5. White-Smoke Design System Specifications

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `background` | `#F8F9FA` | Soft off-white / white-smoke background for reduced eye fatigue |
| `surface` | `#FFFFFF` | Crisp pure white surface for elevated cards and modals |
| `surfaceSubtle` | `#F1F3F5` | Muted background for secondary actions, tabs, and tags |
| `border` | `#E2E8F0` | Subtle hairline separation border |
| `textPrimary` | `#1E293B` | Deep slate charcoal (avoids harsh pure black `#000000`) |
| `textSecondary` | `#64748B` | Secondary explanatory and caption typography |
| `primary` | `#2B6CB0` | Resort azure blue for primary interactions and calls to action |
| `goldAccent` | `#C59B27` | Luxury resort accent for badges, status indicators, and VIP tiers |
| `success` | `#10B981` | Positive indicators (operational rooms, check-in cleared) |
| `error` | `#EF4444` | Alerts, validation errors, and maintenance notices |
