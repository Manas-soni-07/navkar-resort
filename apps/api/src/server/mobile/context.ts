import type { AuthUser } from '@/lib/auth';

export interface MobileContext {
  user: AuthUser;
  isAdmin: boolean;
  /** Hotels this user may touch: Admin -> every hotel of their organization, Manager -> their one hotel. */
  allowedHotelIds: string[];
}
