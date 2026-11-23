/**
 * /api/m/* : the mobile app's API (ported from the mobile-nav Express server).
 *
 * Order of checks for every request:
 *   1. public routes (/health, /auth/login)
 *   2. token verification + fresh user lookup (requireAuthUser)
 *   3. access policy (policy.ts): admin-only routes, hotel pinning, record ownership
 *   4. route handler (secureRoutes.ts first, then the ported legacyRoutes.ts)
 * Internal error messages are never sent to clients in production.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser, isAdminRole, type AuthUser } from '@/lib/auth';
import { verifyGuestExportToken } from '@/server/mobile/downloadLink';
import { AppError } from '@/lib/errors';
import { isProduction } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import legacyRoutes from '@/server/mobile/legacyRoutes';
import { publicRoutes, buildSecureRoutes } from '@/server/mobile/secureRoutes';
import { enforcePolicy, PolicyError } from '@/server/mobile/policy';
import { createResponse, type MobileRequest } from '@/server/mobile/router';
import type { MobileContext } from '@/server/mobile/context';

export const dynamic = 'force-dynamic';

const PUBLIC_LEGACY = new Set(['GET /health']);

function reply(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/m/, '') || '/';
  const method = req.method.toUpperCase();

  let body: any = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return reply(400, { error: 'Request body must be valid JSON.' });
      }
    } else {
      body = {};
    }
  }

  const mreq: MobileRequest = {
    method,
    path,
    query: Object.fromEntries(url.searchParams.entries()),
    params: {},
    body,
    headers: Object.fromEntries(req.headers.entries()),
  };
  const res = createResponse();

  try {
    // 1. Public endpoints
    const pub = publicRoutes.match(method, path);
    const legacyPublic = PUBLIC_LEGACY.has(`${method} ${path}`) ? legacyRoutes.match(method, path) : null;
    const publicMatch = pub ?? legacyPublic;

    if (publicMatch) {
      mreq.params = publicMatch.params;
      await publicMatch.handler(mreq, res);
    } else {
      // 2. Authentication (verifies the signed token and reloads the user from the DB).
      //    The Excel export is opened in the phone's browser, which cannot send our header,
      //    so it may instead carry a 5-minute signed link bound to one user and one hotel.
      let user: AuthUser;
      if (path === '/reports/guests/export' && mreq.query.dl && !req.headers.get('authorization')) {
        const link = await verifyGuestExportToken(mreq.query.dl);
        if (!link || link.hotelId !== mreq.query.hotelId) {
          return reply(401, { error: 'This download link is invalid or has expired. Please export again from the app.' });
        }
        const u = await prisma.user.findUnique({ where: { id: link.userId } });
        if (!u || u.status !== 'ACTIVE') return reply(401, { error: 'Account is not active.' });
        user = { id: u.id, email: u.email, role: u.role, organizationId: u.organizationId, hotelId: u.hotelId };
      } else {
        user = await requireAuthUser(req);
      }
      const isAdmin = isAdminRole(user.role);
      const allowedHotelIds = isAdmin
        ? (await prisma.hotel.findMany({ where: { organizationId: user.organizationId }, select: { id: true } })).map((h) => h.id)
        : user.hotelId
          ? [user.hotelId]
          : [];
      // Links must use the host the client called (on Vercel, req.url can be the protected deployment URL).
      const host = req.headers.get('x-forwarded-host') ?? url.host;
      const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
      const ctx: MobileContext = { user, isAdmin, allowedHotelIds, origin: `${proto}://${host}` };

      const match = buildSecureRoutes(ctx).match(method, path) ?? legacyRoutes.match(method, path);
      if (!match) return reply(404, { error: `Endpoint not found: ${method} ${path}` });

      // 3. Access policy
      mreq.params = match.params;
      await enforcePolicy(ctx, mreq);

      // 4. Handler
      await match.handler(mreq, res);
    }
  } catch (err) {
    if (err instanceof PolicyError) return reply(err.status, { error: err.message });
    if (err instanceof AppError) return reply(err.statusCode, { error: err.message });
    console.error(`[api/m] ${method} ${path} failed:`, err);
    return reply(500, { error: 'Server error. Please try again.' });
  }

  if (!res.headersSent) return reply(500, { error: 'No response from handler.' });

  // File responses (e.g. the .xlsx guest export).
  if (res.raw !== undefined) {
    return new NextResponse(res.raw as BodyInit, { status: res.statusCode, headers: res.headers });
  }

  // Ported handlers put raw DB error text in 500 bodies; keep it out of production responses.
  if (res.statusCode >= 500 && isProduction) {
    console.error(`[api/m] ${method} ${path} -> ${res.statusCode}:`, res.body);
    return reply(res.statusCode, { error: 'Server error. Please try again.' });
  }
  return reply(res.statusCode, res.body);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
