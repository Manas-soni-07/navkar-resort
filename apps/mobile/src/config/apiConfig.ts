/**
 * ResortOS - Centralized API & Networking Configuration
 *
 * Dynamically resolves the backend API URL for:
 * 1. Physical Android/iOS mobile devices over local Wi-Fi.
 * 2. Android Emulator (10.0.2.2).
 * 3. iOS Simulator / Web (localhost).
 * 4. Production HTTPS deployments.
 *
 * No duplicate hardcoded URLs across the codebase.
 */

import { Platform, NativeModules } from 'react-native';

export type NetworkSource = 'EXPO_PUBLIC' | 'METRO_AUTO_DETECT' | 'LAN_FALLBACK' | 'EMULATOR' | 'PRODUCTION';

export interface NetworkConfig {
  baseUrl: string;
  host: string;
  port: number;
  isProduction: boolean;
  source: NetworkSource;
}

// Default development configuration
export const DEFAULT_PORT = 3000; // Next.js API (apps/api)
export const DEFAULT_DEV_LAN_IP = '192.168.1.26'; // Development PC local IPv4 address
export const PRODUCTION_API_URL = 'https://navkar-resort.vercel.app/api/m';

class ApiConfigurationManager {
  private runtimeBaseUrlOverride: string | null = null;

  /**
   * Automatically resolve the development machine's IP address from Metro bundler's scriptURL.
   * When Expo loads the JS bundle on a physical phone, NativeModules.SourceCode.scriptURL contains
   * the exact IP of the PC (e.g., http://192.168.1.26:8081/index.bundle...).
   */
  private getMetroHost(): string | null {
    try {
      const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL && typeof scriptURL === 'string') {
        const afterProtocol = scriptURL.split('://')[1];
        if (afterProtocol) {
          const hostPort = afterProtocol.split('/')[0];
          const host = hostPort.split(':')[0];
          if (host && host !== 'localhost' && host !== '127.0.0.1') {
            return host;
          }
        }
      }
    } catch {
      // Fall through to other detection mechanisms
    }
    return null;
  }

  /**
   * Resolve full configuration based on environment and runtime device
   */
  public getConfig(): NetworkConfig {
    const isProd = !__DEV__;

    // 1. Runtime override (e.g. user manually changed URL in CloudSync screen)
    if (this.runtimeBaseUrlOverride) {
      return {
        baseUrl: this.runtimeBaseUrlOverride,
        host: 'custom',
        port: DEFAULT_PORT,
        isProduction: isProd,
        source: 'EXPO_PUBLIC',
      };
    }

    // 2. Production environment
    if (isProd) {
      const prodUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;
      return {
        baseUrl: prodUrl.replace(/\/+$/, ''),
        host: 'production',
        port: 443,
        isProduction: true,
        source: 'PRODUCTION',
      };
    }

    // 3. Explicit environment variable (EXPO_PUBLIC_API_URL in .env)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && envUrl.trim().length > 0) {
      const cleanUrl = envUrl.trim().replace(/\/+$/, '');
      return {
        baseUrl: cleanUrl,
        host: 'env',
        port: DEFAULT_PORT,
        isProduction: false,
        source: 'EXPO_PUBLIC',
      };
    }

    // 4. Dynamic Metro host detection (works automatically on physical devices)
    const metroHost = this.getMetroHost();
    if (metroHost) {
      return {
        baseUrl: `http://${metroHost}:${DEFAULT_PORT}/api/m`,
        host: metroHost,
        port: DEFAULT_PORT,
        isProduction: false,
        source: 'METRO_AUTO_DETECT',
      };
    }

    // 5. Web Browser host detection
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      const webHost = window.location.hostname || 'localhost';
      return {
        baseUrl: `http://${webHost}:${DEFAULT_PORT}/api/m`,
        host: webHost,
        port: DEFAULT_PORT,
        isProduction: false,
        source: 'METRO_AUTO_DETECT',
      };
    }

    // 6. Physical Android Device & Local LAN fallback
    // When running on Android, connect to the developer machine's local LAN IP
    if (Platform.OS === 'android') {
      return {
        baseUrl: `http://${DEFAULT_DEV_LAN_IP}:${DEFAULT_PORT}/api/m`,
        host: DEFAULT_DEV_LAN_IP,
        port: DEFAULT_PORT,
        isProduction: false,
        source: 'LAN_FALLBACK',
      };
    }

    // 7. General fallback
    return {
      baseUrl: `http://localhost:${DEFAULT_PORT}/api/m`,
      host: 'localhost',
      port: DEFAULT_PORT,
      isProduction: false,
      source: 'LAN_FALLBACK',
    };
  }

  /**
   * Returns the resolved API Base URL (e.g., http://192.168.1.26:5000/api)
   */
  public getBaseUrl(): string {
    return this.getConfig().baseUrl;
  }

  /**
   * Set a runtime override URL
   */
  public setBaseUrl(newUrl: string): void {
    this.runtimeBaseUrlOverride = newUrl.trim().replace(/\/+$/, '');
  }

  /**
   * Reset runtime override to auto-detected default
   */
  public resetToDefault(): void {
    this.runtimeBaseUrlOverride = null;
  }
}

export const apiConfig = new ApiConfigurationManager();
export const API_BASE_URL = apiConfig.getBaseUrl();
