/**
 * Collapsible task detail sections: empty ones start collapsed, filled ones
 * open, Description never collapses, and a toggled choice outlives a reload
 * of the task data.
 */
import { test, expect } from '@playwright/test';
import { installVsCodeMock, postMessageToWebview } from './fixtures/vscode-mock';
import type { Task } from '../src/webview/lib/types';

const task: Task = {
  id: 'TASK-1',
  title: 'Collapse me',
  status: 'To Do',
  description: 'Some description.',
  labels: [],
  assignee: [],
  dependencies: [],
  acceptanceCriteria: [{ id: 1, text: 'It works', checked: false }],
  definitionOfDone: [],
  implementationPlan: '1. Step one',
  filePath: '/test/backlog/tasks/task-1.md',
};

const taskData = {
  task,
  statuses: ['To Do', 'Done'],
  priorities: ['high', 'medium', 'low'],
  uniqueLabels: [],
  uniqueAssignees: [],
  milestones: [],
  blocksTaskIds: [],
  linkableTasks: [],
  descriptionHtml: '<p>Some description.</p>',
  planHtml: '<ol><li>Step one</li></ol>',
  notesHtml: '',
  finalSummaryHtml: '',
};

test.describe('Task detail collapsible sections', () => {
  test.beforeEach(async ({ page }) => {
    await installVsCodeMock(page);
    await page.goto('/task-detail.html');
    await page.waitForTimeout(100);
    await postMessageToWebview(page, { type: 'taskData', data: taskData });
  });

  test('a filled section starts open, an empty one collapsed', async ({ page }) => {
    await expect(page.locator('[data-testid="toggle-implementationPlan"]')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(page.locator('[data-testid="implementationPlan-view"]')).toContainText('Step one');
    await expect(page.locator('[data-testid="toggle-acceptanceCriteria"]')).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(page.locator('[data-testid="toggle-implementationNotes"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.locator('[data-testid="implementationNotes-view"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="toggle-definitionOfDone"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.locator('[data-testid="definitionOfDone-add"]')).toHaveCount(0);
  });

  test('Description has no toggle and stays open', async ({ page }) => {
    await expect(page.locator('[data-testid="toggle-description"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="description-view"]')).toContainText(
      'Some description.'
    );
  });

  test('Edit on a collapsed section opens it in edit mode', async ({ page }) => {
    await page.locator('[data-testid="edit-implementationNotes-btn"]').click();
    await expect(page.locator('[data-testid="toggle-implementationNotes"]')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(
      page.locator('[data-testid="implementationNotes-section"] [data-testid="markdown-editor"]')
    ).toBeVisible();
  });

  test('Details collapses to one header row and opens again', async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-details"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.meta-grid')).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveText('Details');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('a toggled state survives a new taskData and is kept in webview state', async ({ page }) => {
    await page.locator('[data-testid="toggle-implementationPlan"]').click();
    await page.locator('[data-testid="toggle-implementationNotes"]').click();

    await postMessageToWebview(page, {
      type: 'taskData',
      data: { ...taskData, task: { ...task, id: 'TASK-2', title: 'Another' } },
    });
    await expect(page.locator('[data-testid="task-id"]')).toHaveText('TASK-2');

    await expect(page.locator('[data-testid="toggle-implementationPlan"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.locator('[data-testid="implementationNotes-view"]')).toContainText(
      'No notes'
    );

    const state = await page.evaluate(
      () =>
        (
          window as unknown as { __vscodeTestHelpers: { getState: () => unknown } }
        ).__vscodeTestHelpers.getState() as { sectionsOpen?: Record<string, boolean> }
    );
    expect(state.sectionsOpen).toEqual({
      'Implementation Plan': false,
      'Implementation Notes': true,
    });
  });
});
