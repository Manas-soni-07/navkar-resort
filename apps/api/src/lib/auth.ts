import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { getJwtSecret, getJwtExpiresIn } from './env';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors';
import type { UserRole, UserProfile } from '@resortos/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  hotelId?: string | null;
  organizationId: string;
}

/** The authenticated user, freshly loaded from the database on every request. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  hotelId: string | null;
}

const ADMIN_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

export function isAdminRole(role: UserRole | string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export async function generateToken(
  payload: TokenPayload
): Promise<{ token: string; expiresAt: string }> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(getJwtExpiresIn())
    .sign(getJwtSecret());

  const { exp } = decodeJwt(token);
  const expiresAt = new Date((exp ?? 0) * 1000).toISOString();
  return { token, expiresAt };
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = getJwtSecret(); // misconfiguration must surface as a 500, not a 401
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
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

/**
 * Verifies the bearer token AND re-reads the user from the database, so that
 * deactivated accounts and changed hotel assignments take effect immediately
 * instead of lasting until the token expires. Role and hotel are never taken
 * from the client.
 */
export async function requireAuthUser(req: NextRequest): Promise<AuthUser> {
  const session = await getSessionFromRequest(req);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, organizationId: true, hotelId: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account not found or inactive');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    organizationId: user.organizationId,
    hotelId: user.hotelId,
  };
}

export function requireAdmin(user: AuthUser): void {
  if (!isAdminRole(user.role)) {
    throw new ForbiddenError('This action is restricted to administrators');
  }
}

/**
 * Hotel-level isolation:
 * - Admins may access any hotel in their own organization.
 * - Every other role may access only the single hotel assigned to their account.
 */
export async function requireHotelAccess(user: AuthUser, hotelId: string): Promise<void> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true, organizationId: true },
  });

  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }

  const allowed = isAdminRole(user.role)
    ? hotel.organizationId === user.organizationId
    : user.hotelId === hotel.id;

  if (!allowed) {
    throw new ForbiddenError('You do not have access to this hotel');
  }
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
