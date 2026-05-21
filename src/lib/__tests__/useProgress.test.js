import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeAutoFreezers, hasUsedAutoFreezerToday, repairDuplicateAutoFreezerUsage } from '../useProgress';

describe('streak freezer auto consumption', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks an auto freezer as used for the day it was activated', () => {
    expect(hasUsedAutoFreezerToday({
      streak_freezer_history: [
        {
          status: 'used_auto',
          activatedAt: '2026-05-21T08:00:00.000Z',
          consumedAt: '2026-05-18T00:00:00.000Z',
        },
      ],
    }, '2026-05-21')).toBe(true);
  });

  it('does not consume more than one auto freezer on repeated loads in the same day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T08:00:00.000Z'));

    const baseProgress = {
      last_active_date: '2026-05-17',
      streak_count: 4,
      best_streak: 4,
      streak_freezers: 3,
      streak_freezer_history: [],
    };

    const first = consumeAutoFreezers(baseProgress, '2026-05-21');
    const second = consumeAutoFreezers(first.next, '2026-05-21');

    expect(first.consumedDays).toBe(1);
    expect(first.next.streak_freezers).toBe(2);
    expect(second.consumedDays).toBe(0);
    expect(second.next.streak_freezers).toBe(2);
  });

  it('refunds duplicate auto freezer records from the same activation day', () => {
    const repaired = repairDuplicateAutoFreezerUsage({
      streak_freezers: 0,
      streak_freezer_history: [
        {
          status: 'used_auto',
          activatedAt: '2026-05-21T08:00:00.000Z',
          consumedAt: '2026-05-18T00:00:00.000Z',
        },
        {
          status: 'used_auto',
          activatedAt: '2026-05-21T08:01:00.000Z',
          consumedAt: '2026-05-19T00:00:00.000Z',
        },
        {
          status: 'used_auto',
          activatedAt: '2026-05-21T08:02:00.000Z',
          consumedAt: '2026-05-20T00:00:00.000Z',
        },
      ],
    });

    expect(repaired.refundedCount).toBe(2);
    expect(repaired.next.streak_freezers).toBe(2);
    expect(repaired.next.streak_freezer_history).toHaveLength(1);
  });
});
