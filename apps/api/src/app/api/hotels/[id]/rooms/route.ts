import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { Room, RoomStatus, RoomType } from '@resortos/shared';

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number().int().min(0),
  type: z.enum([
    'STANDARD',
    'DELUXE',
    'EXECUTIVE_SUITE',
    'PRESIDENTIAL_SUITE',
    'VILLA',
    'PENTHOUSE',
  ]),
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
    const { id: hotelId } = await params;
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get('status') as RoomStatus | null;
    const floorParam = searchParams.get('floor');
    const typeParam = searchParams.get('type') as RoomType | null;

    const whereClause: {
      hotelId: string;
      status?: RoomStatus;
      floor?: number;
      type?: RoomType;
    } = { hotelId };

    if (statusParam) whereClause.status = statusParam;
    if (floorParam) whereClause.floor = parseInt(floorParam, 10);
    if (typeParam) whereClause.type = typeParam;

    const rooms = await prisma.room.findMany({
      where: whereClause,
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    const formattedRooms: Room[] = rooms.map((r) => ({
      id: r.id,
      hotelId: r.hotelId,
      roomNumber: r.roomNumber,
      floor: r.floor,
      type: r.type as RoomType,
      status: r.status as RoomStatus,
      basePricePerNight: Number(r.basePricePerNight),
      maxOccupancy: r.maxOccupancy,
      bedCount: r.bedCount,
      hasBalcony: r.hasBalcony,
      hasOceanView: r.hasOceanView,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return successResponse(formattedRooms, `Loaded ${formattedRooms.length} rooms`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve rooms';
    return errorResponse('ROOM_FETCH_ERROR', message, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    const { id: hotelId } = await params;

    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN' && session.role !== 'MANAGER') {
      return errorResponse('FORBIDDEN', 'Insufficient permissions to add rooms', 403);
    }

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

    const formatted: Room = {
      id: newRoom.id,
      hotelId: newRoom.hotelId,
      roomNumber: newRoom.roomNumber,
      floor: newRoom.floor,
      type: newRoom.type as RoomType,
      status: newRoom.status as RoomStatus,
      basePricePerNight: Number(newRoom.basePricePerNight),
      maxOccupancy: newRoom.maxOccupancy,
      bedCount: newRoom.bedCount,
      hasBalcony: newRoom.hasBalcony,
      hasOceanView: newRoom.hasOceanView,
      description: newRoom.description,
      createdAt: newRoom.createdAt.toISOString(),
      updatedAt: newRoom.updatedAt.toISOString(),
    };

    return successResponse(formatted, `Room ${newRoom.roomNumber} created successfully`, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create room';
    return errorResponse('ROOM_CREATE_ERROR', message, 500);
  }
}
