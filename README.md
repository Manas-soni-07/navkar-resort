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

## Run locally (verified)

These steps were tested end-to-end on Windows 11 with Node 23, Docker Desktop and an
Android emulator. They use a **local MySQL container** — the TiDB Cloud database is never touched.

```powershell
# 0. pnpm 12 (the corepack bundled with Node 23.10 cannot run pnpm 12, so use npx)
npx -y pnpm@12.18.0 install            # or: npm i -g pnpm@12.18.0, then plain `pnpm`

# 1. Local database (MySQL 8 in Docker, port 3307, data kept in a named volume)
docker run -d --name resortos-mysql-dev -p 3307:3306 `
  -e MYSQL_ROOT_PASSWORD=<choose-one> -e MYSQL_DATABASE=resortos_dev `
  -v resortos-mysql-dev-data:/var/lib/mysql mysql:8.0
#    (next time: docker start resortos-mysql-dev)

# 2. apps/api/.env.local  (copy apps/api/.env.example, then set)
#      DATABASE_URL="mysql://root:<choose-one>@127.0.0.1:3307/resortos_dev"
#      JWT_SECRET="<random string, 32+ characters>"     # required; the API refuses to start auth without it

# 3. Create tables + demo data (two hotels: The Villa, Navkar Palace)
pnpm db:push
pnpm db:seed

# 4. Start the API (terminal 1) and run the smoke test
pnpm dev:api
pnpm test:api                          # 24 checks: login, roles, hotel isolation

# 5. apps/mobile/.env  ->  EXPO_PUBLIC_API_URL=http://<your-PC-LAN-IP>:3000/api
#    Start Expo (terminal 2), then press "a" for the emulator or scan the QR code in Expo Go
pnpm dev:mobile
```

Demo accounts (development seed only — never seed production):

| Portal | Email | Password | Sees |
| :--- | :--- | :--- | :--- |
| Admin | `admin@resortos.com` | `admin12345` | All hotels |
| Manager | `manager.villa@resortos.com` | `manager12345` | The Villa only |
| Manager | `manager.navkar@resortos.com` | `manager12345` | Navkar Palace only |

If the phone cannot reach the API, allow Node.js through Windows Firewall on private networks (port 3000).

### Connect to TiDB Cloud

1. TiDB Cloud → cluster → **Connect** → *Connect With: Prisma*, database `resortos` → copy `DATABASE_URL`
   (`mysql://<prefix>.root:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/resortos?sslaccept=strict`).
2. Paste it into `apps/api/.env.tidb.local` and run `pnpm --filter api db:check:tidb`.
   This is **read-only**: it prints the SQL that would make TiDB match `schema.prisma` but never runs it.
3. Only after reviewing that output, put the same `DATABASE_URL` in `apps/api/.env.local` and restart the API.
   Never run `db:seed` or `db push --accept-data-loss` against TiDB (both scripts now refuse to).
   To go back to the local MySQL container, copy `apps/api/.env.mysql.local` over `.env.local`.
4. Useful commands (from the repo root):
   - `pnpm --filter api db:backup`: JSON backup of every table into `backups/` (read-only)
   - `pnpm --filter api user:set-password <email>`: set an account's password (hidden prompt)
   - `pnpm --filter api db:check:tidb`: should print "Database matches the schema"

### Build an installable APK (Android)

The API URL is baked into the APK at build time from `apps/mobile/.env` (`EXPO_PUBLIC_API_URL`).

```powershell
cd apps/mobile
npx expo prebuild --platform android --no-install      # only needed once / after app.json changes
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'   # JDK 17/21; JDK 25 is too new
$env:ANDROID_HOME = 'C:\Android\Sdk'
$env:NODE_ENV = 'production'
$env:EXPO_NO_METRO_WORKSPACE_ROOT = '1'                 # monorepo: bundle from apps/mobile
cd android; .\gradlew.bat assembleRelease
# -> apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Notes: do not set `JAVA_TOOL_OPTIONS` (its stderr notice breaks the native C++ step); the APK is signed with
the debug key, fine for sideloading but not for the Play Store; `usesCleartextTraffic` is enabled so the APK
can reach an `http://` LAN API. Turn it off once the API is on HTTPS.

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
