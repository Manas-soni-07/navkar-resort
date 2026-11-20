/**
 * Server-side environment access.
 *
 * Values are read lazily (at request time, not at import time) so that
 * `next build` does not require production secrets, while every request
 * that needs a secret fails loudly if it is missing instead of silently
 * falling back to a value that is visible in source control.
 */

const MIN_JWT_SECRET_LENGTH = 32;

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  // Also reject the placeholder from .env.example, which is public.
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH || secret.startsWith('replace-with')) {
    throw new Error(
      `JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters. ` +
        'Set it in apps/api/.env.local (see apps/api/.env.example).'
    );
  }
  return new TextEncoder().encode(secret);
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

export const isProduction = process.env.NODE_ENV === 'production';
