/**
 * Start (inclusive) and end (exclusive) of "today" in the given IANA timezone,
 * returned as UTC Date instants suitable for database range queries.
 * Falls back to UTC if the timezone string is invalid.
 */
export function todayBoundsInTimeZone(timeZone: string, now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  // Offset between the zone's wall clock and UTC at this instant.
  const wallClockAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = wallClockAsUtc - Math.floor(now.getTime() / 1000) * 1000;

  const start = new Date(Date.UTC(year, month - 1, day) - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
