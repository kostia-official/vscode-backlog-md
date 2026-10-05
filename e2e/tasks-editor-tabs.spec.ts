/**
 * The editor-tab board (`tasks-editor-page`): every view as a tab with no "More" menu, and card press and drag.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getLastPostedMessage,
  getPostedMessages,
  clearPostedMessages,
} from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

const ALL_TABS = ['kanban', 'list', 'dashboard', 'archived', 'decisions'];

test.describe('Editor-tab board tab bar', () => {
  test.beforeEach(async ({ page }) => {
    await installVsCodeMock(page);
    await page.goto('/tasks-editor.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, { type: 'viewModeChanged', viewMode: 'kanban' });
    await postMessageToWebview(page, { type: 'statusesUpdated', statuses: ['To Do', 'Done'] });
    await postMessageToWebview(page, { type: 'tasksUpdated', tasks: [] });
    await page.waitForTimeout(50);
  });

  test('shows all seven views as tab bar buttons and no More menu', async ({ page }) => {
    for (const mode of ALL_TABS) {
      const tab = page.locator(`.tab-bar > [data-testid="tab-${mode}"]`);
      await expect(tab).toBeVisible();
      await expect(tab).toHaveAttribute('role', 'tab');
    }
    await expect(page.locator('[data-testid="overflow-menu-btn"]')).toHaveCount(0);
  });

  test('clicking Decisions switches the view', async ({ page }) => {
    await page.locator('[data-testid="tab-decisions"]').click();
    expect(await getLastPostedMessage(page)).toEqual({ type: 'setViewMode', mode: 'decisions' });
    await expect(page.locator('[data-testid="tab-decisions"]')).toHaveClass(/active/);
  });

  test('does not offer Drafts or Docs, nor a draft count', async ({ page }) => {
    await postMessageToWebview(page, { type: 'draftCountUpdated', count: 3 });
    await expect(page.locator('.tab-bar > [data-testid="tab-archived"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-drafts"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="tab-docs"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="tab-draft-badge"]')).toHaveCount(0);
  });

  test('scrolls the bar at 240px instead of cutting off tabs', async ({ page }) => {
    await page.setViewportSize({ width: 240, height: 600 });
    const bar = page.locator('.tab-bar');
    const { scrollWidth, clientWidth, overflowX } = await bar.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    }));
    expect(overflowX).toBe('auto');
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await page.locator('[data-testid="action-refresh"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="action-refresh"]')).toBeInViewport();
  });
});

function localTask(id: string): Task {
  return {
    id,
    title: id,
    status: 'To Do',
    labels: [],
    assignee: [],
    dependencies: [],
    acceptanceCriteria: [],
    definitionOfDone: [],
    filePath: `/test/tasks/${id.toLowerCase()}.md`,
  };
}

test.describe('Editor-tab board card press and drag', () => {
  test.beforeEach(async ({ page }) => {
    await installVsCodeMock(page);
    await page.goto('/tasks-editor.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, { type: 'viewModeChanged', viewMode: 'kanban' });
    await postMessageToWebview(page, { type: 'statusesUpdated', statuses: ['To Do', 'Done'] });
    await postMessageToWebview(page, { type: 'milestonesUpdated', milestones: [] });
    await postMessageToWebview(page, {
      type: 'tasksUpdated',
      tasks: [localTask('TASK-1'), localTask('TASK-2')],
    });
    await page.waitForTimeout(100);
    await clearPostedMessages(page);
  });

  const selects = async (page: Page) =>
    (await getPostedMessages(page)).filter((m) => m.type === 'selectTask');
  const selectTask1 = { type: 'selectTask', taskId: 'TASK-1', filePath: '/test/tasks/task-1.md' };

  test('a press does not select the card; the click that ends it does', async ({ page }) => {
    await page.locator('[data-testid="task-TASK-1"]').hover();
    await page.mouse.down();
    expect(await selects(page)).toEqual([]);
    await page.mouse.up();
    expect(await selects(page)).toEqual([selectTask1]);
  });

  test('a right-button press still selects the card on focus', async ({ page }) => {
    await page.locator('[data-testid="task-TASK-1"]').hover();
    await page.mouse.down({ button: 'right' });
    expect(await selects(page)).toEqual([selectTask1]);
    await page.mouse.up({ button: 'right' });
  });

  test('a press does not select a list row; the click that ends it does', async ({ page }) => {
    await postMessageToWebview(page, { type: 'viewModeChanged', viewMode: 'list' });
    await page.locator('[data-testid="task-row-TASK-1"]').hover();
    await clearPostedMessages(page);
    await page.mouse.down();
    expect(await selects(page)).toEqual([]);
    await page.mouse.up();
    expect(await selects(page)).toEqual([selectTask1]);
  });

  test('dragging a card to another column moves it without selecting it', async ({ page }) => {
    await page
      .locator('[data-testid="task-TASK-1"]')
      .dragTo(page.locator('[data-testid="task-list-Done"]'));
    expect(await selects(page)).toEqual([]);
    expect(await getPostedMessages(page)).toContainEqual(
      expect.objectContaining({ type: 'updateTaskStatus', taskId: 'TASK-1', status: 'Done' })
    );
  });
});
