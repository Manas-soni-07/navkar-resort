import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser, requireHotelAccess } from '@/lib/auth';
import { successResponse, handleRouteError } from '@/lib/api-response';
import { todayBoundsInTimeZone } from '@/lib/dates';
import type { DashboardStats } from '@resortos/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser(req);
    const { id: hotelId } = await params;
    await requireHotelAccess(user, hotelId);

    const hotel = await prisma.hotel.findUniqueOrThrow({
      where: { id: hotelId },
      select: { name: true, code: true, timezone: true },
    });

    const { start, end } = todayBoundsInTimeZone(hotel.timezone);

    const [rooms, activeStaffCount, expectedArrivals, expectedDepartures, revenue] =
      await Promise.all([
        prisma.room.findMany({ where: { hotelId }, select: { status: true } }),
        prisma.staff.count({ where: { hotelId, isActive: true } }),
        // Reservations due to arrive today that have not checked in yet.
        prisma.booking.count({
          where: {
            hotelId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            checkInDate: { gte: start, lt: end },
          },
        }),
        // Guests currently in-house whose stay ends today.
        prisma.booking.count({
          where: {
            hotelId,
            status: 'CHECKED_IN',
            checkOutDate: { gte: start, lt: end },
          },
        }),
        // Money actually collected today (each payment counted once).
        prisma.payment.aggregate({
          where: { hotelId, status: 'COMPLETED', paidAt: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
      ]);

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
    const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const dirtyRooms = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const stats: DashboardStats = {
      hotelName: hotel.name,
      hotelCode: hotel.code,
      totalRooms,
      occupiedRooms,
      availableRooms,
      dirtyRooms,
      occupancyRate,
      dailyRevenue: Number(revenue._sum.amount ?? 0),
      activeStaffCount,
      expectedArrivals,
      expectedDepartures,
    };

    return successResponse(stats, 'Hotel metrics loaded successfully');
  } catch (err: unknown) {
    return handleRouteError(err, 'METRICS_ERROR', 'Failed to compile dashboard metrics');
  }
}
