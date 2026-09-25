import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { openWorkspaceFile } from '../../core/openWorkspaceFile';
import { resetAllMocks } from '../mocks/vscode';

// A board whose task file is a symlink into the task's own directory, on a real
// temp dir so realpath and stat see real links.
let root: string;
let outside: string;
let linkPath: string;

function write(file: string, content = 'x'): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function opened(): string | undefined {
  const call = (vscode.commands.executeCommand as Mock).mock.calls.find(
    ([command]) => command === 'vscode.open'
  );
  return call?.[1]?.fsPath;
}

beforeEach(() => {
  resetAllMocks();
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'owf-symlink-')));
  outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'owf-outside-')));
  write(path.join(root, 'D-1-x/task.md'));
  write(path.join(root, 'D-1-x/sibling.md'));
  write(path.join(root, 'board/tasks/sibling.md'));
  write(path.join(root, 'board/tasks/plain.md'));
  write(path.join(outside, 'secret.md'));
  linkPath = path.join(root, 'board/tasks/d-1 - X.md');
  fs.symlinkSync('../../D-1-x/task.md', linkPath);
  (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = [
    { uri: { fsPath: root }, name: 'root', index: 0 },
  ];
  (vscode.workspace.fs.stat as Mock).mockImplementation(async (uri: { fsPath: string }) => {
    const stat = fs.statSync(uri.fsPath);
    return { type: stat.isDirectory() ? 2 : 1, size: stat.size };
  });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

describe('openWorkspaceFile with a symlinked source', () => {
  it('resolves a relative link from the directory of the link target', async () => {
    await openWorkspaceFile('./sibling.md', null, linkPath);
    expect(opened()).toBe(path.join(root, 'D-1-x/sibling.md'));
  });

  it('resolves from the source directory when the source is a plain file', async () => {
    await openWorkspaceFile('./sibling.md', null, path.join(root, 'board/tasks/plain.md'));
    expect(opened()).toBe(path.join(root, 'board/tasks/sibling.md'));
  });

  it('falls back to the source directory when realpath of the source throws', async () => {
    await openWorkspaceFile('./sibling.md', null, path.join(root, 'board/tasks/gone.md'));
    expect(opened()).toBe(path.join(root, 'board/tasks/sibling.md'));
  });

  it('opens an absolute path inside the workspace', async () => {
    const target = path.join(root, 'D-1-x/sibling.md');
    await openWorkspaceFile(target, null);
    expect(opened()).toBe(target);
  });

  it('refuses an absolute path outside the workspace with the old warning', async () => {
    const target = path.join(outside, 'secret.md');
    await openWorkspaceFile(target, null);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      `Refusing to open absolute path outside workspace: ${target}`
    );
    expect(opened()).toBeUndefined();
  });

  it('refuses a symlink inside the workspace that points outside it', async () => {
    const leak = path.join(root, 'leak.md');
    fs.symlinkSync(path.join(outside, 'secret.md'), leak);
    await openWorkspaceFile(leak, null);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      `Refusing to open path outside workspace: ${leak}`
    );
    expect(opened()).toBeUndefined();
  });
});
