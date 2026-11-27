const rules = require('../src/booking-rules');

// Fixed moments (UTC). Manila is UTC+8, so 03:00Z is 11:00 AM in Manila.
const FRI_1100 = new Date('2026-11-27T03:00:00Z'); // Friday Nov 27, 11:00 AM
const FRI_2300 = new Date('2026-11-27T15:00:00Z'); // Friday Nov 27, 11:00 PM
const SAT_0100 = new Date('2026-11-27T17:00:00Z'); // Saturday Nov 28, 1:00 AM Manila (still Friday in UTC)

afterEach(() => {
  delete process.env.BOOKING_NOTICE_DAYS;
});

describe('Manila date', () => {
  test('uses Philippine time, not UTC', () => {
    expect(rules.today(FRI_1100)).toBe('2026-11-27');
    expect(rules.today(SAT_0100)).toBe('2026-11-28');
  });
});

describe('one day notice (default)', () => {
  test('today cannot be booked', () => {
    expect(rules.validDate('2026-11-27', FRI_1100)).toBe(false);
  });

  test('earliest date is tomorrow, but weekends are skipped', () => {
    expect(rules.minDate(FRI_1100)).toBe('2026-11-28');
    expect(rules.validDate('2026-11-28', FRI_1100)).toBe(false); // Saturday
    expect(rules.validDate('2026-11-29', FRI_1100)).toBe(false); // Sunday
    expect(rules.validDate('2026-11-30', FRI_1100)).toBe(true); // Monday
  });

  test('a weekday tomorrow is allowed', () => {
    const thu = new Date('2026-11-26T03:00:00Z');
    expect(rules.validDate('2026-11-27', thu)).toBe(true);
  });

  test('past dates and fake dates are rejected', () => {
    expect(rules.validDate('2026-11-20', FRI_1100)).toBe(false);
    expect(rules.validDate('2026-02-31', FRI_1100)).toBe(false);
    expect(rules.validDate('tomorrow', FRI_1100)).toBe(false);
  });
});

describe('hours that already passed (no time travel)', () => {
  beforeEach(() => {
    process.env.BOOKING_NOTICE_DAYS = '0';
  });

  test('at 11:00 AM, 9, 10 and 11 are gone', () => {
    expect(rules.availableHours('2026-11-27', [], FRI_1100)).toEqual([13, 14, 15]);
  });

  test('late at night nothing is left today', () => {
    expect(rules.availableHours('2026-11-27', [], FRI_2300)).toEqual([]);
  });

  test('booked hours are removed too', () => {
    expect(rules.availableHours('2026-11-30', [9, 13], FRI_1100)).toEqual([10, 11, 14, 15]);
  });

  test('a past hour is not a valid slot', () => {
    expect(rules.validSlot('2026-11-27', 10, FRI_1100)).toBe(false);
    expect(rules.validSlot('2026-11-27', 13, FRI_1100)).toBe(true);
    expect(rules.validSlot('2026-11-27', 12, FRI_1100)).toBe(false); // lunch
  });
});
