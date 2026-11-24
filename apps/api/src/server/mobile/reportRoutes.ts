/**
 * Guest register export (admin-only via policy.ts), e.g. the monthly listing for the police station.
 *
 *   GET /reports/guests/fields                      -> selectable columns (+ defaults)
 *   GET /reports/guests/export?hotelId=&from=&to=&fields=a,b,c[&format=json]
 *        -> .xlsx (or JSON preview). Guests are included by check-in date (IST), cancelled bookings excluded.
 *   GET /reports/guests/export-link?...same params  -> 5-minute signed link (see secureRoutes) for the phone's browser.
 *
 * Every field the check-in / walk-in form collects is available.
 */
import * as XLSX from 'xlsx';
import pool from './db';
import { MobileRouter } from './router';
import type { MobileContext } from './context';

export interface GuestField {
  key: string;
  label: string;
  group: 'Guest' | 'Stay' | 'Payment' | 'Other';
  default: boolean;
}

export const GUEST_FIELDS: GuestField[] = [
  { key: 'guestName', label: 'Guest Name', group: 'Guest', default: true },
  { key: 'guestPhone', label: 'Mobile Number', group: 'Guest', default: true },
  { key: 'numberOfGuests', label: 'No. of Guests', group: 'Guest', default: true },
  { key: 'address', label: 'Address / City of Origin', group: 'Guest', default: true },
  { key: 'nationality', label: 'Nationality', group: 'Guest', default: true },
  { key: 'idType', label: 'ID Type', group: 'Guest', default: true },
  { key: 'idNumber', label: 'ID Number', group: 'Guest', default: true },
  { key: 'guestEmail', label: 'Email', group: 'Guest', default: false },
  { key: 'checkInDate', label: 'Check-in Date', group: 'Stay', default: true },
  { key: 'checkInTime', label: 'Check-in Time', group: 'Stay', default: true },
  { key: 'checkOutDate', label: 'Check-out Date', group: 'Stay', default: true },
  { key: 'nights', label: 'Nights', group: 'Stay', default: true },
  { key: 'roomNumber', label: 'Room No.', group: 'Stay', default: true },
  { key: 'roomType', label: 'Room Type', group: 'Stay', default: true },
  { key: 'rooms', label: 'No. of Rooms', group: 'Stay', default: false },
  { key: 'bookingStatus', label: 'Status', group: 'Stay', default: false },
  { key: 'totalAmount', label: 'Total Amount (₹)', group: 'Payment', default: false },
  { key: 'advancePaid', label: 'Advance Paid (₹)', group: 'Payment', default: false },
  { key: 'balanceDue', label: 'Balance Due (₹)', group: 'Payment', default: false },
  { key: 'paymentStatus', label: 'Payment Status', group: 'Payment', default: false },
  { key: 'paymentMethod', label: 'Payment Method', group: 'Payment', default: false },
  { key: 'bookingReference', label: 'Booking Ref', group: 'Other', default: false },
  { key: 'bookingType', label: 'Booking Type', group: 'Other', default: false },
  { key: 'notes', label: 'Notes / Special Requests', group: 'Other', default: false },
  { key: 'hotel', label: 'Hotel', group: 'Other', default: false },
];
const FIELD_BY_KEY = new Map(GUEST_FIELDS.map((f) => [f.key, f]));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'In House',
  CHECKED_OUT: 'Checked Out',
  NO_SHOW: 'No Show',
};

/** ID type/number/city from the linked guest, else from older free-text notes (e.g. "ID: Aadhaar Card (1234)"). */
function resolveKyc(row: any) {
  let idType = String(row.idType || '').trim();
  let idNumber = String(row.idNumber || '').trim();
  let city = String(row.address || row.city || '').trim();
  const text = String(row.notes || '');
  if (!idType || !idNumber) {
    const m1 = text.match(/ID:\s*([A-Za-z\s]+?)\s*\(([^)]+)\)/i);
    const m2 = text.match(/(?:Govt\s*ID|ID\s*Proof):\s*([A-Za-z\s]+?)\s*[-:]\s*([A-Za-z0-9\s-]+)/i);
    const m3 = text.match(/(Aadhaar(?: Card)?|Passport|Driving License|Voter ID)[\s:-]+([A-Za-z0-9\s-]+)/i);
    const m = m1 || m2 || m3;
    if (m) {
      if (!idType) idType = m[1].trim();
      if (!idNumber && m[2].trim() !== 'N/A') idNumber = m[2].trim();
    }
  }
  if (!city) {
    const c = text.match(/(?:City|Origin|From|Address):\s*([A-Za-z\s,]+?)(?:\.|$|\n)/i);
    if (c) city = c[1].trim();
  }
  return { idType, idNumber, city };
}

export interface ExportParams {
  hotelId: string;
  from?: string;
  to?: string;
  fields: string[];
}

export function parseExportParams(q: Record<string, string>): ExportParams | { error: string } {
  const { hotelId, from, to } = q;
  if (!hotelId || hotelId === 'all') return { error: 'Please choose one hotel to export.' };
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return { error: 'Dates must be YYYY-MM-DD.' };
  if (from && to && from > to) return { error: '"From" date must be before "To" date.' };
  const fields = (q.fields ? q.fields.split(',') : GUEST_FIELDS.filter((f) => f.default).map((f) => f.key))
    .map((s) => s.trim())
    .filter((k) => FIELD_BY_KEY.has(k));
  if (!fields.length) return { error: 'Select at least one field to export.' };
  return { hotelId, from: from || undefined, to: to || undefined, fields };
}

