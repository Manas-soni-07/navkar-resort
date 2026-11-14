import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken, formatUserProfile } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { AuthSession } from '@resortos/shared';

const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid login credentials provided',
        422,
        parsed.error.errors
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        hotel: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password combination', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse('ACCOUNT_INACTIVE', 'This user account is suspended or inactive', 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password combination', 401);
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        hotelId: user.hotelId,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ ip: req.headers.get('x-forwarded-for') ?? 'local' }),
      },
    });

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      organizationId: user.organizationId,
    });

    const userProfile = formatUserProfile(user);

    const sessionData: AuthSession = {
      user: userProfile,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return successResponse(sessionData, 'Authentication successful', 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal authentication error';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
