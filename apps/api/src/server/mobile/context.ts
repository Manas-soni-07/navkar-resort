import type { AuthUser } from '@/lib/auth';

export interface MobileContext {
  user: AuthUser;
  isAdmin: boolean;
  /** Hotels this user may touch: Admin -> every hotel of their organization, Manager -> their one hotel. */
  allowedHotelIds: string[];
  /** Public origin of this API (e.g. https://navkar-resort.vercel.app), for building links. */
  origin: string;
}
