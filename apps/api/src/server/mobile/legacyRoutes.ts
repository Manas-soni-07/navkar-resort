// @ts-nocheck
/*
 * Ported verbatim from mobile-nav (branch `manas`) server/routes/api.js @ 8627ca6.
 * Removed here and re-implemented securely in secureRoutes.ts:
 *   POST /auth/login, GET /auth/me, POST /managers, PATCH /managers/:id/password
 * Authentication, hotel isolation and error masking are applied by the
 * dispatcher in src/app/api/m/[...path]/route.ts before any handler runs.
 */
/**
 * ResortOS - Production REST API Routes (TiDB Cloud MySQL)
 * All data is strictly fetched from and persisted to the connected TiDB Cloud database.
 * No mock data, no static arrays, no dummy fallbacks.
 * Hotel-level isolation enforced across all endpoints.
 */

import { MobileRouter } from './router';
import pool from './db';
import * as XLSX from 'xlsx';

const router = new MobileRouter();

// Helper to sanitize input and validate hotel access
function checkHotelAccess(req, res, targetHotelId) {
  const userRole = (req.headers['x-user-role'] || '').toUpperCase();
  const userHotelId = req.headers['x-user-hotel-id'];

  if (userRole === 'MANAGER' && userHotelId && targetHotelId && targetHotelId !== 'all') {
    if (userHotelId !== targetHotelId) {
      res.status(403).json({ error: 'Access Denied: Managers can only access their assigned hotel.' });
      return false;
    }
  }
  return true;
}

// ==========================================
// 1. HEALTH & SYSTEM STATUS
// ==========================================
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  try {
    const [result] = await pool.query('SELECT 1 AS ping, DATABASE() AS currentDb, NOW() as serverTime');
    const latencyMs = Date.now() - startTime;
    const [tables] = await pool.query('SHOW TABLES');

    res.json({
      status: 'ONLINE',
      system: 'ResortOS Core Engine',
      cluster: 'TiDB Cloud Serverless',
      region: 'AWS Tokyo (ap-northeast-1)',
      database: result[0].currentDb,
      serverTime: result[0].serverTime,
      latencyMs: `${latencyMs}ms`,
      totalTables: tables.length,
    });
  } catch (error) {
    res.status(500).json({ status: 'OFFLINE', error: error.message });
  }
});

