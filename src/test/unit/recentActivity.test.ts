process.env.TZ = 'Europe/Kyiv';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lastSevenDays } from '../../core/recentActivity';
import type { Task } from '../../core/types';

function task(fields: Partial<Task>): Task {
  return {
    id: 'TASK-1',
    title: 't',
    status: 'To Do',
    labels: [],
    assignee: [],
    dependencies: [],
    acceptanceCriteria: [],
    definitionOfDone: [],
    filePath: '/t.md',
    ...fields,
  };
}

const dayOf = (days: ReturnType<typeof lastSevenDays>, date: string) =>
  days.find((d) => d.date === date);

describe('lastSevenDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('lists 7 local days, oldest first, today last', () => {
    expect(lastSevenDays([], 'Done').map((d) => d.date)).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });

  it('counts a creation on day -6 and not on day -7', () => {
    const days = lastSevenDays(
      [task({ createdAt: '2026-09-29 10:00' }), task({ createdAt: '2026-09-28 10:00' })],
      'Done'
    );
    expect(days.reduce((n, d) => n + d.created, 0)).toBe(1);
    expect(dayOf(days, '2026-09-29')?.created).toBe(1);
  });

  it('reads a timed date as UTC and a bare date as the day itself', () => {
    const days = lastSevenDays(
      [task({ createdAt: '2026-10-04 22:30' }), task({ createdAt: '2026-10-05' })],
      'Done'
    );
    expect(dayOf(days, '2026-10-05')?.created).toBe(2);
    expect(dayOf(days, '2026-10-04')?.created).toBe(0);
  });

  it('counts done only for a task in the done status with a done date', () => {
    const days = lastSevenDays(
      [
        task({ status: 'Done', doneAt: '2026-10-05 08:00' }),
        task({ status: 'Done' }),
        task({ status: 'In Progress', doneAt: '2026-10-05 08:00' }),
      ],
      'Done'
    );
    expect(days.map((d) => d.done)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });
});
