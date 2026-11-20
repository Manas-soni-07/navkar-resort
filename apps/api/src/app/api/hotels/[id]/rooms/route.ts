import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser, requireAdmin, requireHotelAccess } from '@/lib/auth';
import { successResponse, errorResponse, handleRouteError } from '@/lib/api-response';
import { ROOM_STATUSES, ROOM_TYPES, formatRoom } from '@/lib/rooms';

const roomQuerySchema = z.object({
  status: z.enum(ROOM_STATUSES).optional(),
  type: z.enum(ROOM_TYPES).optional(),
  floor: z.coerce.number().int().min(0).optional(),
});

const createRoomSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required'),
  floor: z.number().int().min(0),
  type: z.enum(ROOM_TYPES),
  basePricePerNight: z.number().positive(),
  maxOccupancy: z.number().int().min(1).default(2),
  bedCount: z.number().int().min(1).default(1),
  hasBalcony: z.boolean().default(false),
  hasOceanView: z.boolean().default(false),
  description: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser(req);
    const { id: hotelId } = await params;
    await requireHotelAccess(user, hotelId);

    const { searchParams } = new URL(req.url);
    const query = roomQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      floor: searchParams.get('floor') ?? undefined,
    });

    if (!query.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid room filter', 400, query.error.errors);
    }

    const rooms = await prisma.room.findMany({
      where: { hotelId, ...query.data },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    const formattedRooms = rooms.map(formatRoom);
    return successResponse(formattedRooms, `Loaded ${formattedRooms.length} rooms`);
  } catch (err: unknown) {
    return handleRouteError(err, 'ROOM_FETCH_ERROR', 'Failed to retrieve rooms');
  }
}

/** Room configuration is Admin-only (requirements §6). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser(req);
    requireAdmin(user);
    const { id: hotelId } = await params;
    await requireHotelAccess(user, hotelId);

    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid room configuration', 422, parsed.error.errors);
    }

    const data = parsed.data;

    const existing = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          hotelId,
          roomNumber: data.roomNumber,
        },
      },
    });

    if (existing) {
      return errorResponse('CONFLICT', `Room ${data.roomNumber} already exists in this property`, 409);
    }

    const newRoom = await prisma.room.create({
      data: {
        hotelId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        type: data.type,
        status: 'AVAILABLE',
        basePricePerNight: data.basePricePerNight,
        maxOccupancy: data.maxOccupancy,
        bedCount: data.bedCount,
        hasBalcony: data.hasBalcony,
        hasOceanView: data.hasOceanView,
        description: data.description,
      },
    });

    await prisma.auditLog.create({
      data: {
        hotelId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'ROOM',
        entityId: newRoom.id,
        details: JSON.stringify({ roomNumber: newRoom.roomNumber }),
      },
    });

    return successResponse(formatRoom(newRoom), `Room ${newRoom.roomNumber} created successfully`, 201);
  } catch (err: unknown) {
    return handleRouteError(err, 'ROOM_CREATE_ERROR', 'Failed to create room');
  }
}
