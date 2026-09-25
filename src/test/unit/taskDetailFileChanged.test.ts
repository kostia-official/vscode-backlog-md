import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TaskDetailProvider } from '../../providers/TaskDetailProvider';

// The detail panel holds the link path; the watcher reports the real task.md.
let root: string;
let linkPath: string;
let realPath: string;

const statics = TaskDetailProvider as unknown as {
  currentPanel: unknown;
  currentTaskId: string | undefined;
  currentFilePath: string | undefined;
};

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'detail-changed-')));
  realPath = path.join(root, 'D-1-x/task.md');
  fs.mkdirSync(path.dirname(realPath), { recursive: true });
  fs.writeFileSync(realPath, 'x');
  linkPath = path.join(root, 'board/tasks/d-1 - X.md');
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync('../../D-1-x/task.md', linkPath);
  statics.currentPanel = { dispose: vi.fn() };
  statics.currentTaskId = 'D-1';
  statics.currentFilePath = linkPath;
});

afterEach(() => {
  statics.currentPanel = undefined;
  statics.currentTaskId = undefined;
  statics.currentFilePath = undefined;
  fs.rmSync(root, { recursive: true, force: true });
});

describe('TaskDetailProvider.onFileChanged', () => {
  it('reloads the panel when the realpath of the open task changes', () => {
    const provider = { openTask: vi.fn() } as unknown as TaskDetailProvider;
    TaskDetailProvider.onFileChanged({ fsPath: realPath } as vscode.Uri, provider);
    expect(provider.openTask).toHaveBeenCalledWith('D-1', { preserveFocus: true });
  });

  it('ignores an unrelated path', () => {
    const provider = { openTask: vi.fn() } as unknown as TaskDetailProvider;
    const other = path.join(root, 'D-2-y/task.md');
    TaskDetailProvider.onFileChanged({ fsPath: other } as vscode.Uri, provider);
    expect(provider.openTask).not.toHaveBeenCalled();
  });
});
