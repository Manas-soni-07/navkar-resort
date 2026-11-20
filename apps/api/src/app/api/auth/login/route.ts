import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken, formatUserProfile, isAdminRole } from '@/lib/auth';
import { successResponse, errorResponse, handleRouteError } from '@/lib/api-response';
import type { AuthSession, UserRole } from '@resortos/shared';

const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
  // Portal chosen on the shared login screen. Only used to reject a mismatch —
  // the account's real role always comes from the database.
  role: z.enum(['ADMIN', 'MANAGER']).optional(),
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

    const { email, password, role: selectedPortal } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        hotel: {
          select: { name: true },
        },
      },
    });

    // Compare the password before revealing anything about the account's state.
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password combination', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse('ACCOUNT_INACTIVE', 'This user account is suspended or inactive', 403);
    }

    const accountIsAdmin = isAdminRole(user.role);
    if (selectedPortal && (selectedPortal === 'ADMIN') !== accountIsAdmin) {
      return errorResponse(
        'ROLE_MISMATCH',
        `This account cannot sign in to the ${selectedPortal === 'ADMIN' ? 'Admin' : 'Manager'} portal`,
        403
      );
    }

    if (!accountIsAdmin && !user.hotelId) {
      return errorResponse(
        'NO_HOTEL_ASSIGNED',
        'This account is not assigned to a hotel. Contact your administrator.',
        403
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        hotelId: user.hotelId,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: req.headers.get('user-agent'),
      },
    });

    const { token, expiresAt } = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      hotelId: user.hotelId,
      organizationId: user.organizationId,
    });

    const sessionData: AuthSession = {
      user: formatUserProfile(user),
      token,
      expiresAt,
    };

    return successResponse(sessionData, 'Authentication successful', 200);
  } catch (err: unknown) {
    return handleRouteError(err, 'INTERNAL_ERROR', 'Authentication failed');
  }
}
