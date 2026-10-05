/**
 * The multi-select label filter on the kanban board, label chips on cards and
 * list rows, and the board kept with empty columns when no task matches.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getPostedMessages,
  clearPostedMessages,
} from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

function task(id: string, status: string, labels: string[]): Task {
  return {
    id,
    title: id,
    status,
    labels,
    assignee: [],
    dependencies: [],
    acceptanceCriteria: [],
    definitionOfDone: [],
    filePath: `/test/tasks/${id.toLowerCase()}.md`,
  };
}

const tasks = [
  task('TASK-1', 'To Do', ['bug']),
  task('TASK-2', 'In Progress', ['ui', 'feature']),
  task('TASK-3', 'To Do', ['infra']),
];

async function setup(page: Page) {
  await installVsCodeMock(page);
  await page.goto('/tasks.html');
  await page.waitForTimeout(100);
  await postMessageToWebview(page, { type: 'viewModeChanged', viewMode: 'kanban' });
  await postMessageToWebview(page, {
    type: 'statusesUpdated',
    statuses: ['To Do', 'In Progress', 'Done'],
  });
  await postMessageToWebview(page, { type: 'milestonesUpdated', milestones: [] });
  await postMessageToWebview(page, { type: 'configUpdated', config: { labels: ['docs'] } });
  await postMessageToWebview(page, { type: 'tasksUpdated', tasks });
  await page.waitForTimeout(100);
}

async function checkLabel(page: Page, label: string) {
  const filter = page.locator('[data-testid="label-filter"]');
  if (!(await filter.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await filter.locator('summary').click();
  }
  await page.locator(`[data-testid="label-filter-option-${label}"]`).check();
}

const card = (page: Page, id: string) => page.locator(`[data-testid="task-${id}"]`);
const selectsOrOpens = async (page: Page) =>
  (await getPostedMessages(page)).filter((m) => m.type === 'selectTask' || m.type === 'openTask');

test.describe('Kanban label filter', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('sits right after the grouping toggle and filters cards by any checked label', async ({
    page,
  }) => {
    expect(
      await page
        .locator('.kanban-toolbar .grouping-toggle')
        .evaluate((el) => (el.nextElementSibling as HTMLElement | null)?.dataset.testid)
    ).toBe('label-filter');

    await checkLabel(page, 'bug');
    await checkLabel(page, 'ui');

    await expect(card(page, 'TASK-1')).toBeVisible();
    await expect(card(page, 'TASK-2')).toBeVisible();
    await expect(card(page, 'TASK-3')).toHaveCount(0);
  });

  test('a label no task has leaves every column present and empty', async ({ page }) => {
    await checkLabel(page, 'docs');

    for (const status of ['To Do', 'In Progress', 'Done']) {
      await expect(page.locator(`[data-testid="task-list-${status}"]`)).toBeVisible();
    }
    await expect(page.locator('.task-card')).toHaveCount(0);
    await expect(page.getByText('No tasks found. Create tasks')).toHaveCount(0);
  });

  test('Escape and a click outside close the open dropdown', async ({ page }) => {
    const filter = page.locator('[data-testid="label-filter"]');
    await filter.locator('summary').click();
    await expect(filter).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(filter).not.toHaveAttribute('open', '');

    await filter.locator('summary').click();
    await expect(filter).toHaveAttribute('open', '');
    await page.locator('#kanban-app').click({ position: { x: 5, y: 200 } });
    await expect(filter).not.toHaveAttribute('open', '');
  });

  test('switching to list keeps the selection and filters the rows', async ({ page }) => {
    await checkLabel(page, 'infra');
    await page.locator('[data-testid="tab-list"]').click();

    await expect(page.locator('[data-testid="label-filter-option-infra"]')).toBeChecked();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('[data-testid="task-row-TASK-3"]')).toBeVisible();
  });
});

test.describe('Label chips', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await clearPostedMessages(page);
  });

  test('a chip on a card adds its label without selecting or opening the card', async ({
    page,
  }) => {
    await card(page, 'TASK-1').locator('[data-testid="label-chip-bug"]').click();
    await expect(page.locator('[data-testid="label-filter"] summary')).toHaveText('bug');
    await card(page, 'TASK-1').locator('[data-testid="label-chip-bug"]').dblclick();
    await expect(page.locator('[data-testid="label-filter"] summary')).toHaveText('bug');

    // TASK-2 is filtered out now; add it back through the dropdown, then by its chip
    await checkLabel(page, 'ui');
    await page.keyboard.press('Escape');
    await card(page, 'TASK-2').locator('[data-testid="label-chip-feature"]').click();
    await expect(page.locator('[data-testid="label-filter"] summary')).toHaveText(
      'bug, ui, feature'
    );

    const chip = card(page, 'TASK-2').locator('[data-testid="label-chip-ui"]');
    await chip.focus();
    await clearPostedMessages(page);
    await page.keyboard.press('Space');

    expect(await selectsOrOpens(page)).toEqual([]);
  });

  test('a chip click posts no selectTask or openTask', async ({ page }) => {
    await card(page, 'TASK-3').locator('[data-testid="label-chip-infra"]').click();
    await card(page, 'TASK-3').locator('[data-testid="label-chip-infra"]').dblclick();
    expect(await selectsOrOpens(page)).toEqual([]);
  });

  test('a chip on a list row adds its label and posts no selectTask', async ({ page }) => {
    await page.locator('[data-testid="tab-list"]').click();
    await clearPostedMessages(page);

    await page.locator('[data-testid="row-labels-TASK-2"] [data-testid="label-chip-ui"]').click();

    await expect(page.locator('[data-testid="label-filter"] summary')).toHaveText('ui');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    expect(await selectsOrOpens(page)).toEqual([]);
  });
});
