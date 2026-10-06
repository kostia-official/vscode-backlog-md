import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('vscode', () => ({ EventEmitter: class {} }));
import { findBoards } from '../../core/BacklogWorkspaceManager';

function board(dir: string) {
  mkdirSync(join(dir, 'tasks-management/board/tasks'), { recursive: true });
  writeFileSync(
    join(dir, 'backlog.config.yml'),
    'project_name: "P"\nbacklog_directory: "tasks-management/board"\n'
  );
}

describe('findBoards', () => {
  it('finds a board in a direct child folder, not deeper', () => {
    const root = mkdtempSync(join(tmpdir(), 'fb-'));
    board(join(root, 'core'));
    board(join(root, 'a/b'));
    mkdirSync(join(root, 'empty'));
    mkdirSync(join(root, 'aaa-plain/backlog/tasks'), { recursive: true });
    const found = findBoards(root);
    expect(found.map((r) => r.projectRoot)).toEqual([join(root, 'core')]);
    expect(found[0].backlogPath).toBe(join(root, 'core/tasks-management/board'));
  });

  it("prefers the folder's own board over its children", () => {
    const root = mkdtempSync(join(tmpdir(), 'fb-'));
    board(root);
    board(join(root, 'core'));
    expect(findBoards(root).map((r) => r.projectRoot)).toEqual([root]);
  });
});