// 3. HOTEL MANAGEMENT
// ==========================================
router.get('/hotels', async (req, res) => {
  try {
    const [hotels] = await pool.query(`
      SELECT h.*, 
             COALESCE((SELECT COUNT(*) FROM rooms r WHERE r.hotelId = h.id), 0) AS totalRooms,
             COALESCE((SELECT u.fullName FROM users u WHERE u.hotelId = h.id AND u.role = 'MANAGER' LIMIT 1), 'Assigned Property Manager') AS managerName
      FROM hotels h
      WHERE h.id IN ('h-villa', 'h-navkar')
      ORDER BY h.name ASC
    `);

    // Map fields for frontend compatibility
    const mapped = hotels.map((h) => ({
      id: h.id,
      name: h.name,
      code: h.code,
      location: `${h.city || 'Jaipur'}, ${h.state || 'Rajasthan'}`,
      address: h.address,
      city: h.city,
      state: h.state,
      starRating: h.starRating || 4,
      totalRooms: h.totalRooms || (h.id === 'h-villa' ? 15 : 70),
      contactPhone: h.contactPhone || '+91 98290 00000',
      contactEmail: h.contactEmail || `${h.id}@resortos.com`,
      receptionPhone: h.receptionPhone,
      managerName: h.managerName,
      currency: h.currency || 'INR',
      tagline: h.id === 'h-villa' ? 'Boutique Heritage Villa' : 'Palatial Destination Resort',
      checkInTime: h.checkInTime || '12:00 PM',
      checkOutTime: h.checkOutTime || '11:00 AM',
      status: (h.status || 'ACTIVE').toLowerCase(),
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hotels', async (req, res) => {
  try {
    const { name, code, address, city, state, contactPhone, contactEmail, checkInTime, checkOutTime, status } = req.body;
    const id = `h-${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await pool.query(
      `INSERT INTO hotels (id, organizationId, name, slug, code, address, city, state, country, postalCode, contactPhone, contactEmail, checkInTime, checkOutTime, status, createdAt, updatedAt)
       VALUES (?, 'org-resortos', ?, ?, ?, ?, ?, ?, 'India', '302001', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, slug, code || 'HTL', address || '', city || 'Jaipur', state || 'Rajasthan', contactPhone || '', contactEmail || '', checkInTime || '12:00 PM', checkOutTime || '11:00 AM', (status || 'ACTIVE').toUpperCase()]
    );

    res.status(201).json({ success: true, id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/hotels/:id', async (req, res) => {
  try {
    const { name, code, address, city, state, contactPhone, contactEmail, checkInTime, checkOutTime, status } = req.body;
    await pool.query(
      `UPDATE hotels 
       SET name = COALESCE(?, name),
           code = COALESCE(?, code),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           contactPhone = COALESCE(?, contactPhone),
           contactEmail = COALESCE(?, contactEmail),
           checkInTime = COALESCE(?, checkInTime),
           checkOutTime = COALESCE(?, checkOutTime),
           status = COALESCE(?, status),
           updatedAt = NOW()
       WHERE id = ?`,
      [name, code, address, city, state, contactPhone, contactEmail, checkInTime, checkOutTime, status ? status.toUpperCase() : null, req.params.id]
    );
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. MANAGER MANAGEMENT
// ==========================================
router.get('/managers', async (req, res) => {
  try {
    const [managers] = await pool.query(`
      SELECT u.id, u.email, u.fullName, u.phone, u.role, u.status, u.hotelId, h.name as hotelName, u.createdAt
      FROM users u
      LEFT JOIN hotels h ON u.hotelId = h.id
      WHERE u.role = 'MANAGER'
      ORDER BY u.fullName ASC
    `);
    res.json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/managers/:id', async (req, res) => {
  try {
    const { fullName, email, phone, hotelId } = req.body;
    await pool.query(
      'UPDATE users SET fullName = ?, email = ?, phone = ?, hotelId = ?, updatedAt = NOW() WHERE id = ?',
      [fullName, email.trim().toLowerCase(), phone || '', hotelId, req.params.id]
    );
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/managers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?', [status.toUpperCase(), req.params.id]);
    res.json({ success: true, id: req.params.id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 5. ROOM INVENTORY MANAGEMENT
// ==========================================
router.get('/rooms', async (req, res) => {
  try {
    const { hotelId, status } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND hotelId IN ('h-villa', 'h-navkar')";
    }

    if (status && status !== 'ALL') {
      query += ' AND (UPPER(status) = ? OR LOWER(status) = ?)';
      params.push(status.toUpperCase(), status.toLowerCase());
    }
    query += ' ORDER BY CAST(roomNumber AS UNSIGNED) ASC, roomNumber ASC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((r) => {
      const dbStatus = (r.status || 'AVAILABLE').toUpperCase();
      let frontendStatus = 'available';
      if (dbStatus === 'OCCUPIED') frontendStatus = 'occupied';
      else if (dbStatus === 'CLEANING' || dbStatus === 'DIRTY') frontendStatus = 'cleaning';
      else if (dbStatus === 'MAINTENANCE' || dbStatus === 'BLOCKED') frontendStatus = 'maintenance';

      return {
        id: r.id,
        hotelId: r.hotelId,
        roomNumber: r.roomNumber,
        floor: r.floor || 1,
        category: r.category || (r.type === 'DELUXE' ? 'Deluxe Room' : 'Standard Room'),
        ratePerNight: parseFloat(r.ratePerNight || r.basePricePerNight || 2500),
        status: frontendStatus,
        housekeepingStatus: r.housekeepingStatus || (frontendStatus === 'available' ? 'clean' : 'dirty'),
        currentGuestName: r.currentGuestName || undefined,
        currentBookingId: r.currentBookingId || undefined,
        maxOccupancy: r.maxOccupancy || r.capacity || 2,
        amenities: ['AC', 'Wi-Fi', 'Attached Bath', 'LED TV'],
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const { hotelId, roomNumber, floor, category, ratePerNight, status } = req.body;
    const id = `rm-${hotelId === 'h-villa' ? 'v' : 'n'}-${roomNumber}`;
    const rate = parseFloat(ratePerNight) || 2500;

    await pool.query(
      `INSERT INTO rooms (id, hotelId, roomNumber, floor, type, category, basePricePerNight, ratePerNight, status, housekeepingStatus, capacity, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'DELUXE', ?, ?, ?, ?, 'clean', 2, NOW(), NOW())
       ON DUPLICATE KEY UPDATE category=VALUES(category), ratePerNight=VALUES(ratePerNight);`,
      [id, hotelId, roomNumber, floor || 1, category || 'Deluxe Room', rate, rate, (status || 'AVAILABLE').toUpperCase()]
    );

    res.status(201).json({ success: true, id, roomNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/rooms/:id/status', async (req, res) => {
  try {
    const { status, housekeepingStatus, currentGuestName, currentBookingId } = req.body;
    const upperStatus = status ? status.toUpperCase() : 'AVAILABLE';
    const cleanStatus = housekeepingStatus || (upperStatus === 'AVAILABLE' ? 'clean' : 'dirty');

    await pool.query(
      `UPDATE rooms 
       SET status = ?, 
           housekeepingStatus = ?, 
           currentGuestName = ?, 
           currentBookingId = ?, 
           updatedAt = NOW() 
       WHERE id = ?`,
      [upperStatus, cleanStatus, currentGuestName || null, currentBookingId || null, req.params.id]
    );

    res.json({ success: true, id: req.params.id, status: upperStatus, housekeepingStatus: cleanStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. BOOKINGS & RESERVATIONS
// ==========================================
router.get('/bookings', async (req, res) => {
  try {
    const { hotelId, type } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND hotelId IN ('h-villa', 'h-navkar')";
    }

    if (type) {
      query += ' AND bookingType = ?';
      params.push(type);
    }

    query += ' ORDER BY checkInDate ASC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((b) => {
      const dbStatus = (b.status || 'CONFIRMED').toUpperCase();
      let frontendStatus = 'confirmed';
      if (dbStatus === 'CHECKED_IN') frontendStatus = 'checked_in';
      else if (dbStatus === 'CHECKED_OUT') frontendStatus = 'checked_out';
      else if (dbStatus === 'CANCELLED') frontendStatus = 'cancelled';
      else if (dbStatus === 'PENDING') frontendStatus = 'pending';

      const checkInFormatted = b.checkInDate ? new Date(b.checkInDate).toISOString().split('T')[0] : '';
      const checkOutFormatted = b.checkOutDate ? new Date(b.checkOutDate).toISOString().split('T')[0] : '';
      const createdFormatted = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '';

      return {
        id: b.id,
        hotelId: b.hotelId,
        bookingReference: b.bookingReference,
        guestName: b.guestName || 'Guest',
        guestPhone: b.guestPhone || '',
        guestEmail: b.guestEmail || '',
        roomCategory: b.roomCategory || b.roomType || 'Deluxe Room',
        roomId: b.roomId || undefined,
        roomNumber: b.roomNumber || undefined,
        checkInDate: checkInFormatted,
        checkOutDate: checkOutFormatted,
        nightsCount: b.nightsCount || 1,
        numberOfGuests: b.totalGuests || 1,
        status: frontendStatus,
        totalAmount: parseFloat(b.totalAmount || 0),
        depositPaid: parseFloat(b.depositPaid || b.advanceAmount || 0),
        paymentStatus: b.paymentStatus || (parseFloat(b.depositPaid || 0) >= parseFloat(b.totalAmount || 0) ? 'paid' : 'partial'),
        specialRequests: b.notes || '',
        createdAt: createdFormatted,
        bookingType: b.bookingType || 'normal',
        eventName: b.eventName || undefined,
        requiredRooms: b.requiredRooms || 0,
        allocatedRooms: b.allocatedRooms || b.totalRooms || 1,
        remainingRooms: b.remainingRooms || 0,
        roomPrice: parseFloat(b.roomPrice || 0),
        advanceAmount: parseFloat(b.advanceAmount || 0),
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const {
      hotelId,
      bookingType,
      guestName,
      guestPhone,
      guestEmail,
      checkInDate,
      checkOutDate,
      adults,
      children,
      roomType,
      roomId,
      roomNumber,
      totalRooms,
      roomPrice,
      advanceAmount,
      paymentMethod,
      notes,
      eventName,
      requiredRooms,
      allocatedRooms,
      remainingRooms,
    } = req.body;

    const id = `b-${Date.now()}`;
    const code = bookingType === 'event' ? `EVT-${Date.now().toString().slice(-4)}` : `BKG-${Date.now().toString().slice(-4)}`;
    const totalGuests = (parseInt(adults, 10) || 1) + (parseInt(children, 10) || 0);
    const roomsCount = parseInt(totalRooms, 10) || (parseInt(allocatedRooms, 10) || 1);
    const price = parseFloat(roomPrice) || 2500;
    const advance = parseFloat(advanceAmount) || 0;
    const totalAmount = price * roomsCount;

    await pool.query(
      `INSERT INTO bookings 
       (id, hotelId, bookingReference, bookingType, guestName, guestPhone, guestEmail, roomId, roomNumber, roomCategory, roomType, checkInDate, checkOutDate, totalGuests, totalRooms, roomPrice, advanceAmount, depositPaid, totalAmount, paymentMethod, status, paymentStatus, notes, eventName, requiredRooms, allocatedRooms, remainingRooms, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        hotelId,
        code,
        bookingType || 'normal',
        guestName,
        guestPhone || '',
        guestEmail || '',
        roomId || null,
        roomNumber || null,
        roomType || 'Deluxe Room',
        roomType || 'Deluxe Room',
        checkInDate,
        checkOutDate,
        totalGuests,
        roomsCount,
        price,
        advance,
        advance,
        totalAmount,
        paymentMethod || 'UPI',
        advance >= totalAmount ? 'paid' : advance > 0 ? 'partial' : 'unpaid',
        notes || '',
        eventName || null,
        requiredRooms || 0,
        allocatedRooms || roomsCount,
        remainingRooms || 0,
      ]
    );

    res.status(201).json({ success: true, id, bookingReference: code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Walk-in Check-in
router.post('/bookings/walk-in', async (req, res) => {
  try {
    const {
      hotelId,
      guestName,
      guestPhone,
      guestEmail,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      roomId,
      roomNumber,
      roomCategory,
      totalAmount,
      depositPaid,
      paymentMethod,
    } = req.body;

    const id = `b-${Date.now()}`;
    const code = `WIK-${Date.now().toString().slice(-4)}`;
    const totalAmt = parseFloat(totalAmount) || 2500;
    const deposit = parseFloat(depositPaid) || 0;

    await pool.query(
      `INSERT INTO bookings 
       (id, hotelId, bookingReference, bookingType, guestName, guestPhone, guestEmail, roomId, roomNumber, roomCategory, checkInDate, checkOutDate, totalGuests, totalRooms, totalAmount, depositPaid, paymentMethod, status, paymentStatus, createdAt, updatedAt)
       VALUES (?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'CHECKED_IN', ?, NOW(), NOW())`,
      [
        id,
        hotelId,
        code,
        guestName,
        guestPhone || '',
        guestEmail || '',
        roomId,
        roomNumber,
        roomCategory || 'Deluxe Room',
        checkInDate,
        checkOutDate,
        parseInt(numberOfGuests, 10) || 1,
        totalAmt,
        deposit,
        paymentMethod || 'UPI',
        deposit >= totalAmt ? 'paid' : 'partial',
      ]
    );

    if (roomId) {
      await pool.query(
        `UPDATE rooms 
         SET status = 'OCCUPIED', housekeepingStatus = 'clean', currentGuestName = ?, currentBookingId = ?, updatedAt = NOW() 
         WHERE id = ?`,
        [guestName, id, roomId]
      );
    }

    const folioId = `fol-${Date.now()}`;
    const invoiceNum = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const tax = Math.round(totalAmt * 0.18);
    const grandTotal = totalAmt + tax;
    const balance = Math.max(0, grandTotal - deposit);

    await pool.query(
      `INSERT INTO invoices 
       (id, hotelId, bookingId, invoiceNumber, subtotal, taxAmount, totalAmount, paidAmount, balanceDue, status, guestName, roomNumber, itemsJson, issuedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?, NOW())`,
      [
        folioId,
        hotelId,
        id,
        invoiceNum,
        totalAmt,
        tax,
        grandTotal,
        deposit,
        balance,
        guestName,
        roomNumber,
        JSON.stringify([
          { id: `ch-${Date.now()}`, description: `${roomCategory || 'Room Rent'}`, category: 'room', amount: totalAmt, date: checkInDate },
        ]),
      ]
    );

    res.status(201).json({ success: true, id, bookingReference: code, folioId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check-in guest
router.patch('/bookings/:id/checkin', async (req, res) => {
  try {
    const { roomId, roomNumber, guestKyc } = req.body;
    const bookingId = req.params.id;

    const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookings[0];

    const targetRoomId = roomId || b.roomId;
    const targetRoomNumber = roomNumber || b.roomNumber;

    // If guestKyc provided, persist to guests table and link to booking
    if (guestKyc && (guestKyc.idNumber || guestKyc.idType || guestKyc.cityOfOrigin)) {
      if (b.guestId) {
        await pool.query(
          `UPDATE guests 
           SET idType = COALESCE(?, idType), idNumber = COALESCE(?, idNumber), city = COALESCE(?, city), updatedAt = NOW()
           WHERE id = ?`,
          [guestKyc.idType || null, guestKyc.idNumber || null, guestKyc.cityOfOrigin || null, b.guestId]
        );
      } else {
        const newGuestId = `gst-${Date.now()}`;
        const nameParts = (b.guestName || '').trim().split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || '';
        await pool.query(
          `INSERT INTO guests (id, organizationId, firstName, lastName, email, phone, idType, idNumber, nationality, city, country, createdAt, updatedAt)
           VALUES (?, 'org-resortos', ?, ?, ?, ?, ?, ?, 'Indian', ?, 'India', NOW(), NOW())`,
          [
            newGuestId,
            firstName,
            lastName,
            b.guestEmail || '',
            b.guestPhone || '',
            guestKyc.idType || null,
            guestKyc.idNumber || null,
            guestKyc.cityOfOrigin || null,
          ]
        );
        b.guestId = newGuestId;
      }
    }

    await pool.query(
      `UPDATE bookings 
       SET status = 'CHECKED_IN', roomId = COALESCE(?, roomId), roomNumber = COALESCE(?, roomNumber), guestId = COALESCE(?, guestId), updatedAt = NOW() 
       WHERE id = ?`,
      [roomId, roomNumber, b.guestId || null, bookingId]
    );

    if (targetRoomId) {
      await pool.query(
        `UPDATE rooms 
         SET status = 'OCCUPIED', housekeepingStatus = 'clean', currentGuestName = ?, currentBookingId = ?, updatedAt = NOW() 
         WHERE id = ?`,
        [b.guestName, bookingId, targetRoomId]
      );
    }

    const [existing] = await pool.query('SELECT id FROM invoices WHERE bookingId = ?', [bookingId]);
    if (existing.length === 0) {
      const folioId = `fol-${Date.now()}`;
      const invoiceNum = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const total = parseFloat(b.totalAmount || 2500);
      const tax = Math.round(total * 0.18);
      const grandTotal = total + tax;
      const paid = parseFloat(b.depositPaid || 0);
      const balance = Math.max(0, grandTotal - paid);

      await pool.query(
        `INSERT INTO invoices 
         (id, hotelId, bookingId, invoiceNumber, subtotal, taxAmount, totalAmount, paidAmount, balanceDue, status, guestName, roomNumber, itemsJson, issuedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?, NOW())`,
        [
          folioId,
          b.hotelId,
          bookingId,
          invoiceNum,
          total,
          tax,
          grandTotal,
          paid,
          balance,
          b.guestName,
          targetRoomNumber,
          JSON.stringify([
            { id: `ch-${Date.now()}`, description: `${b.roomType || 'Room Rent'}`, category: 'room', amount: total, date: new Date().toISOString().split('T')[0] },
          ]),
        ]
      );
    }

    res.json({ success: true, bookingId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check-out guest
router.patch('/bookings/:id/checkout', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookings[0];

    await pool.query('UPDATE bookings SET status = "CHECKED_OUT", updatedAt = NOW() WHERE id = ?', [bookingId]);

    if (b.roomId) {
      await pool.query(
        `UPDATE rooms 
         SET status = 'CLEANING', housekeepingStatus = 'dirty', currentGuestName = NULL, currentBookingId = NULL, updatedAt = NOW() 
         WHERE id = ?`,
        [b.roomId]
      );
    }

    await pool.query(
      `UPDATE invoices 
       SET status = 'PAID', balanceDue = 0, settledAt = CONCAT(DATE_FORMAT(NOW(), '%h:%i %p'), ' (Checkout)') 
       WHERE bookingId = ?`,
      [bookingId]
    );

    res.json({ success: true, bookingId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reassign room
router.patch('/bookings/:id/reassign', async (req, res) => {
  try {
    const { newRoomId, newRoomNumber, newCategory } = req.body;
    const bookingId = req.params.id;

    const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookings[0];

    if (b.roomId && b.status === 'CHECKED_IN') {
      await pool.query(
        `UPDATE rooms SET status = 'AVAILABLE', currentGuestName = NULL, currentBookingId = NULL, updatedAt = NOW() WHERE id = ?`,
        [b.roomId]
      );
    }

    if (b.status === 'CHECKED_IN') {
      await pool.query(
        `UPDATE rooms SET status = 'OCCUPIED', currentGuestName = ?, currentBookingId = ?, updatedAt = NOW() WHERE id = ?`,
        [b.guestName, bookingId, newRoomId]
      );
    }

    await pool.query(
      `UPDATE bookings SET roomId = ?, roomNumber = ?, roomCategory = ?, updatedAt = NOW() WHERE id = ?`,
      [newRoomId, newRoomNumber, newCategory || 'Deluxe Room', bookingId]
    );

    res.json({ success: true, bookingId, newRoomNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel booking
router.patch('/bookings/:id/cancel', async (req, res) => {
  try {
    const bookingId = req.params.id;
    await pool.query('UPDATE bookings SET status = "CANCELLED", updatedAt = NOW() WHERE id = ?', [bookingId]);
    res.json({ success: true, bookingId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. STAFF MANAGEMENT
// ==========================================
router.get('/staff', async (req, res) => {
  try {
    const { hotelId } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = 'SELECT * FROM staff WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND hotelId IN ('h-villa', 'h-navkar')";
    }

    query += ' ORDER BY fullName ASC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((s) => ({
      id: s.id,
      hotelId: s.hotelId,
      employeeCode: s.employeeCode,
      fullName: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff Member',
      role: s.role || s.designation || 'Staff',
      department: s.department || 'Front Desk',
      shift: s.shift || 'Morning',
      status: (s.status || 'present').toLowerCase(),
      checkInTime: s.checkInTime || undefined,
      phone: s.phone || '',
      monthlySalary: parseFloat(s.monthlySalary || s.baseSalary || 15000),
      joinDate: s.joinDate ? new Date(s.joinDate).toISOString().split('T')[0] : '2025-01-01',
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { hotelId, fullName, phone, role, department, shift, monthlySalary, joinDate } = req.body;
    const id = `stf-${Date.now()}`;
    const code = `EMP-${hotelId === 'h-villa' ? 'TV' : 'NP'}-${Date.now().toString().slice(-4)}`;
    const names = (fullName || 'Staff Member').split(' ');
    const first = names[0] || 'Staff';
    const last = names.slice(1).join(' ') || 'Member';
    const salary = parseFloat(monthlySalary) || 15000;

    await pool.query(
      `INSERT INTO staff 
       (id, hotelId, employeeCode, firstName, lastName, fullName, designation, role, department, shift, monthlySalary, baseSalary, status, phone, joinDate, joiningDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', ?, ?, ?, NOW(), NOW())`,
      [
        id,
        hotelId,
        code,
        first,
        last,
        fullName,
        role || 'Staff',
        role || 'Staff',
        department || 'Front Desk',
        shift || 'Morning',
        salary,
        salary,
        phone || '',
        joinDate || new Date().toISOString().split('T')[0],
        joinDate || new Date().toISOString().split('T')[0],
      ]
    );

    res.status(201).json({ success: true, id, employeeCode: code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const { fullName, role, department, shift, monthlySalary, phone, status, checkInTime } = req.body;
    await pool.query(
      `UPDATE staff 
       SET fullName = COALESCE(?, fullName),
           role = COALESCE(?, role),
           designation = COALESCE(?, designation),
           department = COALESCE(?, department),
           shift = COALESCE(?, shift),
           monthlySalary = COALESCE(?, monthlySalary),
           phone = COALESCE(?, phone),
           status = COALESCE(?, status),
           checkInTime = COALESCE(?, checkInTime),
           updatedAt = NOW()
       WHERE id = ?`,
      [fullName, role, role, department, shift, monthlySalary ? parseFloat(monthlySalary) : null, phone, status, checkInTime, req.params.id]
    );
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. ATTENDANCE MANAGEMENT
// ==========================================
router.get('/attendance', async (req, res) => {
  try {
    const { hotelId, date } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT a.*, s.fullName, s.role, s.department, s.employeeCode
      FROM attendances a
      JOIN staff s ON a.staffId = s.id
      WHERE DATE(a.date) = ?
    `;
    const params = [targetDate];

    if (hotelId && hotelId !== 'all') {
      query += ' AND a.hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND a.hotelId IN ('h-villa', 'h-navkar')";
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { staffId, hotelId, status, checkInTime, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const attId = `att-${staffId}-${targetDate}`;

    await pool.query(
      `UPDATE staff SET status = ?, checkInTime = ?, updatedAt = NOW() WHERE id = ?`,
      [status, checkInTime || '08:00 AM', staffId]
    );

    await pool.query(
      `INSERT INTO attendances (id, staffId, hotelId, date, checkIn, checkInTime, status, createdAt)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, NOW())
       ON DUPLICATE KEY UPDATE status = VALUES(status), checkInTime = VALUES(checkInTime);`,
      [attId, staffId, hotelId, targetDate, checkInTime || '08:00 AM', status]
    );

    res.json({ success: true, staffId, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. SALARY ADVANCES & PAYROLL
// ==========================================
router.get('/salary-advances', async (req, res) => {
  try {
    const { hotelId } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = `
      SELECT sa.*, s.fullName as staffFullName, s.role as staffRoleTitle
      FROM staff_advances sa
      LEFT JOIN staff s ON sa.staffId = s.id
      WHERE 1=1
    `;
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND sa.hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND sa.hotelId IN ('h-villa', 'h-navkar')";
    }

    query += ' ORDER BY sa.advanceDate DESC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((a) => ({
      id: a.id,
      hotelId: a.hotelId,
      staffId: a.staffId,
      staffName: a.staffName || a.staffFullName || 'Staff Member',
      staffRole: a.staffRole || a.staffRoleTitle || 'Staff',
      advanceDate: a.advanceDate ? new Date(a.advanceDate).toISOString().split('T')[0] : '',
      amount: parseFloat(a.amount || 0),
      reason: a.reason || 'General expense',
      paymentMethod: a.paymentMethod || 'Cash',
      isDeducted: Boolean(a.isDeducted),
      deductedMonth: a.deductedMonth || (a.isDeducted ? 'Settled' : 'Pending'),
      notes: a.notes || '',
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/salary-advances', async (req, res) => {
  try {
    const { hotelId, staffId, staffName, staffRole, advanceDate, amount, reason, paymentMethod } = req.body;
    const id = `adv-${Date.now()}`;
    const advDate = advanceDate || new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO staff_advances 
       (id, hotelId, staffId, staffName, staffRole, advanceDate, requestDate, approvedDate, amount, reason, paymentMethod, status, isDeducted, deductedMonth, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', FALSE, 'Pending', ?)`,
      [
        id,
        hotelId,
        staffId || id,
        staffName || 'Staff Member',
        staffRole || 'Staff',
        advDate,
        advDate,
        advDate,
        parseFloat(amount) || 0,
        reason || 'Personal Expense',
        paymentMethod || 'Cash',
        `Advance of ₹${amount} logged`,
      ]
    );

    res.status(201).json({ success: true, id, amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/salary-advances/:id/toggle-deducted', async (req, res) => {
  try {
    const { isDeducted, deductedMonth } = req.body;
    await pool.query(
      'UPDATE staff_advances SET isDeducted = ?, deductedMonth = ? WHERE id = ?',
      [Boolean(isDeducted), deductedMonth || (isDeducted ? 'Settled' : 'Pending'), req.params.id]
    );
    res.json({ success: true, id: req.params.id, isDeducted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/salaries', async (req, res) => {
  try {
    const { hotelId } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let staffQuery = 'SELECT s.*, h.name as hotelName FROM staff s LEFT JOIN hotels h ON s.hotelId = h.id WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      staffQuery += ' AND s.hotelId = ?';
      params.push(hotelId);
    } else {
      staffQuery += " AND s.hotelId IN ('h-villa', 'h-navkar')";
    }

    const [staffList] = await pool.query(staffQuery, params);

    const [advances] = await pool.query(`SELECT staffId, SUM(amount) as totalAdv FROM staff_advances WHERE isDeducted = FALSE GROUP BY staffId`);
    const advMap = {};
    advances.forEach((a) => { advMap[a.staffId] = parseFloat(a.totalAdv || 0); });

    const [paidRecords] = await pool.query(`SELECT staffId, status FROM salary_payments WHERE month = 11 AND year = 2026`);
    const paidMap = {};
    paidRecords.forEach((p) => { paidMap[p.staffId] = p.status; });

    const rows = staffList.map((s, idx) => {
      const base = parseFloat(s.monthlySalary || s.baseSalary || 15000);
      const adv = advMap[s.id] || 0;
      const isPaid = paidMap[s.id] === 'PAID';

      return {
        id: `sal-${s.id}`,
        staffId: s.id,
        staffName: s.fullName || 'Staff Member',
        role: s.role || 'Staff',
        hotelId: s.hotelId,
        hotelName: s.hotelName || (s.hotelId === 'h-villa' ? 'THE VILLA' : 'NAVKAR PALACE & RESORT'),
        baseSalary: base,
        totalDays: 30,
        presentDays: idx % 2 === 0 ? 30 : 28,
        halfDays: idx % 2 === 0 ? 0 : 1,
        absentDays: idx % 2 === 0 ? 0 : 1,
        advanceDeductions: adv,
        status: isPaid ? 'PAID' : 'PENDING',
      };
    });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/salaries/pay', async (req, res) => {
  try {
    const { staffId, hotelId, netAmount, month, year } = req.body;
    const id = `sp-${staffId}-${month || 11}-${year || 2026}`;

    await pool.query(
      `INSERT INTO salary_payments (id, staffId, hotelId, month, year, baseSalary, netAmount, status, paidAt, paymentMethod)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', NOW(), 'BANK_TRANSFER')
       ON DUPLICATE KEY UPDATE status = 'PAID', paidAt = NOW();`,
      [id, staffId, hotelId || 'h-villa', month || 11, year || 2026, parseFloat(netAmount) || 15000, parseFloat(netAmount) || 15000]
    );

    await pool.query('UPDATE staff_advances SET isDeducted = TRUE, deductedMonth = "Nov 2026" WHERE staffId = ?', [staffId]);

    res.json({ success: true, id, status: 'PAID' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. EXPENSES MANAGEMENT
// ==========================================
router.get('/expenses', async (req, res) => {
  try {
    const { hotelId, category } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND hotelId IN ('h-villa', 'h-navkar')";
    }

    if (category && category !== 'ALL') {
      query += ' AND (UPPER(category) = ? OR category = ?)';
      params.push(category.toUpperCase(), category);
    }

    query += ' ORDER BY expenseDate DESC, createdAt DESC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((e) => {
      let cat = 'Misc';
      const cUpper = (e.category || '').toUpperCase();
      if (cUpper === 'UTILITIES') cat = 'Electricity';
      else if (cUpper === 'SUPPLIES') cat = 'Supplies';
      else if (cUpper === 'MAINTENANCE') cat = 'Maintenance';
      else if (cUpper === 'FOOD_BEVERAGE') cat = 'Food & Beverage';
      else cat = e.category || 'Misc';

      return {
        id: e.id,
        hotelId: e.hotelId,
        hotelName: e.hotelId === 'h-villa' ? 'THE VILLA' : 'NAVKAR PALACE & RESORT',
        title: e.title || 'Expense',
        category: cat,
        amount: parseFloat(e.amount || 0),
        vendor: e.vendor || e.paidTo || 'Supplier',
        recordedBy: e.recordedBy || 'Manager',
        date: e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMethod: e.paymentMethod || 'UPI',
        description: e.description || '',
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { hotelId, category, title, amount, paymentMethod, expenseDate, vendor, description } = req.body;
    const id = `exp-${Date.now()}`;

    let dbCategory = 'SUPPLIES';
    const cUpper = (category || '').toUpperCase();
    if (cUpper.includes('ELECTRIC') || cUpper.includes('POWER') || cUpper.includes('WATER') || cUpper.includes('UTIL')) {
      dbCategory = 'UTILITIES';
    } else if (cUpper.includes('MAINT') || cUpper.includes('REPAIR')) {
      dbCategory = 'MAINTENANCE';
    } else if (cUpper.includes('FOOD') || cUpper.includes('BEV')) {
      dbCategory = 'FOOD_BEVERAGE';
    }

    let dbPayment = 'UPI';
    const pUpper = (paymentMethod || '').toUpperCase();
    if (pUpper.includes('CASH')) dbPayment = 'CASH';
    else if (pUpper.includes('BANK')) dbPayment = 'BANK_TRANSFER';
    else if (pUpper.includes('CARD')) dbPayment = 'CREDIT_CARD';

    await pool.query(
      `INSERT INTO expenses (id, hotelId, category, title, amount, paymentMethod, expenseDate, incurredAt, vendor, paidTo, recordedBy, description, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'Manager', ?, NOW())`,
      [
        id,
        hotelId,
        dbCategory,
        title || 'Operational Expense',
        parseFloat(amount) || 0,
        dbPayment,
        expenseDate || new Date().toISOString().split('T')[0],
        vendor || '',
        vendor || '',
        description || '',
      ]
    );

    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 11. BILLING & INVOICES (FOLIOS)
// ==========================================
router.get('/folios', async (req, res) => {
  try {
    const { hotelId, status } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (hotelId && hotelId !== 'all') {
      query += ' AND hotelId = ?';
      params.push(hotelId);
    } else {
      query += " AND hotelId IN ('h-villa', 'h-navkar')";
    }

    if (status && status !== 'ALL') {
      const dbStatus = status.toLowerCase() === 'settled' ? 'PAID' : 'ISSUED';
      query += ' AND status = ?';
      params.push(dbStatus);
    }

    query += ' ORDER BY issuedAt DESC';

    const [rows] = await pool.query(query, params);

    const mapped = rows.map((inv) => {
      let items = [];
      try {
        items = typeof inv.itemsJson === 'string' ? JSON.parse(inv.itemsJson) : (inv.itemsJson || []);
      } catch (e) {
        items = [];
      }

      const total = parseFloat(inv.totalAmount || 0);
      const paid = parseFloat(inv.paidAmount || 0);
      const balance = parseFloat(inv.balanceDue || Math.max(0, total - paid));
      const isSettled = inv.status === 'PAID' || balance <= 0;

      return {
        id: inv.id,
        hotelId: inv.hotelId,
        invoiceNumber: inv.invoiceNumber,
        bookingId: inv.bookingId,
        guestName: inv.guestName || 'Guest',
        roomNumber: inv.roomNumber || '101',
        status: isSettled ? 'settled' : 'open',
        items,
        subtotal: parseFloat(inv.subtotal || total * 0.85),
        taxAmount: parseFloat(inv.taxAmount || total * 0.18),
        totalAmount: total,
        paidAmount: paid,
        balanceDue: balance,
        createdAt: inv.issuedAt ? new Date(inv.issuedAt).toISOString().split('T')[0] : '',
        settledAt: inv.settledAt || undefined,
        paymentMethod: inv.paymentMethod || undefined,
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/folios/:id/items', async (req, res) => {
  try {
    const { description, category, amount, date } = req.body;
    const folioId = req.params.id;

    const [invoices] = await pool.query('SELECT * FROM invoices WHERE id = ?', [folioId]);
    if (invoices.length === 0) return res.status(404).json({ error: 'Folio not found' });
    const inv = invoices[0];

    let items = [];
    try {
      items = typeof inv.itemsJson === 'string' ? JSON.parse(inv.itemsJson) : (inv.itemsJson || []);
    } catch (e) {}

    const newItem = {
      id: `ch-${Date.now()}`,
      description,
      category,
      amount: parseFloat(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
    };

    items.push(newItem);
    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const balance = Math.max(0, total - parseFloat(inv.paidAmount || 0));

    await pool.query(
      `UPDATE invoices 
       SET itemsJson = ?, subtotal = ?, taxAmount = ?, totalAmount = ?, balanceDue = ? 
       WHERE id = ?`,
      [JSON.stringify(items), subtotal, tax, total, balance, folioId]
    );

    res.json({ success: true, folioId, newItem, totalAmount: total, balanceDue: balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/folios/:id/settle', async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const folioId = req.params.id;

    const [invoices] = await pool.query('SELECT * FROM invoices WHERE id = ?', [folioId]);
    if (invoices.length === 0) return res.status(404).json({ error: 'Folio not found' });
    const inv = invoices[0];

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await pool.query(
      `UPDATE invoices 
       SET status = 'PAID', paidAmount = totalAmount, balanceDue = 0, settledAt = ?, paymentMethod = ? 
       WHERE id = ?`,
      [timeStr, paymentMethod || 'UPI', folioId]
    );

    const paymentId = `pmt-${Date.now()}`;
    const txRef = `TXN-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO payments (id, hotelId, bookingId, invoiceId, transactionReference, amount, currency, paymentMethod, status, paidAt)
       VALUES (?, ?, ?, ?, ?, ?, 'INR', 'UPI', 'COMPLETED', NOW())`,
      [paymentId, inv.hotelId, inv.bookingId, folioId, txRef, inv.totalAmount]
    );

    res.json({ success: true, folioId, status: 'settled', paidAmount: inv.totalAmount, settledAt: timeStr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. BANQUETS, DINING, HOUSEKEEPING, SPA, CONCIERGE, HANDOVER
// ==========================================
router.get('/banquets', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM banquet_events WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY eventDate ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/banquets', async (req, res) => {
  try {
    const { hotelId, eventName, eventType, clientName, clientPhone, venueName, eventDate, guestCount, perPlateRate, cateringType, totalAmount, depositPaid } = req.body;
    const id = `ev-${Date.now()}`;
    await pool.query(
      `INSERT INTO banquet_events (id, hotelId, eventName, eventType, clientName, clientPhone, venueName, eventDate, guestCount, perPlateRate, cateringType, totalAmount, depositPaid, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
      [id, hotelId, eventName, eventType, clientName, clientPhone, venueName, eventDate, guestCount, perPlateRate, cateringType, totalAmount, depositPaid]
    );
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dining/orders', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM dining_orders WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/dining/orders', async (req, res) => {
  try {
    const { hotelId, roomNumber, guestName, items, subtotal, gstAmount, totalAmount, dietaryNote } = req.body;
    const id = `ord-${Date.now()}`;
    const orderNum = `KOT-2026-${Math.floor(100 + Math.random() * 900)}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await pool.query(
      `INSERT INTO dining_orders (id, hotelId, orderNumber, roomNumber, guestName, itemsJson, subtotal, gstAmount, totalAmount, status, dietaryNote, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`,
      [id, hotelId, orderNum, roomNumber, guestName, JSON.stringify(items || []), subtotal, gstAmount, totalAmount, dietaryNote || '', timeStr]
    );
    res.status(201).json({ success: true, id, orderNumber: orderNum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/housekeeping/tickets', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM housekeeping_tickets WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/housekeeping/tickets', async (req, res) => {
  try {
    const { hotelId, roomNumber, ticketType, priority, assignedStaffName, notes } = req.body;
    const id = `tkt-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await pool.query(
      `INSERT INTO housekeeping_tickets (id, hotelId, roomNumber, ticketType, priority, assignedStaffName, status, requestedTime, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
      [id, hotelId, roomNumber, ticketType, priority || 'normal', assignedStaffName, timeStr, notes || '']
    );
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spa/treatments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spa_treatments');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spa/bookings', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM spa_bookings WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY date DESC, timeSlot ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/spa/bookings', async (req, res) => {
  try {
    const { hotelId, roomNumber, guestName, treatmentName, therapistName, treatmentRoom, timeSlot, date, price, healthNotes } = req.body;
    const id = `sb-${Date.now()}`;
    const ref = `SPA-2026-${Math.floor(100 + Math.random() * 900)}`;
    const cost = parseFloat(price) || 4500;
    const gst = Math.round(cost * 0.18);
    const total = cost + gst;

    await pool.query(
      `INSERT INTO spa_bookings (id, hotelId, bookingRef, roomNumber, guestName, treatmentName, therapistName, treatmentRoom, timeSlot, date, price, gstAmount, totalAmount, status, healthNotes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, NOW())`,
      [id, hotelId, ref, roomNumber, guestName, treatmentName, therapistName, treatmentRoom, timeSlot, date, cost, gst, total, healthNotes || '']
    );
    res.status(201).json({ success: true, id, bookingRef: ref });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/concierge/excursions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM excursion_packages');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/concierge/bookings', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM concierge_bookings WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY date DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/concierge/bookings', async (req, res) => {
  try {
    const { hotelId, roomNumber, guestName, serviceTitle, category, driverOrGuideName, vehicleOrVesselNumber, pickupTime, date, numberOfGuests, totalAmount, notes } = req.body;
    const id = `cb-${Date.now()}`;
    const ref = `CON-2026-${Math.floor(100 + Math.random() * 900)}`;
    const total = parseFloat(totalAmount) || 3200;
    const gst = Math.round(total * 0.18);

    await pool.query(
      `INSERT INTO concierge_bookings (id, hotelId, bookingRef, roomNumber, guestName, serviceTitle, category, driverOrGuideName, vehicleOrVesselNumber, pickupTime, date, numberOfGuests, totalAmount, gstAmount, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, NOW())`,
      [id, hotelId, ref, roomNumber, guestName, serviceTitle, category || 'Excursion', driverOrGuideName, vehicleOrVesselNumber, pickupTime, date, numberOfGuests || 1, total, gst, notes || '']
    );
    res.status(201).json({ success: true, id, bookingRef: ref });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/shift-handovers', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let query = 'SELECT * FROM shift_handovers WHERE 1=1';
    const params = [];
    if (hotelId && hotelId !== 'all') { query += ' AND hotelId = ?'; params.push(hotelId); }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shift-handovers', async (req, res) => {
  try {
    const { hotelId, outgoingManagerName, incomingManagerName, shiftFrom, shiftTo, frontDeskCashCollected, upiSettlementsCount, upiSettlementsAmount, pendingGuestRequestsCount, vipGuestsInHouse, keyHandoversNotes } = req.body;
    const id = `sh-${Date.now()}`;
    const timeFormatted = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`;

    await pool.query(
      `INSERT INTO shift_handovers (id, hotelId, outgoingManagerName, incomingManagerName, shiftFrom, shiftTo, timestamp, frontDeskCashCollected, upiSettlementsCount, upiSettlementsAmount, pendingGuestRequestsCount, vipGuestsInHouse, keyHandoversNotes, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
      [
        id,
        hotelId,
        outgoingManagerName,
        incomingManagerName,
        shiftFrom,
        shiftTo,
        timeFormatted,
        parseFloat(frontDeskCashCollected) || 0,
        parseInt(upiSettlementsCount, 10) || 0,
        parseFloat(upiSettlementsAmount) || 0,
        parseInt(pendingGuestRequestsCount, 10) || 0,
        JSON.stringify(vipGuestsInHouse || []),
        keyHandoversNotes || '',
      ]
    );
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 13. REAL-TIME DASHBOARD KPIS & DAILY SUMMARY
// ==========================================
router.get('/dashboard/kpis', async (req, res) => {
  try {
    const { hotelId } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let roomWhere = "hotelId IN ('h-villa', 'h-navkar')";
    let bookWhere = "hotelId IN ('h-villa', 'h-navkar')";
    const params = [];

    if (hotelId && hotelId !== 'all') {
      roomWhere = 'hotelId = ?';
      bookWhere = 'hotelId = ?';
      params.push(hotelId);
    }

    const [roomCounts] = await pool.query(
      `SELECT 
         COUNT(*) as totalRooms,
         SUM(CASE WHEN UPPER(status) = 'OCCUPIED' THEN 1 ELSE 0 END) as occupiedRooms,
         SUM(CASE WHEN UPPER(status) IN ('CLEANING', 'DIRTY') THEN 1 ELSE 0 END) as cleaningRooms,
         SUM(CASE WHEN UPPER(status) IN ('MAINTENANCE', 'BLOCKED') THEN 1 ELSE 0 END) as maintenanceRooms,
         SUM(CASE WHEN UPPER(status) = 'AVAILABLE' THEN 1 ELSE 0 END) as availableRooms
       FROM rooms 
       WHERE ${roomWhere}`,
      params
    );

    const rc = roomCounts[0] || {};
    const totalRooms = parseInt(rc.totalRooms || 0, 10);
    const occupiedRooms = parseInt(rc.occupiedRooms || 0, 10);
    const cleaningRooms = parseInt(rc.cleaningRooms || 0, 10);
    const maintenanceRooms = parseInt(rc.maintenanceRooms || 0, 10);
    const availableRooms = parseInt(rc.availableRooms || 0, 10);
    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const [bookingCounts] = await pool.query(
      `SELECT 
         SUM(CASE WHEN DATE(checkInDate) = ? AND UPPER(status) != 'CANCELLED' THEN 1 ELSE 0 END) as todayCheckIns,
         SUM(CASE WHEN DATE(checkOutDate) = ? AND UPPER(status) != 'CANCELLED' THEN 1 ELSE 0 END) as todayCheckOuts,
         SUM(CASE WHEN (DATE(createdAt) = ? OR DATE(checkInDate) = ?) AND UPPER(status) != 'CANCELLED' THEN 1 ELSE 0 END) as todayBookings
       FROM bookings 
       WHERE ${bookWhere}`,
      [todayStr, todayStr, todayStr, todayStr, ...(hotelId && hotelId !== 'all' ? [hotelId] : [])]
    );

    const bc = bookingCounts[0] || {};

    res.json({
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      todayCheckIns: parseInt(bc.todayCheckIns || 0, 10),
      todayCheckOuts: parseInt(bc.todayCheckOuts || 0, 10),
      todayBookings: parseInt(bc.todayBookings || 0, 10),
      occupancyPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/daily-summary', async (req, res) => {
  try {
    const { hotelId } = req.query;
    if (!checkHotelAccess(req, res, hotelId)) return;

    let filter = "hotelId IN ('h-villa', 'h-navkar')";
    const params = [];
    if (hotelId && hotelId !== 'all') {
      filter = 'hotelId = ?';
      params.push(hotelId);
    }

    const [invoiceAgg] = await pool.query(
      `SELECT 
         SUM(CASE WHEN status = 'PAID' THEN totalAmount ELSE 0 END) as settledRevenue,
         SUM(paidAmount) as totalCollections,
         SUM(balanceDue) as pendingPayments
       FROM invoices 
       WHERE ${filter}`,
      params
    );

    const [expenseAgg] = await pool.query(
      `SELECT SUM(amount) as totalExpenses FROM expenses WHERE ${filter}`,
      params
    );

    const [roomRevenueAgg] = await pool.query(
      `SELECT SUM(ratePerNight) as roomRev, COUNT(*) as totalRooms, SUM(CASE WHEN UPPER(status) = 'OCCUPIED' THEN 1 ELSE 0 END) as occRooms FROM rooms WHERE ${filter}`,
      params
    );

    const settledRevenue = parseFloat(invoiceAgg[0]?.settledRevenue || 0);
    const collections = parseFloat(invoiceAgg[0]?.totalCollections || 0);
    const outstanding = parseFloat(invoiceAgg[0]?.pendingPayments || 0);
    const expensesTotal = parseFloat(expenseAgg[0]?.totalExpenses || 0);
    const roomRev = parseFloat(roomRevenueAgg[0]?.roomRev || 0);
    const totalRooms = parseInt(roomRevenueAgg[0]?.totalRooms || 0, 10);
    const occRooms = parseInt(roomRevenueAgg[0]?.occRooms || 0, 10);

    const grossRevenue = roomRev + settledRevenue;
    const netIncome = Math.max(0, collections - expensesTotal);
    const adr = occRooms > 0 ? Math.round(grossRevenue / occRooms) : 0;
    const revPar = totalRooms > 0 ? Math.round(grossRevenue / totalRooms) : 0;
    const occupancyRate = totalRooms > 0 ? `${((occRooms / totalRooms) * 100).toFixed(1)}%` : '0.0%';

    res.json({
      totalRooms,
      occupiedRooms: occRooms,
      availableRooms: Math.max(0, totalRooms - occRooms),
      grossRevenue,
      actualCollections: collections,
      outstandingPayments: outstanding,
      totalExpenses: expensesTotal,
      netOperatingIncome: netIncome,
      adr,
      revPar,
      occupancyRate,
      occupancyPercentage: totalRooms > 0 ? Math.round((occRooms / totalRooms) * 100) : 0,
      rawGrossRevenue: grossRevenue,
      rawNetIncome: netIncome,
      rawExpenses: expensesTotal,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 14. CLOUD SYNC LIVE SUMMARY
// ==========================================
router.get('/sync/summary', async (req, res) => {
  try {
    const [hotels] = await pool.query("SELECT COUNT(*) as c FROM hotels WHERE id IN ('h-villa', 'h-navkar')");
    const [rooms] = await pool.query("SELECT COUNT(*) as c FROM rooms WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [bookings] = await pool.query("SELECT COUNT(*) as c FROM bookings WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [staff] = await pool.query("SELECT COUNT(*) as c FROM staff WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [advances] = await pool.query("SELECT COUNT(*) as c FROM staff_advances WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [expenses] = await pool.query("SELECT COUNT(*) as c FROM expenses WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [banquets] = await pool.query("SELECT COUNT(*) as c FROM banquet_events WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [dining] = await pool.query("SELECT COUNT(*) as c FROM dining_orders WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [housekeeping] = await pool.query("SELECT COUNT(*) as c FROM housekeeping_tickets WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [spa] = await pool.query("SELECT COUNT(*) as c FROM spa_bookings WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [concierge] = await pool.query("SELECT COUNT(*) as c FROM concierge_bookings WHERE hotelId IN ('h-villa', 'h-navkar')");
    const [shift] = await pool.query("SELECT COUNT(*) as c FROM shift_handovers WHERE hotelId IN ('h-villa', 'h-navkar')");

    res.json({
      status: 'SYNCHRONIZED',
      system: 'ResortOS Production',
      timestamp: new Date().toISOString(),
      counts: {
        hotels: hotels[0].c,
        rooms: rooms[0].c,
        bookings: bookings[0].c,
        staff: staff[0].c,
        staffAdvances: advances[0].c,
        expenses: expenses[0].c,
        banquets: banquets[0].c,
        diningOrders: dining[0].c,
        housekeepingTickets: housekeeping[0].c,
        spaBookings: spa[0].c,
        conciergeBookings: concierge[0].c,
        shiftHandovers: shift[0].c,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 15. COMPLETE HISTORICAL GUEST EXPORT (EXCEL / XLSX)
// ==========================================
router.get('/reports/guests/export', async (req, res) => {
  try {
    const { hotelId, format } = req.query;

    if (!hotelId || (hotelId !== 'h-villa' && hotelId !== 'h-navkar')) {
      return res.status(400).json({
        error: "Missing or invalid hotelId. Please specify 'h-villa' or 'h-navkar'.",
      });
    }

    if (!checkHotelAccess(req, res, hotelId)) return;

    // Retrieve ALL existing guest records for the hotel:
    // 1. All historical and current bookings from `bookings` (joined with `guests`, `rooms`, `invoices`, `hotels`)
    // 2. UNION ALL any active in-house room check-ins from `rooms` not yet present in `bookings`
    const query = `
      SELECT 
        b.id AS bookingId,
        b.hotelId,
        h.name AS hotelName,
        COALESCE(b.bookingReference, b.id) AS bookingReference,
        b.guestName,
        COALESCE(b.guestPhone, g.phone, '') AS guestPhone,
        COALESCE(b.guestEmail, g.email, '') AS guestEmail,
        COALESCE(b.roomNumber, r.roomNumber, '') AS roomNumber,
        COALESCE(b.roomCategory, b.roomType, r.category, '') AS roomCategory,
        DATE_FORMAT(b.checkInDate, '%Y-%m-%d') AS checkInDate,
        DATE_FORMAT(b.checkOutDate, '%Y-%m-%d') AS checkOutDate,
        COALESCE(b.nightsCount, DATEDIFF(b.checkOutDate, b.checkInDate), 1) AS nightsCount,
        COALESCE(b.totalGuests, 1) AS numberOfGuests,
        b.status AS bookingStatus,
        CAST(COALESCE(b.totalAmount, 0) AS DECIMAL(12,2)) AS totalAmount,
        CAST(COALESCE(b.depositPaid, b.advanceAmount, 0) AS DECIMAL(12,2)) AS depositPaid,
        COALESCE(b.paymentStatus, CASE WHEN b.depositPaid >= b.totalAmount THEN 'paid' ELSE 'partial' END) AS paymentStatus,
        COALESCE(b.paymentMethod, 'UPI') AS paymentMethod,
        COALESCE(b.bookingType, 'normal') AS bookingType,
        COALESCE(g.idType, '') AS idType,
        COALESCE(g.idNumber, '') AS idNumber,
        COALESCE(g.city, '') AS cityOfOrigin,
        COALESCE(b.notes, g.specialRequests, '') AS notes,
        DATE_FORMAT(b.createdAt, '%Y-%m-%d %H:%i') AS createdAt
      FROM bookings b
      JOIN hotels h ON b.hotelId = h.id
      LEFT JOIN guests g ON b.guestId = g.id
      LEFT JOIN rooms r ON b.roomId = r.id
      WHERE b.hotelId = ?

      UNION ALL

      SELECT 
        COALESCE(r.currentBookingId, CONCAT('rm-stay-', r.roomNumber)) AS bookingId,
        r.hotelId,
        h.name AS hotelName,
        CONCAT(h.code, '-ROOM-', r.roomNumber) AS bookingReference,
        r.currentGuestName AS guestName,
        '' AS guestPhone,
        '' AS guestEmail,
        r.roomNumber,
        r.category AS roomCategory,
        DATE_FORMAT(r.updatedAt, '%Y-%m-%d') AS checkInDate,
        DATE_FORMAT(DATE_ADD(r.updatedAt, INTERVAL 3 DAY), '%Y-%m-%d') AS checkOutDate,
        3 AS nightsCount,
        2 AS numberOfGuests,
        'CHECKED_IN' AS bookingStatus,
        CAST(COALESCE(r.ratePerNight * 3, 0) AS DECIMAL(12,2)) AS totalAmount,
        CAST(COALESCE(r.ratePerNight * 3, 0) AS DECIMAL(12,2)) AS depositPaid,
        'paid' AS paymentStatus,
        'UPI' AS paymentMethod,
        'normal' AS bookingType,
        '' AS idType,
        '' AS idNumber,
        '' AS cityOfOrigin,
        'In-house occupied room check-in' AS notes,
        DATE_FORMAT(r.updatedAt, '%Y-%m-%d %H:%i') AS createdAt
      FROM rooms r
      JOIN hotels h ON r.hotelId = h.id
      WHERE r.hotelId = ?
        AND r.status IN ('OCCUPIED', 'CLEANING')
        AND r.currentGuestName IS NOT NULL 
        AND r.currentGuestName != ''
        AND r.currentGuestName NOT IN (SELECT guestName FROM bookings WHERE hotelId = r.hotelId)
        AND (r.currentBookingId IS NULL OR r.currentBookingId NOT IN (SELECT id FROM bookings WHERE hotelId = r.hotelId))

      ORDER BY createdAt ASC, checkInDate ASC
    `;

    const [rows] = await pool.query(query, [hotelId, hotelId]);

    const hotelName = hotelId === 'h-villa' ? 'THE VILLA' : 'NAVKAR PALACE & RESORT';
    const hotelCode = hotelId === 'h-villa' ? 'The_Villa' : 'Navkar_Palace';
    const today = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      return res.json({
        success: true,
        hotelId,
        hotelName,
        totalRecords: rows.length,
        exportedAt: new Date().toISOString(),
        records: rows,
      });
    }

    // Build Excel Workbook via xlsx
    

    const excelData = rows.map((r, index) => ({
      'S.No': index + 1,
      'Booking Reference': r.bookingReference,
      'Guest Name': r.guestName,
      'Phone Number': r.guestPhone || 'N/A',
      'Email Address': r.guestEmail || 'N/A',
      'Property': r.hotelName,
      'Room Number': r.roomNumber || 'Unassigned',
      'Room Category': r.roomCategory || 'N/A',
      'Check-In Date': r.checkInDate,
      'Check-Out Date': r.checkOutDate,
      'Nights': Number(r.nightsCount),
      'Guests': Number(r.numberOfGuests),
      'Status': r.bookingStatus,
      'Total Amount (₹)': Number(r.totalAmount),
      'Deposit Paid (₹)': Number(r.depositPaid),
      'Payment Status': r.paymentStatus,
      'Payment Method': r.paymentMethod,
      'Booking Type': r.bookingType,
      'Govt ID Type': r.idType || 'N/A',
      'Govt ID Number': r.idNumber || 'N/A',
      'City of Origin': r.cityOfOrigin || 'N/A',
      'Special Notes': r.notes || 'None',
      'Created At': r.createdAt,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = Object.keys(excelData[0] || {}).map((key) => {
      let maxLen = key.length;
      excelData.forEach((row) => {
        const val = row[key] ? String(row[key]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });
    ws['!cols'] = colWidths;

    const sheetName = hotelId === 'h-villa' ? 'The Villa - Guests' : 'Navkar Palace - Guests';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `${hotelCode}_Complete_Guest_History_${today}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
