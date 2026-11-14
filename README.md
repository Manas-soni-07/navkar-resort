# ResortOS

> Enterprise-grade operating system for luxury resorts, boutique hotels, and multi-branch hospitality operations.

---

## 1. System Requirements

Before starting development, ensure the following are installed on your machine:

- **Operating System**: Windows 10 / 11, macOS, or Linux
- **Node.js**: v22 LTS (v22.x or v24.x)
- **Package Manager**: `pnpm` (v9+ or v12+)
- **Version Control**: `git` (v2.40+)
- **Java Runtime**: OpenJDK 17 LTS (Optional for local Android SDK, not needed for Expo Go)
- **Mobile Device**: Physical Android device with the **Expo Go** app installed from Google Play Store

---

## 2. Monorepo Structure

```
NewOne/
├── apps/
│   ├── mobile/            # React Native Expo app (Expo Router, TypeScript)
│   └── api/               # Next.js 15 App Router backend (REST API, Prisma)
├── packages/
│   ├── shared/            # Universal models, DTOs & TypeScript types
│   └── config/            # Shared constants & build configurations
├── docs/                  # Architecture, setup & phase documentation
├── .env.example           # Root environment variable template
├── .gitignore             # Git exclusion rules
├── .npmrc                 # Hoisted pnpm configuration
├── package.json           # Monorepo scripts & workspaces
├── pnpm-workspace.yaml    # Workspace definition
├── tsconfig.json          # Root TypeScript configuration
└── README.md              # Project manual
```

---

## 3. Installation & Setup

1. **Clone or Open the Repository**:
   ```bash
   cd E:\APP\NewOne
   ```

2. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   ```bash
   # Root environment template
   cp .env.example .env

   # Backend API environment template
   cp apps/api/.env.example apps/api/.env.local

   # Mobile client environment template
   cp apps/mobile/.env.example apps/mobile/.env
   ```

---

## 4. Development Commands

### Starting the Applications

| Application | Command | URL / Details |
| :--- | :--- | :--- |
| **Mobile App (Expo)** | `pnpm --filter mobile start` | Metro bundler at `http://localhost:8081` (QR code in terminal) |
| **Backend API (Next.js)** | `pnpm --filter api dev` | REST server at `http://localhost:3000` |
| **API Health Check** | Browser / `curl` | `http://localhost:3000/api/health` |

### Code Quality & Compilation Checks

| Target | Command | Purpose |
| :--- | :--- | :--- |
| **All Typechecks** | `pnpm typecheck` | Validates TypeScript across all apps & packages |
| **Mobile Typecheck** | `pnpm --filter mobile typecheck` | Checks mobile TypeScript |
| **API Typecheck** | `pnpm --filter api typecheck` | Checks Next.js API TypeScript |
| **API Production Build** | `pnpm --filter api build` | Compiles production Next.js build |

---

## 5. Physical Android Device Testing with Expo Go

You do not need Android Studio or heavy emulators to run ResortOS on Android:

1. **Install Expo Go**:
   - Download and install **Expo Go** on your Android smartphone from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).

2. **Same Network Connection**:
   - Make sure your Android smartphone and computer are connected to the **same Wi-Fi network**.

3. **Find your Computer's Local IP**:
   - Run `ipconfig` in your terminal and note your Wi-Fi IPv4 address (e.g. `192.168.1.105`).
   - If connecting mobile to the local API backend, set in `apps/mobile/.env`:
     ```env
     EXPO_PUBLIC_API_URL=http://192.168.1.105:3000/api
     ```

4. **Start the Mobile App**:
   ```bash
   pnpm --filter mobile start
   ```

5. **Scan and Run**:
   - Open **Expo Go** on your Android phone.
   - Tap **Scan QR code** and scan the QR code displayed in the terminal.
   - The application will bundle and load the luxury white-smoke ResortOS interface directly on your mobile device!

---

## 6. Architecture & Roadmap

For in-depth architectural specifications and future milestones, consult the documentation directory:
- [System Architecture](file:///E:/APP/NewOne/docs/PROJECT_ARCHITECTURE.md)
- [Development Setup Guide](file:///E:/APP/NewOne/docs/DEVELOPMENT_SETUP.md)
- [Development Roadmap & Phases](file:///E:/APP/NewOne/docs/DEVELOPMENT_PHASES.md)
