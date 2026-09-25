/**
 * The editor-tab board (`tasks-editor-page`) shows every view as a tab, with no "More" menu.
 */
import { test, expect } from '@playwright/test';
import {
  installVsCodeMock,
  postMessageToWebview,
  getLastPostedMessage,
} from './fixtures/vscode-mock';

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
