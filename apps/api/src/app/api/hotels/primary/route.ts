import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { Hotel } from '@resortos/shared';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const hotel = await prisma.hotel.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!hotel) {
      return errorResponse('HOTEL_NOT_FOUND', 'No active hotel property found', 404);
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
    const message = err instanceof Error ? err.message : 'Failed to retrieve hotel';
    return errorResponse('HOTEL_ERROR', message, 500);
  }
}
