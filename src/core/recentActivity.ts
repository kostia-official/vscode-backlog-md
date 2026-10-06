import type { DayActivity, Task } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local day of a stored date: `YYYY-MM-DD HH:mm` is UTC, a bare `YYYY-MM-DD` is the day itself. */
function localDay(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
  const date = new Date(`${stored.replace(' ', 'T')}Z`);
  return isNaN(date.getTime()) ? undefined : dayKey(date);
}

/**
 * Tasks created and done on each of the last 7 local days, oldest first, today last.
 * Done needs the done status and a `done_date` (`doneAt`); `updated_date` is not used.
 */
export function lastSevenDays(tasks: Task[], doneStatus: string, now = new Date()): DayActivity[] {
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i)),
    created: 0,
    done: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const task of tasks) {
    const created = byDate.get(localDay(task.createdAt) ?? '');
    if (created) created.created++;
    const done = task.status === doneStatus ? byDate.get(localDay(task.doneAt) ?? '') : undefined;
    if (done) done.done++;
  }
  return days;
}
