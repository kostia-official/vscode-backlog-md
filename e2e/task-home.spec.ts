/**
 * Task detail actions when `task_home` is set: task files are symlinks into
 * task directories, so Delete is hidden for linked tasks and Archive for a
 * task in the terminal status (the CLI refuses it).
 */
import { test, expect, type Page } from '@playwright/test';
import { installVsCodeMock, postMessageToWebview } from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

const task: Task = {
  id: 'D-1',
  title: 'Linked task',
  status: 'Backlog',
  labels: [],
  assignee: [],
  dependencies: [],
  acceptanceCriteria: [],
  definitionOfDone: [],
  filePath: '/p/tasks-management/board/tasks/d-1 - Linked-task.md',
};

const baseData = {
  task,
  statuses: ['Backlog', 'In Progress', 'Done'],
  priorities: ['high', 'medium', 'low'],
  uniqueLabels: [],
  uniqueAssignees: [],
  milestones: [],
  blocksTaskIds: [],
  linkableTasks: [],
  isBlocked: false,
  descriptionHtml: '',
  planHtml: '',
  notesHtml: '',
  finalSummaryHtml: '',
};

async function open(page: Page, data: Record<string, unknown>) {
  await installVsCodeMock(page);
  await page.goto('/task-detail.html');
  await page.waitForTimeout(100);
  await postMessageToWebview(page, { type: 'taskData', data: { ...baseData, ...data } });
  await expect(page.locator('[data-testid="open-file-btn"]')).toBeVisible();
}

test.describe('Task detail actions with task_home', () => {
  test('a linked task has Archive but no Delete', async ({ page }) => {
    await open(page, { taskHome: true });
    await expect(page.locator('[data-testid="archive-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-btn"]')).toHaveCount(0);
  });

  test('a draft can still be discarded', async ({ page }) => {
    await open(page, {
      taskHome: true,
      isDraft: true,
      task: { ...task, id: 'DRAFT-3', status: 'Draft' },
    });
    await expect(page.locator('[data-testid="discard-draft-btn"]')).toBeVisible();
  });

  test('an archived draft keeps Delete Permanently, an archived task loses it', async ({
    page,
  }) => {
    await open(page, { taskHome: true, isArchived: true, isDraft: true });
    await expect(page.locator('[data-testid="delete-permanently-btn"]')).toBeVisible();
    await open(page, { taskHome: true, isArchived: true });
    await expect(page.locator('[data-testid="restore-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-permanently-btn"]')).toHaveCount(0);
  });

  test('a task in the terminal status has no Archive', async ({ page }) => {
    await open(page, { taskHome: true, task: { ...task, status: 'Done' } });
    await expect(page.locator('[data-testid="archive-btn"]')).toHaveCount(0);
  });

  test('without task_home, Delete and Archive stay as upstream', async ({ page }) => {
    await open(page, { task: { ...task, status: 'Done' } });
    await expect(page.locator('[data-testid="archive-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-btn"]')).toBeVisible();
  });
});
