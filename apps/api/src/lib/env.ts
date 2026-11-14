import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z
    .string()
    .url()
    .default('mysql://root:password@127.0.0.1:4000/resortos_dev?sslaccept=strict'),
  JWT_SECRET: z.string().min(8).default('resortos-dev-jwt-secret-key-32chars-min'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  // In development, allow fallback defaults
}

export const env = parsedEnv.success ? parsedEnv.data : envSchema.parse({});
