import { describe, it, expect } from 'vitest';
import { createBacklogDocumentSelector } from '../../language/documentSelector';

describe('createBacklogDocumentSelector with task_home', () => {
  it('also matches the real task files the links point to', () => {
    const selector = createBacklogDocumentSelector('board', 'tasks-management/{ID}-{slug}/task.md');
    expect(selector).toContainEqual({
      language: 'markdown',
      pattern: '**/tasks-management/*-*/task.md',
    });
    expect(createBacklogDocumentSelector('board')).toHaveLength(4);
  });
});
