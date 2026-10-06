<script lang="ts">
  import type { DayActivity } from '../../lib/types';

  let { days }: { days: DayActivity[] } = $props();

  const created = $derived(days.reduce((n, d) => n + d.created, 0));
  const done = $derived(days.reduce((n, d) => n + d.done, 0));

  // "Mon 29" from a local YYYY-MM-DD key, read as a local date
  function dayLabel(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return `${new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })} ${d}`;
  }
</script>

<div class="section" data-testid="recent-activity">
  <div class="section-title">Last 7 days</div>
  <div class="recent-totals"><strong>{created}</strong> created · <strong>{done}</strong> done</div>
  <div class="recent-grid">
    <div class="recent-column recent-row-labels">
      <span></span>
      <span>Created</span>
      <span>Done</span>
    </div>
    {#each days as day, i (day.date)}
      <div class="recent-column" data-testid="day-{day.date}">
        <span class="recent-day" class:today={i === days.length - 1}>{dayLabel(day.date)}</span>
        <span data-testid="created" class:zero={day.created === 0}>{day.created}</span>
        <span data-testid="done" class:zero={day.done === 0}>{day.done}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .recent-totals {
    margin-bottom: 8px;
  }
  /* One grid for all cells, filled column by column, so each row shares one line */
  .recent-grid {
    display: grid;
    grid-template-columns: auto repeat(7, minmax(0, 1fr));
    grid-template-rows: repeat(3, auto);
    grid-auto-flow: column;
    gap: 2px 4px;
    font-size: 12px;
    text-align: center;
  }
  .recent-column {
    display: contents;
  }
  .recent-row-labels > span {
    text-align: left;
    padding-right: 8px;
    color: var(--vscode-descriptionForeground, #858585);
  }
  .recent-day {
    color: var(--vscode-descriptionForeground, #858585);
    white-space: nowrap;
  }
  .recent-day.today {
    font-weight: 600;
    color: inherit;
  }
  .zero {
    color: var(--vscode-disabledForeground, #6c6c6c);
  }
</style>
