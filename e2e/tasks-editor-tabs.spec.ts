/**
 * The editor-tab board (`tasks-editor-page`): every view as a tab with no "More" menu, and card press and drag.
 */
import { test, expect } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getLastPostedMessage,
  getPostedMessages,
  clearPostedMessages,
} from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

const ALL_TABS = ['kanban', 'list', 'dashboard', 'drafts', 'archived', 'docs', 'decisions'];

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

  test('shows the draft count on the Drafts tab unless it is active', async ({ page }) => {
    await postMessageToWebview(page, { type: 'draftCountUpdated', count: 3 });
    await expect(page.locator('[data-testid="tab-draft-badge"]')).toHaveText('3');
    await page.locator('[data-testid="tab-drafts"]').click();
    await expect(page.locator('[data-testid="tab-draft-badge"]')).toHaveCount(0);
  });

  test('scrolls the bar at 360px instead of cutting off tabs', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 600 });
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

  const selects = async (page: Parameters<typeof getPostedMessages>[0]) =>
    (await getPostedMessages(page)).filter((m) => m.type === 'selectTask');

  test('a press does not select the card; the click that ends it does', async ({ page }) => {
    await page.locator('[data-testid="task-TASK-1"]').hover();
    await page.mouse.down();
    expect(await selects(page)).toEqual([]);
    await page.mouse.up();
    expect(await selects(page)).toEqual([
      { type: 'selectTask', taskId: 'TASK-1', filePath: '/test/tasks/task-1.md' },
    ]);
  });

  test('dragging a card to another column moves it without selecting it', async ({ page }) => {
    await page
      .locator('[data-testid="task-TASK-1"]')
      .dragTo(page.locator('[data-testid="task-list-Done"]'));
    const messages = await getPostedMessages(page);
    expect(messages.filter((m) => m.type === 'selectTask')).toEqual([]);
    expect(messages).toContainEqual(
      expect.objectContaining({ type: 'updateTaskStatus', taskId: 'TASK-1', status: 'Done' })
    );
  });
});
