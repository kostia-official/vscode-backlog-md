/**
 * Decision status control, status filter and create button.
 */
import { test, expect } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getLastPostedMessage,
  clearPostedMessages,
} from './fixtures/vscode-mock';
import type { BacklogDecision } from '../src/webview/lib/types';

const decisions: BacklogDecision[] = [
  { id: 'DECISION-1', title: 'Use Svelte', status: 'accepted', filePath: '/d/decision-1.md' },
  { id: 'DECISION-2', title: 'REST vs GraphQL', status: 'proposed', filePath: '/d/decision-2.md' },
  { id: 'DECISION-3', title: 'Dropped idea', status: 'rejected', filePath: '/d/decision-3.md' },
  { id: 'DECISION-4', title: 'Old storage', status: 'proposed', filePath: '/d/decision-4.md' },
];

test.describe('Decision detail status control', () => {
  test.beforeEach(async ({ page }) => {
    await installVsCodeMock(page);
    await page.goto('/content-detail.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, {
      type: 'decisionData',
      decision: decisions[1],
      sections: {},
    });
  });

  test('offers the four statuses with the current one selected', async ({ page }) => {
    const select = page.locator('[data-testid="decision-status-select"]');
    await expect(select).toHaveValue('proposed');
    await expect(select.locator('option')).toHaveText([
      'proposed',
      'accepted',
      'rejected',
      'superseded',
    ]);
  });

  test('choosing a status posts updateDecisionStatus', async ({ page }) => {
    await clearPostedMessages(page);
    await page.locator('[data-testid="decision-status-select"]').selectOption('superseded');
    expect(await getLastPostedMessage(page)).toEqual({
      type: 'updateDecisionStatus',
      decisionId: 'DECISION-2',
      status: 'superseded',
    });
  });

  test('an unknown status is shown, not replaced', async ({ page }) => {
    await postMessageToWebview(page, {
      type: 'decisionData',
      decision: { ...decisions[0], status: 'open' },
      sections: {},
    });
    const select = page.locator('[data-testid="decision-status-select"]');
    await expect(select).toHaveValue('open');
    await expect(select).toHaveClass(/status-unknown/);
  });
});

test.describe('Decisions list filter and create', () => {
  test.beforeEach(async ({ page }) => {
    await installVsCodeMock(page);
    await page.goto('/tasks.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, { type: 'statusesUpdated', statuses: ['To Do', 'Done'] });
    await postMessageToWebview(page, { type: 'tasksUpdated', tasks: [] });
    await page.locator('[data-testid="overflow-menu-btn"]').click();
    await page.locator('[data-testid="tab-decisions"]').click();
    await postMessageToWebview(page, { type: 'decisionsUpdated', decisions });
  });

  const items = '[data-testid="decisions-list-items"] .list-item';

  test('status chips filter the list and All resets it', async ({ page }) => {
    await expect(page.locator(items)).toHaveCount(4);

    await page.locator('[data-testid="decision-filter-proposed"]').click();
    await expect(page.locator(items)).toHaveCount(2);
    await expect(page.locator('[data-testid="decision-filter-proposed"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.locator('[data-testid="decision-filter-superseded"]').click();
    await expect(page.locator(items)).toHaveCount(0);
    await expect(page.locator('.decisions-list .empty-state')).toContainText(
      'No decisions match your filters'
    );

    await page.locator('[data-testid="decision-filter-all"]').click();
    await expect(page.locator(items)).toHaveCount(4);
  });

  test('the chip filter combines with search', async ({ page }) => {
    await page.locator('[data-testid="decision-filter-proposed"]').click();
    await page.locator('[data-testid="decisions-search-input"]').fill('storage');
    await expect(page.locator(items)).toHaveCount(1);
    await expect(page.locator('[data-testid="decision-item-DECISION-4"]')).toBeVisible();
  });

  test('New decision posts createDecision', async ({ page }) => {
    await clearPostedMessages(page);
    await page.locator('[data-testid="new-decision-btn"]').click();
    expect(await getLastPostedMessage(page)).toEqual({ type: 'createDecision' });
  });
});
