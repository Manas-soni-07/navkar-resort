import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser, requireHotelAccess } from '@/lib/auth';
import { successResponse, errorResponse, handleRouteError } from '@/lib/api-response';
import { ROOM_STATUSES, formatRoom } from '@/lib/rooms';

const updateStatusSchema = z.object({
  status: z.enum(ROOM_STATUSES),
  remarks: z.string().max(500).optional(),
});

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser(req);
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

    // The room's own hotel decides access — never a client-supplied hotelId.
    await requireHotelAccess(user, currentRoom.hotelId);

    const previousStatus = currentRoom.status;

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: { status: targetStatus },
    });

    await prisma.auditLog.create({
      data: {
        hotelId: updated.hotelId,
        userId: user.id,
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

    return successResponse(
      formatRoom(updated),
      `Room ${updated.roomNumber} transitioned from ${previousStatus} to ${targetStatus}`
    );
  } catch (err: unknown) {
    return handleRouteError(err, 'STATUS_UPDATE_ERROR', 'Failed to update room status');
  }
}
