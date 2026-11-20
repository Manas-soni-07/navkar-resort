import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser, isAdminRole } from '@/lib/auth';
import { successResponse, errorResponse, handleRouteError } from '@/lib/api-response';
import type { Hotel } from '@resortos/shared';

export const dynamic = 'force-dynamic';

/**
 * Returns the hotel the signed-in user should land on:
 * - Manager: their assigned hotel (never anything else).
 * - Admin: the oldest active hotel in their organization.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);

    const hotel = isAdminRole(user.role)
      ? await prisma.hotel.findFirst({
          where: { organizationId: user.organizationId, status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        })
      : user.hotelId
        ? await prisma.hotel.findUnique({ where: { id: user.hotelId } })
        : null;

    if (!hotel) {
      return errorResponse('HOTEL_NOT_FOUND', 'No hotel is available for this account', 404);
    }

    const formatted: Hotel = {
      id: hotel.id,
      organizationId: hotel.organizationId,
      name: hotel.name,
      slug: hotel.slug,
      code: hotel.code,
      status: hotel.status as Hotel['status'],
      starRating: hotel.starRating,
      address: hotel.address,
      city: hotel.city,
      state: hotel.state,
      country: hotel.country,
      postalCode: hotel.postalCode,
      contactPhone: hotel.contactPhone,
      contactEmail: hotel.contactEmail,
      receptionPhone: hotel.receptionPhone,
      currency: hotel.currency,
      timezone: hotel.timezone,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      createdAt: hotel.createdAt.toISOString(),
      updatedAt: hotel.updatedAt.toISOString(),
    };

    return successResponse(formatted, 'Primary hotel loaded');
  } catch (err: unknown) {
    return handleRouteError(err, 'HOTEL_ERROR', 'Failed to retrieve hotel');
  }
}
