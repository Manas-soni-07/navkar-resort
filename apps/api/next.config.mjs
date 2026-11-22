/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@resortos/shared'],
  // mysql2 (used by the /api/m mobile endpoints) must be loaded from node_modules, not bundled.
  serverExternalPackages: ['mysql2'],
};

export default nextConfig;
