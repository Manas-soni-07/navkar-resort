/**
 * Short-lived signed links for file downloads opened in the phone's browser
 * (which cannot send the app's Authorization header).
 * A link is bound to one user, one purpose and one hotel, and expires after 5 minutes.
 */
import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/env';

const PURPOSE = 'guest-export';
const TTL = '5m';

export async function signGuestExportToken(userId: string, hotelId: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, hotelId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(getJwtSecret());
}

/** Returns { userId, hotelId } for a valid link token, or null. */
export async function verifyGuestExportToken(token: string): Promise<{ userId: string; hotelId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (payload.purpose !== PURPOSE || typeof payload.sub !== 'string' || typeof payload.hotelId !== 'string') {
      return null;
    }
    return { userId: payload.sub, hotelId: payload.hotelId };
  } catch {
    return null;
  }
}
