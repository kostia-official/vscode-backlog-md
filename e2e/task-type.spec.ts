/**
 * Task type: the Bug badge on cards, list rows and the preview, the type
 * dropdown in the task view, and the count of a collapsed kanban column.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getLastPostedMessage,
  clearPostedMessages,
} from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

function makeTask(id: string, type: string | undefined): Task {
  return {
    id,
    title: `${id} title`,
    status: 'To Do',
    priority: 'high',
    type,
    labels: [],
    assignee: [],
    dependencies: [],
    acceptanceCriteria: [],
    definitionOfDone: [],
    filePath: `/test/tasks/${id.toLowerCase()}.md`,
  };
}

const tasks = [
  makeTask('TASK-1', 'Bug'),
  makeTask('TASK-2', 'Task'),
  makeTask('TASK-3', undefined),
];

async function setupBoard(page: Page, viewMode: 'kanban' | 'list') {
  await installVsCodeMock(page);
  await page.goto('/tasks.html');
  await page.waitForTimeout(100);
  await postMessageToWebview(page, { type: 'viewModeChanged', viewMode });
  await postMessageToWebview(page, {
    type: 'statusesUpdated',
    statuses: ['To Do', 'In Progress', 'Done'],
  });
  await postMessageToWebview(page, { type: 'milestonesUpdated', milestones: [] });
  await postMessageToWebview(page, { type: 'tasksUpdated', tasks });
  await page.waitForTimeout(100);
}

async function setupDetail(page: Page, task: Task, extra: Record<string, unknown> = {}) {
  await installVsCodeMock(page);
  await page.goto('/task-detail.html');
  await page.waitForTimeout(100);
  await postMessageToWebview(page, {
    type: 'taskData',
    data: {
      task,
      statuses: ['To Do', 'In Progress', 'Done'],
      priorities: ['high', 'medium', 'low'],
      types: ['Bug', 'Task'],
      uniqueLabels: [],
      uniqueAssignees: [],
      milestones: [],
      blocksTaskIds: [],
      isBlocked: false,
      linkableTasks: [],
      descriptionHtml: '',
      planHtml: '',
      notesHtml: '',
      finalSummaryHtml: '',
      ...extra,
    },
  });
  await page.waitForTimeout(50);
}

async function box(locator: ReturnType<Page['locator']>) {
  const b = await locator.boundingBox();
  expect(b).not.toBeNull();
  return b!;
}

test.describe('Bug badge on the board', () => {
  test('kanban card shows Bug right of the id', async ({ page }) => {
    await setupBoard(page, 'kanban');
    const badge = page.locator('[data-testid="task-TASK-1"] [data-testid="bug-badge"]');
    await expect(badge).toHaveText('Bug');
    await expect(
      page.locator('[data-testid="task-TASK-1"] .task-card-id-row [data-testid="bug-badge"]')
    ).toBeVisible();

    const id = await box(page.locator('[data-testid="task-id-TASK-1"]'));
    const b = await box(badge);
    expect(b.x).toBeGreaterThanOrEqual(id.x + id.width);
    expect(b.y).toBeLessThan(id.y + id.height);
    expect(id.y).toBeLessThan(b.y + b.height);
  });

  test('Task and untyped cards have no badge; hidden id moves it to meta', async ({ page }) => {
    await setupBoard(page, 'kanban');
    await expect(page.locator('[data-testid="task-TASK-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-TASK-2"] [data-testid="bug-badge"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="task-TASK-3"] [data-testid="bug-badge"]')).toHaveCount(
      0
    );

    await postMessageToWebview(page, {
      type: 'settingsUpdated',
      settings: { taskIdDisplay: 'hidden' },
    });
    await expect(
      page.locator('[data-testid="task-TASK-1"] .task-card-meta [data-testid="bug-badge"]')
    ).toHaveText('Bug');
  });

  test('list row shows Bug after the id, only for Bug', async ({ page }) => {
    await setupBoard(page, 'list');
    const row = page.locator('[data-testid="task-row-TASK-1"]');
    await expect(row.locator('[data-testid="bug-badge"]')).toHaveText('Bug');
    const follows = await row.evaluate((el) => {
      const id = el.querySelector('[data-testid="task-row-id-TASK-1"]')!;
      const badge = el.querySelector('[data-testid="bug-badge"]')!;
      return Boolean(id.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(follows).toBe(true);
    await expect(
      page.locator('[data-testid="task-row-TASK-2"] [data-testid="bug-badge"]')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="task-row-TASK-3"] [data-testid="bug-badge"]')
    ).toHaveCount(0);
  });
});

test.describe('Type dropdown in the task view', () => {
  test('Bug task: value, options, class, position before priority, edit message', async ({
    page,
  }) => {
    await setupDetail(page, tasks[0]);
    const select = page.locator('[data-testid="type-select"]');
    await expect(select).toHaveValue('Bug');
    await expect(select.locator('option')).toHaveText(['Bug', 'Task']);
    await expect(select).toHaveClass(/type-bug/);
    const before = await page.locator('.task-badges').evaluate((el) => {
      const type = el.querySelector('[data-testid="type-select"]')!;
      const priority = el.querySelector('[data-testid="priority-select"]')!;
      return Boolean(type.compareDocumentPosition(priority) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(before).toBe(true);

    await clearPostedMessages(page);
    await select.selectOption('Task');
    expect(await getLastPostedMessage(page)).toEqual({
      type: 'updateField',
      field: 'type',
      value: 'Task',
    });
  });

  test('lower-case type matches the config option', async ({ page }) => {
    await setupDetail(page, makeTask('TASK-1', 'bug'));
    await expect(page.locator('[data-testid="type-select"]')).toHaveValue('Bug');
  });

  test('a type outside the config is added to the options', async ({ page }) => {
    await setupDetail(page, makeTask('TASK-1', 'Feature'));
    const select = page.locator('[data-testid="type-select"]');
    await expect(select.locator('option')).toHaveText(['Bug', 'Task', 'Feature']);
    await expect(select).toHaveValue('Feature');
  });

  test('untyped task shows a placeholder and the first pick posts the type', async ({ page }) => {
    await setupDetail(page, tasks[2]);
    const select = page.locator('[data-testid="type-select"]');
    await expect(select.locator('option').first()).toHaveText('Type');
    await expect(select.locator('option').first()).toBeDisabled();
    await expect(select).toHaveValue('');

    await clearPostedMessages(page);
    await select.selectOption('Bug');
    expect(await getLastPostedMessage(page)).toEqual({
      type: 'updateField',
      field: 'type',
      value: 'Bug',
    });
  });

  test('read-only task disables the select', async ({ page }) => {
    await setupDetail(page, tasks[0], { isReadOnly: true });
    await expect(page.locator('[data-testid="type-select"]')).toBeDisabled();
  });
});

test.describe('Bug chip in the sidebar preview', () => {
  async function setupPreview(page: Page, task: Task) {
    await installVsCodeMock(page);
    await page.goto('/task-preview.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, {
      type: 'taskPreviewData',
      task,
      descriptionHtml: '',
      planHtml: '',
      notesHtml: '',
      finalSummaryHtml: '',
      statuses: ['To Do', 'In Progress', 'Done'],
      isReadOnly: false,
      subtaskSummaries: [],
    });
    await page.waitForTimeout(50);
  }

  test('Bug task shows the chip before the priority chip', async ({ page }) => {
    await setupPreview(page, tasks[0]);
    const chip = page.locator('[data-testid="compact-type-chip"]');
    await expect(chip).toHaveText('Bug');
    const before = await page.locator('.compact-chip-row').evaluate((el) => {
      const type = el.querySelector('[data-testid="compact-type-chip"]')!;
      const priority = el.querySelector('.compact-priority-chip')!;
      return Boolean(type.compareDocumentPosition(priority) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(before).toBe(true);
  });

  test('Task task has no chip', async ({ page }) => {
    await setupPreview(page, tasks[1]);
    await expect(page.locator('[data-testid="compact-details-task-id"]')).toHaveText('TASK-2');
    await expect(page.locator('[data-testid="compact-type-chip"]')).toHaveCount(0);
  });
});

test('collapsed column keeps its count inside the column, below the title', async ({ page }) => {
  await setupBoard(page, 'kanban');
  await postMessageToWebview(page, { type: 'columnCollapseChanged', collapsedColumns: ['To Do'] });
  const column = page.locator('[data-testid="column-To Do"]');
  await expect(column).toHaveClass(/collapsed/);

  const col = await box(column);
  const count = await box(column.locator('.column-count'));
  const title = await box(column.locator('.column-title'));
  expect(count.x).toBeGreaterThanOrEqual(col.x);
  expect(count.x + count.width).toBeLessThanOrEqual(col.x + col.width);
  expect(count.y).toBeGreaterThanOrEqual(col.y);
  expect(count.y + count.height).toBeLessThanOrEqual(col.y + col.height);
  expect(count.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
});
