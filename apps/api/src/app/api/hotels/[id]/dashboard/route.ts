import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { DashboardStats } from '@resortos/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hotelId } = await params;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, code: true },
    });

    if (!hotel) {
      return errorResponse('HOTEL_NOT_FOUND', 'Hotel not found', 404);
    }

    const rooms = await prisma.room.findMany({
      where: { hotelId },
      select: {
        status: true,
        basePricePerNight: true,
      },
    });

    const activeStaffCount = await prisma.staff.count({
      where: { hotelId, isActive: true },
    });

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
    const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const dirtyRooms = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING').length;

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const dailyRevenue = rooms
      .filter((r) => r.status === 'OCCUPIED')
      .reduce((sum, r) => sum + Number(r.basePricePerNight), 0);

    const stats: DashboardStats = {
      hotelName: hotel.name,
      hotelCode: hotel.code,
      totalRooms,
      occupiedRooms,
      availableRooms,
      dirtyRooms,
      occupancyRate,
      dailyRevenue,
      activeStaffCount,
      expectedArrivals: availableRooms > 3 ? 3 : availableRooms,
      expectedDepartures: occupiedRooms > 2 ? 2 : occupiedRooms,
    };

    return successResponse(stats, 'Hotel metrics loaded successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to compile dashboard metrics';
    return errorResponse('METRICS_ERROR', message, 500);
  }
}
