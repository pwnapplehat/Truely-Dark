import { describe, expect, it } from 'vitest';
import { isWithinSchedule, parseTimeToMinutes } from '../src/lib/schedule';

describe('parseTimeToMinutes', () => {
  it('parses HH:MM correctly', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('12:30')).toBe(750);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });
});

describe('isWithinSchedule', () => {
  const at = (hours: number, minutes: number) =>
    new Date(2026, 0, 15, hours, minutes, 0);

  it('handles same-day range', () => {
    expect(isWithinSchedule('09:00', '17:00', at(12, 0))).toBe(true);
    expect(isWithinSchedule('09:00', '17:00', at(8, 0))).toBe(false);
    expect(isWithinSchedule('09:00', '17:00', at(17, 0))).toBe(false);
  });

  it('handles overnight wrap (20:00 – 07:00)', () => {
    const start = '20:00';
    const end = '07:00';

    expect(isWithinSchedule(start, end, at(21, 0))).toBe(true);
    expect(isWithinSchedule(start, end, at(3, 0))).toBe(true);
    expect(isWithinSchedule(start, end, at(12, 0))).toBe(false);
    expect(isWithinSchedule(start, end, at(19, 59))).toBe(false);
    expect(isWithinSchedule(start, end, at(7, 0))).toBe(false);
  });

  it('handles midnight boundary on overnight range', () => {
    expect(isWithinSchedule('20:00', '07:00', at(0, 0))).toBe(true);
    expect(isWithinSchedule('20:00', '07:00', at(20, 0))).toBe(true);
  });
});
