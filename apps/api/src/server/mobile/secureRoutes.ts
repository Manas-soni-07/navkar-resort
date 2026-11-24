/**
 * Secure replacements for the mobile-nav endpoints that handled credentials.
 * Response shapes match what the mobile app (src/services/apiClient.ts) expects.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateToken, isAdminRole } from '@/lib/auth';
import { MobileRouter } from './router';
import { signGuestExportToken } from './downloadLink';
import { registerDocumentRoutes } from './documentRoutes';
import { registerReportRoutes, parseExportParams } from './reportRoutes';
import { registerSalaryRoutes } from './salaryRoutes';
import type { MobileContext } from './context';

const MIN_PASSWORD_LENGTH = 8;

/** Routes reachable without a token. */
export const publicRoutes = new MobileRouter();

/** Routes that need ctx (the authenticated user); registered with ctx bound at dispatch time. */
export function buildSecureRoutes(ctx: MobileContext): MobileRouter {
  const router = new MobileRouter();
  const { user } = ctx;
  registerDocumentRoutes(router, ctx);

  router.get('/auth/me', async (_req, res) => {
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true, phone: true, role: true, hotelId: true },
    });
    res.json({ user: u });
  });

  // Signed 5-minute link for the Excel guest export (opened in the phone's browser).
  // The access policy has already checked/pinned req.query.hotelId for this user.
  router.get('/reports/guests/export-link', async (req, res) => {
    const p = parseExportParams(req.query);
    if ('error' in p) return res.status(400).json({ error: p.error });
    const token = await signGuestExportToken(user.id, p.hotelId);
    const qs = new URLSearchParams({ hotelId: p.hotelId, fields: p.fields.join(','), dl: token });
    if (p.from) qs.set('from', p.from);
    if (p.to) qs.set('to', p.to);
    res.json({ url: `${ctx.origin}/api/m/reports/guests/export?${qs.toString()}`, expiresInSeconds: 300 });
  });
  registerReportRoutes(router, ctx);
  registerSalaryRoutes(router, ctx);

  router.post('/managers', async (req, res) => {
    const { fullName, email, phone, hotelId, initialPassword } = req.body ?? {};
    if (!fullName || !email || !hotelId) {
      return res.status(400).json({ error: 'Full name, email and hotel are required.' });
    }
    if (!initialPassword || String(initialPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Initial password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    const created = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        hotelId,
        email: cleanEmail,
        passwordHash: await bcrypt.hash(String(initialPassword), 12),
        fullName: String(fullName),
        phone: phone ? String(phone) : null,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });
    await prisma.managerAssignment.create({ data: { userId: created.id, hotelId, isPrimary: true } });
    await prisma.auditLog.create({
      data: { userId: user.id, hotelId, action: 'CREATE', entityType: 'User', entityId: created.id, details: `Manager ${cleanEmail} created` },
    });
    res.status(201).json({ success: true, id: created.id, email: cleanEmail, fullName: created.fullName });
  });

  router.patch('/managers/:id/password', async (req, res) => {
    const { newPassword } = req.body ?? {};
    if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await bcrypt.hash(String(newPassword), 12) },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'UPDATE', entityType: 'User', entityId: req.params.id, details: 'Manager password reset by admin' },
    });
    res.json({ success: true, id: req.params.id });
  });

  return router;
}

publicRoutes.post('/auth/login', async (req, res) => {
  const { email, password, role: requestedRole } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { hotel: { select: { id: true, name: true, code: true, contactPhone: true, address: true } } },
  });
  // Same message for unknown email and wrong password (no account enumeration).
  const valid = user ? await bcrypt.compare(String(password), user.passwordHash) : false;
  if (!user || !valid) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'This user account is inactive. Please contact the administrator.' });
  }

  const isAdmin = isAdminRole(user.role);
  const wanted = requestedRole ? String(requestedRole).toUpperCase() : null;
  if (wanted === 'ADMIN' && !isAdmin) {
    return res.status(403).json({
      error: 'Access Denied: This account does not possess Administrator privileges. Please select Manager role or sign in with an Admin account.',
      actualRole: user.role,
    });
  }
  if (wanted === 'MANAGER' && isAdmin) {
    return res.status(403).json({
      error: 'This is an Administrator account. Please select the Admin role to sign in.',
      actualRole: user.role,
    });
  }
  if (!isAdmin && !user.hotelId) {
    return res.status(403).json({ error: 'No hotel is assigned to this account. Please contact the administrator.' });
  }

  const { token } = await generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    hotelId: user.hotelId,
    organizationId: user.organizationId,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      hotelId: user.hotelId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      hotelId: user.hotelId,
      assignedHotel: user.hotel,
    },
  });
});
