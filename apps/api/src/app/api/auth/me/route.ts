import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, formatUserProfile } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        hotel: {
          select: { name: true },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return errorResponse('USER_NOT_FOUND', 'User profile not found or inactive', 404);
    }

    const profile = formatUserProfile(user);
    return successResponse(profile, 'User profile fetched successfully');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return errorResponse(err.code, err.message, err.statusCode);
    }
    const message = err instanceof Error ? err.message : 'Authentication verification failed';
    return errorResponse('UNAUTHORIZED', message, 401);
  }
}
