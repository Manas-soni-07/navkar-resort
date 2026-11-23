/**
 * Access policy for the /api/m endpoints (requirements §10):
 * - every endpoint except /health and /auth/login needs a valid token;
 * - hotel access is derived from the authenticated account, never from client input:
 *   Managers are pinned to their own hotel, Admins to the hotels of their organization;
 * - records addressed by :id, and staff/rooms referenced in a request body, must belong
 *   to an allowed hotel;
 * - hotel, manager and cross-hotel summary endpoints are Admin-only.
 */
import pool from './db';
import type { MobileContext } from './context';
import type { MobileRequest } from './router';

export class PolicyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const ADMIN_ONLY: Array<[string, RegExp]> = [
  ['POST', /^\/hotels$/],
  ['PUT', /^\/hotels\/[^/]+$/],
  ['*', /^\/managers(\/.*)?$/],
  ['GET', /^\/sync\/summary$/],
  ['GET', /^\/dashboard\/daily-summary$/],
];

/** `/<prefix>/:id/...` -> table whose row `id` must belong to an allowed hotel. */
const ID_TABLES: Array<[RegExp, string]> = [
  [/^\/rooms\/([^/]+)/, 'rooms'],
  [/^\/bookings\/([^/]+)/, 'bookings'],
  [/^\/staff\/([^/]+)/, 'staff'],
  [/^\/salary-advances\/([^/]+)/, 'staff_advances'],
  [/^\/folios\/([^/]+)/, 'invoices'],
];

/** Body fields that reference rows of another table. */
const BODY_REFS: Array<[string, string]> = [
  ['staffId', 'staff'],
  ['roomId', 'rooms'],
  ['newRoomId', 'rooms'],
];

// Sub-paths that are not ids (e.g. /bookings/walk-in).
const NOT_IDS = new Set(['walk-in', 'pay']);

async function hotelOf(table: string, id: string): Promise<string | null> {
  const [rows] = (await pool.query(`SELECT hotelId FROM \`${table}\` WHERE id = ? LIMIT 1`, [id])) as any;
  return rows.length ? rows[0].hotelId : null;
}

function assertAllowed(ctx: MobileContext, hotelId: string | null | undefined, what: string) {
  if (!hotelId || !ctx.allowedHotelIds.includes(hotelId)) {
    throw new PolicyError(403, `Access Denied: you cannot access ${what} of this hotel.`);
  }
}

export async function enforcePolicy(ctx: MobileContext, req: MobileRequest): Promise<void> {
  const { user, isAdmin } = ctx;

  // Server-derived identity replaces anything the client claimed.
  req.headers['x-user-role'] = user.role;
  req.headers['x-user-hotel-id'] = user.hotelId ?? '';

  if (!isAdmin && ADMIN_ONLY.some(([m, re]) => (m === '*' || m === req.method) && re.test(req.path))) {
    throw new PolicyError(403, 'Access Denied: this action requires an Administrator account.');
  }

  // Hotel scoping of query and body.
  const q = req.query.hotelId;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (isAdmin) {
    if (q && q !== 'all') assertAllowed(ctx, q, 'records');
    if (body?.hotelId) assertAllowed(ctx, body.hotelId, 'records');
  } else {
    if (q && q !== 'all' && q !== user.hotelId) assertAllowed(ctx, q, 'records');
    if (body?.hotelId && body.hotelId !== user.hotelId) assertAllowed(ctx, body.hotelId, 'records');
    req.query.hotelId = user.hotelId as string; // list endpoints: never "all" for a Manager
    if (body && req.method !== 'GET') body.hotelId = user.hotelId;
  }

  // Records addressed by id.
  if (/^\/hotels\/([^/]+)/.test(req.path)) {
    assertAllowed(ctx, req.path.split('/')[2], 'details');
  }
  for (const [re, table] of ID_TABLES) {
    const m = re.exec(req.path);
    if (m && !NOT_IDS.has(m[1])) {
      const owner = await hotelOf(table, decodeURIComponent(m[1]));
      if (owner === null) throw new PolicyError(404, 'Record not found.');
      assertAllowed(ctx, owner, 'records');
    }
  }
  const mgr = /^\/managers\/([^/]+)/.exec(req.path);
  if (mgr) {
    const [rows] = (await pool.query('SELECT role, organizationId FROM users WHERE id = ? LIMIT 1', [decodeURIComponent(mgr[1])])) as any;
    if (!rows.length || rows[0].role !== 'MANAGER' || rows[0].organizationId !== user.organizationId) {
      throw new PolicyError(404, 'Manager not found.');
    }
  }

  // Writes that act on a staff member must name one (otherwise the handler hits a DB constraint).
  if (req.method === 'POST' && (req.path === '/attendance' || req.path === '/salaries/pay') && !body?.staffId) {
    throw new PolicyError(400, 'A staff member (staffId) is required.');
  }

  // Rows referenced from the body.
  if (body) {
    for (const [field, table] of BODY_REFS) {
      if (body[field]) {
        const owner = await hotelOf(table, String(body[field]));
        if (owner === null) throw new PolicyError(404, `Referenced ${field} was not found.`);
        assertAllowed(ctx, owner, 'records');
      }
    }
  }
}
