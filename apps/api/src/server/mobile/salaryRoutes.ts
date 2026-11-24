/**
 * Monthly payroll (admin-only via policy.ts). Replaces the ported handlers, which were fixed to
 * November 2026 and used invented attendance (30 or 28 days alternating per staff member).
 *
 *   GET  /salaries?hotelId=&month=&year=   (defaults: current month in India)
 *     presentDays/halfDays/absentDays come from the attendances table for that month.
 *     Days with no attendance mark count as present (absences must be marked).
 *     advanceDeductions = advances not yet deducted, given on or before the end of that month.
 *   POST /salaries/pay { staffId, netAmount, month?, year? }
 *     records the payment for that month and marks those advances as deducted ("Nov 2026").
 */
import pool from './db';
import { MobileRouter } from './router';
import type { MobileContext } from './context';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentIstMonth(): { month: number; year: number } {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .split('-');
  return { month: Number(m), year: Number(y) };
}

function resolveMonth(q: Record<string, any>): { month: number; year: number } | null {
  const cur = currentIstMonth();
  const month = q.month != null && q.month !== '' ? Number(q.month) : cur.month;
  const year = q.year != null && q.year !== '' ? Number(q.year) : cur.year;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return { month, year };
}

const monthEnd = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;

export function registerSalaryRoutes(router: MobileRouter, ctx: MobileContext) {
  router.get('/salaries', async (req, res) => {
    const period = resolveMonth(req.query);
    if (!period) return res.status(400).json({ error: 'Invalid month/year.' });
    const { month, year } = period;
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const hotelId = req.query.hotelId;
    const hotels = hotelId && hotelId !== 'all' ? [hotelId] : ctx.allowedHotelIds;
    if (!hotels.length) return res.json([]);
    const inList = hotels.map(() => '?').join(',');

    const [staff] = (await pool.query(
      `SELECT s.*, h.name AS hotelName FROM staff s LEFT JOIN hotels h ON s.hotelId = h.id
        WHERE s.hotelId IN (${inList}) ORDER BY h.name, s.fullName`,
      hotels
    )) as any;

    const [att] = (await pool.query(
      `SELECT staffId,
              SUM(UPPER(status) IN ('PRESENT','LATE')) AS present,
              SUM(UPPER(status) = 'HALF_DAY') AS half,
              SUM(UPPER(status) IN ('ABSENT','ON_LEAVE')) AS absent
         FROM attendances
        WHERE hotelId IN (${inList}) AND YEAR(date) = ? AND MONTH(date) = ?
        GROUP BY staffId`,
      [...hotels, year, month]
    )) as any;
    const attMap = new Map(att.map((a: any) => [a.staffId, a]));

    const [adv] = (await pool.query(
      `SELECT staffId, SUM(amount) AS total FROM staff_advances
        WHERE hotelId IN (${inList}) AND (isDeducted = FALSE OR isDeducted IS NULL)
          AND COALESCE(advanceDate, DATE(requestDate)) <= ?
        GROUP BY staffId`,
      [...hotels, monthEnd(year, month)]
    )) as any;
    const advMap = new Map(adv.map((a: any) => [a.staffId, Number(a.total) || 0]));

    const [paid] = (await pool.query(
      `SELECT staffId, status FROM salary_payments WHERE hotelId IN (${inList}) AND month = ? AND year = ?`,
      [...hotels, month, year]
    )) as any;
    const paidMap = new Map(paid.map((p: any) => [p.staffId, String(p.status).toUpperCase()]));

    res.json(
      staff.map((s: any) => {
        const a: any = attMap.get(s.id) || { present: 0, half: 0, absent: 0 };
        const halfDays = Number(a.half) || 0;
        const absentDays = Number(a.absent) || 0;
        return {
          id: `sal-${s.id}-${year}-${month}`,
          staffId: s.id,
          staffName: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff Member',
          role: s.role || s.designation || 'Staff',
          hotelId: s.hotelId,
          hotelName: s.hotelName || '',
          baseSalary: Number(s.monthlySalary || s.baseSalary || 0),
          month,
          year,
          totalDays,
          presentDays: Math.max(0, totalDays - halfDays - absentDays),
          halfDays,
          absentDays,
          markedPresentDays: Number(a.present) || 0,
          advanceDeductions: advMap.get(s.id) || 0,
          status: paidMap.get(s.id) === 'PAID' ? 'PAID' : 'PENDING',
        };
      })
    );
  });

  router.post('/salaries/pay', async (req, res) => {
    const { staffId, netAmount } = req.body ?? {};
    const period = resolveMonth(req.body ?? {});
    if (!period) return res.status(400).json({ error: 'Invalid month/year.' });
    const { month, year } = period;
    const [[s]] = (await pool.query('SELECT id, hotelId, monthlySalary, baseSalary FROM staff WHERE id = ?', [staffId])) as any;
    if (!s) return res.status(404).json({ error: 'Staff member not found.' });
    const net = Number(netAmount);
    if (!Number.isFinite(net) || net < 0) return res.status(400).json({ error: 'Invalid net amount.' });
    const label = `${MONTHS[month - 1]} ${year}`;

    await pool.query(
      `INSERT INTO salary_payments (id, staffId, hotelId, month, year, baseSalary, netAmount, status, paidAt, paymentMethod)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', NOW(), 'BANK_TRANSFER')
       ON DUPLICATE KEY UPDATE status = 'PAID', netAmount = VALUES(netAmount), paidAt = NOW()`,
      [`sp-${s.id}-${month}-${year}`, s.id, s.hotelId, month, year, Number(s.monthlySalary || s.baseSalary || 0), net]
    );
    // Deduct the advances that were included in this month's calculation.
    await pool.query(
      `UPDATE staff_advances SET isDeducted = TRUE, deductedMonth = ?
        WHERE staffId = ? AND (isDeducted = FALSE OR isDeducted IS NULL)
          AND COALESCE(advanceDate, DATE(requestDate)) <= ?`,
      [label, s.id, monthEnd(year, month)]
    );
    res.json({ success: true, id: `sp-${s.id}-${month}-${year}`, status: 'PAID', month, year });
  });
}
