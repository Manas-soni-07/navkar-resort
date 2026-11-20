import type { Room as DbRoom } from '@prisma/client';
import type { Room, RoomStatus, RoomType } from '@resortos/shared';

export const ROOM_TYPES = [
  'STANDARD',
  'DELUXE',
  'EXECUTIVE_SUITE',
  'PRESIDENTIAL_SUITE',
  'VILLA',
  'PENTHOUSE',
] as const satisfies readonly RoomType[];

export const ROOM_STATUSES = [
  'AVAILABLE',
  'OCCUPIED',
  'DIRTY',
  'CLEANING',
  'INSPECTION',
  'MAINTENANCE',
  'BLOCKED',
] as const satisfies readonly RoomStatus[];

export function formatRoom(r: DbRoom): Room {
  return {
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
  };
}
