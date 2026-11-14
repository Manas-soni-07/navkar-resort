import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { Room, RoomStatus, RoomType } from '@resortos/shared';

const updateStatusSchema = z.object({
  status: z.enum([
    'AVAILABLE',
    'OCCUPIED',
    'DIRTY',
    'CLEANING',
    'INSPECTION',
    'MAINTENANCE',
    'BLOCKED',
  ]),
  remarks: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    const { id: roomId } = await params;

    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid room status value', 422, parsed.error.errors);
    }

    const { status: targetStatus, remarks } = parsed.data;

    const currentRoom = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!currentRoom) {
      return errorResponse('NOT_FOUND', 'Room not found', 404);
    }

    const previousStatus = currentRoom.status;

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: { status: targetStatus },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        hotelId: updated.hotelId,
        userId: session.userId,
        action: 'STATUS_CHANGE',
        entityType: 'ROOM',
        entityId: updated.id,
        details: JSON.stringify({
          roomNumber: updated.roomNumber,
          from: previousStatus,
          to: targetStatus,
          remarks: remarks ?? 'Status updated via housekeeping dispatch',
        }),
      },
    });

    const formatted: Room = {
      id: updated.id,
      hotelId: updated.hotelId,
      roomNumber: updated.roomNumber,
      floor: updated.floor,
      type: updated.type as RoomType,
      status: updated.status as RoomStatus,
      basePricePerNight: Number(updated.basePricePerNight),
      maxOccupancy: updated.maxOccupancy,
      bedCount: updated.bedCount,
      hasBalcony: updated.hasBalcony,
      hasOceanView: updated.hasOceanView,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return successResponse(
      formatted,
      `Room ${updated.roomNumber} transitioned from ${previousStatus} to ${targetStatus}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update room status';
    return errorResponse('STATUS_UPDATE_ERROR', message, 500);
  }
}
