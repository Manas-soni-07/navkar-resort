# ResortOS - Development Setup Guide

## 1. Prerequisites

Ensure your host workstation satisfies the following requirements:

| Component | Minimum / Recommended Version | Status in Environment |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 / 11 64-bit | Windows 11 Build 26300 |
| **Node.js** | Node.js 22 LTS (v22.x or v24.x) | Verified (v22.22.x / v24.21.x) |
| **Package Manager**| `pnpm` v9+ or v12+ | Verified (`pnpm@12.18.0`) |
| **Version Control**| `git` v2.40+ | Verified (`git 2.51.0`) |
| **Java JDK** | OpenJDK 17 LTS | Verified (Microsoft OpenJDK 17.0.20) |
| **Mobile Testing** | Physical Android Phone with **Expo Go** app | Available via Google Play Store |

> **Note**: Android Studio and native SDKs are optional for Phase 1. You can test directly on your physical Android phone using the free **Expo Go** application.

---

## 2. Installation Steps

### 2.1 Navigate to Project Root
```bash
cd E:\APP\NewOne
```

### 2.2 Install Monorepo Dependencies
Install all workspace dependencies across mobile, API, and shared packages using pnpm:
```bash
pnpm install
```

### 2.3 Configure Environment Variables
Copy the template files:
```bash
# In the project root:
cp .env.example .env

# In the API backend:
cp apps/api/.env.example apps/api/.env.local

# In the Mobile app:
cp apps/mobile/.env.example apps/mobile/.env
```

---

## 3. Running the Applications

### 3.1 Start the Next.js API Backend
From the project root:
```bash
pnpm --filter api dev
```
- The backend starts at: `http://localhost:3000`
- Verify the health endpoint in your browser: `http://localhost:3000/api/health`

### 3.2 Start the Expo Mobile Application
From the project root:
```bash
pnpm --filter mobile start
```
- Expo CLI will launch Metro bundler at `http://localhost:8081` and render a large QR code in the terminal.

---

## 4. Testing on a Physical Android Phone with Expo Go

You do **not** need Android Studio or a local emulator. Follow these simple steps:

1. **Install Expo Go on your Phone**:
   - Open **Google Play Store** on your Android device.
   - Search for **Expo Go** (published by Expo Project) and install it.

2. **Connect to the Same Wi-Fi Network**:
   - Ensure your development computer and your Android smartphone are connected to the exact same Wi-Fi router / local network.

3. **Find your Computer's Local IP Address**:
   - In PowerShell, run: `ipconfig`
   - Locate the `IPv4 Address` under your active Wi-Fi adapter (e.g., `192.168.1.105`).

4. **Update Mobile API Base URL (if connecting mobile to local backend)**:
   - In `apps/mobile/.env`, set:
     ```env
     EXPO_PUBLIC_API_URL=http://192.168.1.105:3000/api
     ```

5. **Start Expo with LAN Mode**:
   ```bash
   pnpm --filter mobile start --tunnel
   # OR for standard LAN mode:
   pnpm --filter mobile start
   ```

6. **Scan the QR Code**:
   - Open the **Expo Go** app on your Android phone.
   - Tap **"Scan QR code"**.
   - Point your phone's camera at the terminal QR code.
   - Expo Go will download the JavaScript bundle and render **ResortOS** live on your phone!

---

## 5. Verification Commands

Run the following checks from `E:\APP\NewOne` to verify code integrity:

| Check | Command | Description |
| :--- | :--- | :--- |
| **Shared Typecheck** | `pnpm --filter @resortos/shared typecheck` | Checks universal models |
| **API Typecheck** | `pnpm --filter api typecheck` | Verifies Next.js TypeScript |
| **API Production Build** | `pnpm --filter api build` | Generates standalone Next.js build |
| **Mobile Typecheck** | `pnpm --filter mobile typecheck` | Verifies Expo Router TypeScript |
| **Full Workspace Check** | `pnpm typecheck` | Runs TypeScript across all packages |
