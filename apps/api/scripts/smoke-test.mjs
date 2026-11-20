/**
 * API smoke test: authentication, role checks and hotel isolation.
 *
 * Non-destructive: it only reads data, plus one PATCH that sets a room to the
 * status it already has. Expects the dev seed accounts (prisma/seed.mjs).
 *
 *   node scripts/smoke-test.mjs                 # against http://localhost:3000/api
 *   API_URL=http://192.168.1.10:3000/api node scripts/smoke-test.mjs
 */
const API = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN = { email: 'admin@resortos.com', password: process.env.SEED_ADMIN_PASSWORD || 'admin12345' };
const VILLA_MGR = { email: 'manager.villa@resortos.com', password: process.env.SEED_MANAGER_PASSWORD || 'manager12345' };
const NAVKAR_MGR = { email: 'manager.navkar@resortos.com', password: process.env.SEED_MANAGER_PASSWORD || 'manager12345' };

let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `  -> ${detail}` : ''}`);
  }
}

async function login(creds, role) {
  const r = await call('POST', '/auth/login', { body: { ...creds, role } });
  return { ...r, token: r.json?.data?.token, user: r.json?.data?.user };
}

async function main() {
  console.log(`ResortOS API smoke test -> ${API}\n`);

  const health = await call('GET', '/health');
  check('health endpoint responds', health.status === 200, `status ${health.status}`);
  check('database connected', health.json?.data?.database?.status === 'connected',
    JSON.stringify(health.json?.data?.database));

  // --- Authentication
  const bad = await login({ ...ADMIN, password: 'wrong-password' });
  check('wrong password rejected (401)', bad.status === 401, `status ${bad.status}`);

  const admin = await login(ADMIN, 'ADMIN');
  check('admin login', admin.status === 200 && !!admin.token, `status ${admin.status}`);

  const villa = await login(VILLA_MGR, 'MANAGER');
  check('Villa manager login', villa.status === 200 && !!villa.token, `status ${villa.status}`);

  const navkar = await login(NAVKAR_MGR, 'MANAGER');
  check('Navkar manager login', navkar.status === 200 && !!navkar.token, `status ${navkar.status}`);

  const mismatch = await login(VILLA_MGR, 'ADMIN');
  check('manager cannot sign in via Admin portal (403)', mismatch.status === 403, `status ${mismatch.status}`);

  const me = await call('GET', '/auth/me', { token: villa.token });
  check('/auth/me returns the signed-in user', me.json?.data?.email === VILLA_MGR.email);

  const forged = await call('GET', '/auth/me', { token: `${villa.token}tampered` });
  check('tampered token rejected (401)', forged.status === 401, `status ${forged.status}`);

  // --- Unauthenticated access is blocked
  const anonPrimary = await call('GET', '/hotels/primary');
  check('hotels/primary requires login (401)', anonPrimary.status === 401, `status ${anonPrimary.status}`);

  // --- Hotel resolution
  const villaHotel = (await call('GET', '/hotels/primary', { token: villa.token })).json?.data;
  const navkarHotel = (await call('GET', '/hotels/primary', { token: navkar.token })).json?.data;
  check('Villa manager lands on The Villa', villaHotel?.name === 'The Villa', villaHotel?.name);
  check('Navkar manager lands on Navkar Palace', navkarHotel?.name === 'Navkar Palace Hotel & Resort', navkarHotel?.name);
  if (!villaHotel || !navkarHotel) throw new Error('Seed hotels missing — run `pnpm db:seed` first.');

  const anonDash = await call('GET', `/hotels/${villaHotel.id}/dashboard`);
  check('dashboard requires login (401)', anonDash.status === 401, `status ${anonDash.status}`);

  const anonRooms = await call('GET', `/hotels/${villaHotel.id}/rooms`);
  check('rooms list requires login (401)', anonRooms.status === 401, `status ${anonRooms.status}`);

  // --- Hotel isolation for managers
  const ownDash = await call('GET', `/hotels/${villaHotel.id}/dashboard`, { token: villa.token });
  check('manager can read own hotel dashboard', ownDash.status === 200, `status ${ownDash.status}`);

  const otherDash = await call('GET', `/hotels/${navkarHotel.id}/dashboard`, { token: villa.token });
  check('manager CANNOT read other hotel dashboard (403)', otherDash.status === 403, `status ${otherDash.status}`);

  const otherRooms = await call('GET', `/hotels/${navkarHotel.id}/rooms`, { token: villa.token });
  check('manager CANNOT list other hotel rooms (403)', otherRooms.status === 403, `status ${otherRooms.status}`);

  const navkarRooms = (await call('GET', `/hotels/${navkarHotel.id}/rooms`, { token: navkar.token })).json?.data ?? [];
  const villaRooms = (await call('GET', `/hotels/${villaHotel.id}/rooms`, { token: villa.token })).json?.data ?? [];
  check('rooms are returned for own hotel', villaRooms.length > 0 && navkarRooms.length > 0);

  const foreignRoom = navkarRooms[0];
  const crossPatch = await call('PATCH', `/rooms/${foreignRoom.id}/status`, {
    token: villa.token,
    body: { status: foreignRoom.status },
  });
  check('manager CANNOT change other hotel room status (403)', crossPatch.status === 403, `status ${crossPatch.status}`);

  const ownRoom = villaRooms[0];
  const ownPatch = await call('PATCH', `/rooms/${ownRoom.id}/status`, {
    token: villa.token,
    body: { status: ownRoom.status, remarks: 'smoke test (no-op)' },
  });
  check('manager can update own hotel room status', ownPatch.status === 200, `status ${ownPatch.status}`);

  // --- Admin-only room configuration
  const mgrCreate = await call('POST', `/hotels/${villaHotel.id}/rooms`, { token: villa.token, body: {} });
  check('manager CANNOT create rooms (403)', mgrCreate.status === 403, `status ${mgrCreate.status}`);

  const adminCreate = await call('POST', `/hotels/${villaHotel.id}/rooms`, { token: admin.token, body: {} });
  check('admin passes auth for room creation (422 on empty body)', adminCreate.status === 422, `status ${adminCreate.status}`);

  // --- Admin cross-hotel access
  const adminVilla = await call('GET', `/hotels/${villaHotel.id}/dashboard`, { token: admin.token });
  const adminNavkar = await call('GET', `/hotels/${navkarHotel.id}/dashboard`, { token: admin.token });
  check('admin can read both hotels', adminVilla.status === 200 && adminNavkar.status === 200);

  // --- Input validation
  const badFilter = await call('GET', `/hotels/${villaHotel.id}/rooms?status=NOPE`, { token: villa.token });
  check('invalid room filter returns 400 (not 500)', badFilter.status === 400, `status ${badFilter.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nSmoke test aborted:', err.message);
  console.error('Is the API running?  pnpm dev:api');
  process.exit(1);
});
