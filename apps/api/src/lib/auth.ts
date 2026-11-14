import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from './errors';
import type { UserRole, UserProfile } from '@resortos/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'resortos-super-secret-development-jwt-token-key-32chars-min'
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  hotelId?: string | null;
  organizationId: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export async function generateToken(payload: TokenPayload, expiresIn = '7d'): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<TokenPayload> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  return verifyToken(token);
}

export function formatUserProfile(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string | null;
  hotelId?: string | null;
  hotel?: { name: string } | null;
  organizationId: string;
  status: string;
  createdAt: Date;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    phone: user.phone,
    hotelId: user.hotelId,
    hotelName: user.hotel?.name ?? null,
    organizationId: user.organizationId,
    isActive: user.status === 'ACTIVE',
    createdAt: user.createdAt.toISOString(),
  };
}