async function loadRows(p: ExportParams) {
  // Dates are stored as naive local values; show and filter them in Indian time.
  const ist = (col: string) => `CONVERT_TZ(${col}, '+00:00', '+05:30')`;
  const where = ['b.hotelId = ?', "UPPER(b.status) <> 'CANCELLED'"];
  const params: unknown[] = [p.hotelId];
  if (p.from) { where.push(`DATE(${ist('b.checkInDate')}) >= ?`); params.push(p.from); }
  if (p.to) { where.push(`DATE(${ist('b.checkInDate')}) <= ?`); params.push(p.to); }

  const [rows] = (await pool.query(
    `SELECT b.id, b.bookingReference, b.guestName, b.guestPhone, b.guestEmail, b.totalGuests, b.totalRooms,
            DATE_FORMAT(${ist('b.checkInDate')}, '%Y-%m-%d') AS checkInDate,
            DATE_FORMAT(${ist('COALESCE(b.checkInDate, b.createdAt)')}, '%h:%i %p') AS checkInTime,
            DATE_FORMAT(${ist('b.checkOutDate')}, '%Y-%m-%d') AS checkOutDate,
            COALESCE(b.nightsCount, GREATEST(1, DATEDIFF(b.checkOutDate, b.checkInDate))) AS nights,
            b.roomNumber, COALESCE(b.roomCategory, b.roomType) AS roomType,
            b.totalAmount, COALESCE(b.depositPaid, b.advanceAmount, 0) AS advancePaid,
            b.paymentStatus, b.paymentMethod, UPPER(b.status) AS status, b.bookingType, b.eventName, b.notes,
            h.name AS hotelName,
            g.idType, g.idNumber, g.address, g.city, g.nationality
       FROM bookings b
       JOIN hotels h ON h.id = b.hotelId
       LEFT JOIN guests g ON g.id = b.guestId
      WHERE ${where.join(' AND ')}
      ORDER BY b.checkInDate ASC, b.createdAt ASC`,
    params
  )) as any;

  return rows.map((r: any) => {
    const kyc = resolveKyc(r);
    const total = Number(r.totalAmount) || 0;
    const adv = Number(r.advancePaid) || 0;
    const values: Record<string, string | number> = {
      guestName: r.guestName || '',
      guestPhone: r.guestPhone || '',
      numberOfGuests: Number(r.totalGuests) || 1,
      address: kyc.city,
      nationality: r.nationality || 'Indian',
      idType: kyc.idType,
      idNumber: kyc.idNumber,
      guestEmail: r.guestEmail || '',
      checkInDate: r.checkInDate || '',
      checkInTime: r.checkInTime || '',
      checkOutDate: r.checkOutDate || '',
      nights: Number(r.nights) || 1,
      roomNumber: r.roomNumber || '',
      roomType: r.roomType || '',
      rooms: Number(r.totalRooms) || 1,
      bookingStatus: STATUS_LABEL[r.status] || r.status || '',
      totalAmount: total,
      advancePaid: adv,
      balanceDue: Math.max(0, total - adv),
      paymentStatus: r.paymentStatus || '',
      paymentMethod: r.paymentMethod || '',
      bookingReference: r.bookingReference || '',
      bookingType: r.bookingType === 'event' ? `Event${r.eventName ? `: ${r.eventName}` : ''}` : 'Room',
      notes: r.notes || '',
      hotel: r.hotelName || '',
    };
    return values;
  });
}

export function registerReportRoutes(router: MobileRouter, _ctx: MobileContext) {
  router.get('/reports/guests/fields', async (_req, res) => {
    res.json(GUEST_FIELDS);
  });

  router.get('/reports/guests/export', async (req, res) => {
    const p = parseExportParams(req.query);
    if ('error' in p) return res.status(400).json({ error: p.error });

    const [[hotel]] = (await pool.query('SELECT name, code FROM hotels WHERE id = ?', [p.hotelId])) as any;
    if (!hotel) return res.status(404).json({ error: 'Hotel not found.' });
    const rows = await loadRows(p);
    const period = p.from || p.to ? `${p.from ?? 'start'} to ${p.to ?? 'today'}` : 'All dates';

    if (req.query.format === 'json') {
      return res.json({
        success: true,
        hotelId: p.hotelId,
        hotelName: hotel.name,
        period,
        fields: p.fields,
        totalRecords: rows.length,
        records: rows.map((r: Record<string, unknown>) => Object.fromEntries(p.fields.map((k) => [k, r[k]]))),
      });
    }

    // Header rows (hotel, period) then the table with only the selected columns.
    const header = ['S.No', ...p.fields.map((k) => FIELD_BY_KEY.get(k)!.label)];
    const body = rows.map((r: Record<string, unknown>, i: number) => [i + 1, ...p.fields.map((k) => r[k])]);
    const ws = XLSX.utils.aoa_to_sheet([
      [`${hotel.name} - Guest Register`],
      [`Period: ${period}   |   Guests: ${rows.length}   |   Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`],
      [],
      header,
      ...body,
    ]);
    ws['!cols'] = header.map((h, c) => ({
      wch: Math.min(45, Math.max(8, h.length + 2, ...body.map((row: unknown[]) => String(row[c] ?? '').length + 2))),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guest Register');
    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const slug = String(hotel.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const range = p.from || p.to ? `${p.from ?? 'start'}_to_${p.to ?? 'today'}` : 'all_dates';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}_Guest_Register_${range}.xlsx"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  });
}
