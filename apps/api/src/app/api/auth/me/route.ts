import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser, formatUserProfile } from '@/lib/auth';
import { successResponse, errorResponse, handleRouteError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuthUser(req);

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        hotel: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'User profile not found', 404);
    }

    return successResponse(formatUserProfile(user), 'User profile fetched successfully');
  } catch (err: unknown) {
    return handleRouteError(err, 'AUTH_ERROR', 'Authentication verification failed');
  }
}
