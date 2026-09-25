/**
 * The decisions list puts open questions on top: proposed, accepted, superseded,
 * rejected, then other statuses; newest date first within a status, then id.
 */
import { test, expect } from '@playwright/test';
import { installVsCodeMock, postMessageToWebview } from './fixtures/vscode-mock';
import type { BacklogDecision } from '../src/webview/lib/types';

const decisions: BacklogDecision[] = [
  {
    id: 'DECISION-1',
    title: 'Rejected',
    status: 'rejected',
    date: '2026-09-20',
    filePath: '/d/1.md',
  },
  {
    id: 'DECISION-2',
    title: 'Accepted',
    status: 'accepted',
    date: '2026-09-21',
    filePath: '/d/2.md',
  },
  {
    id: 'DECISION-3',
    title: 'Older proposal',
    status: 'proposed',
    date: '2026-09-01',
    filePath: '/d/3.md',
  },
  {
    id: 'DECISION-4',
    title: 'Superseded',
    status: 'superseded',
    date: '2026-09-22',
    filePath: '/d/4.md',
  },
  {
    id: 'DECISION-5',
    title: 'Unknown status',
    status: 'open' as BacklogDecision['status'],
    filePath: '/d/5.md',
  },
  {
    id: 'DECISION-10',
    title: 'Newer proposal',
    status: 'proposed',
    date: '2026-09-24',
    filePath: '/d/10.md',
  },
  {
    id: 'DECISION-6',
    title: 'Same-day proposal',
    status: 'proposed',
    date: '2026-09-24',
    filePath: '/d/6.md',
  },
];

test('decisions are listed proposed first, then by date and id', async ({ page }) => {
  await installVsCodeMock(page);
  await page.goto('/tasks-editor.html');
  await page.waitForTimeout(100);
  await page.locator('[data-testid="tab-decisions"]').click();
  await postMessageToWebview(page, { type: 'decisionsUpdated', decisions });

  const ids = await page
    .locator('[data-testid="decisions-list-items"] [data-testid^="decision-item-"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  expect(ids).toEqual([
    'decision-item-DECISION-6',
    'decision-item-DECISION-10',
    'decision-item-DECISION-3',
    'decision-item-DECISION-2',
    'decision-item-DECISION-4',
    'decision-item-DECISION-1',
    'decision-item-DECISION-5',
  ]);
});
