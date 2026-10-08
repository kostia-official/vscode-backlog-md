import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
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
  currentTaskRef: unknown;
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
  statics.currentTaskRef = undefined;
  statics.currentFilePath = undefined;
  vi.clearAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('TaskDetailProvider.onFileChanged', () => {
  it('reloads the panel when the realpath of the open task changes', () => {
    const provider = { openTask: vi.fn() } as unknown as TaskDetailProvider;
    TaskDetailProvider.onFileChanged({ fsPath: realPath } as vscode.Uri, provider);
    expect(provider.openTask).toHaveBeenCalledWith('D-1', { reveal: false });
  });

  it('ignores an unrelated path', () => {
    const provider = { openTask: vi.fn() } as unknown as TaskDetailProvider;
    const other = path.join(root, 'D-2-y/task.md');
    TaskDetailProvider.onFileChanged({ fsPath: other } as vscode.Uri, provider);
    expect(provider.openTask).not.toHaveBeenCalled();
  });
});

// A file change refreshes the panel in place; only a user open brings it to the front.
describe('TaskDetailProvider.openTask reveal', () => {
  const panel = () => ({
    reveal: vi.fn(),
    dispose: vi.fn(),
    title: '',
    visible: false,
    webview: { postMessage: vi.fn() },
  });

  function providerFor(id: string) {
    const task = { id, title: id, status: 'To Do', filePath: realPath };
    const parser = { getTask: vi.fn().mockResolvedValue(task) };
    const provider = new TaskDetailProvider(vscode.Uri.file('/ext'), parser as never);
    const sendTaskData = vi.fn().mockResolvedValue(undefined);
    (provider as unknown as { sendTaskData: unknown }).sendTaskData = sendTaskData;
    return { provider, sendTaskData };
  }

  const onActive = vi.fn();
  beforeEach(() => TaskDetailProvider.onActiveTaskChanged(onActive));

  it('reveal: false refreshes the open panel without bringing it to the front', async () => {
    const p = panel();
    statics.currentPanel = p;
    statics.currentTaskRef = { taskId: 'D-1', filePath: realPath };
    const { provider, sendTaskData } = providerFor('D-1');
    await provider.openTask('D-1', { reveal: false });
    expect(p.reveal).not.toHaveBeenCalled();
    expect(sendTaskData).toHaveBeenCalledWith(
      p.webview,
      expect.objectContaining({ id: 'D-1' }),
      expect.any(Function)
    );
    expect(onActive).not.toHaveBeenCalled();
  });

  it('reveal: false on a visible panel keeps the card highlight', async () => {
    const p = { ...panel(), visible: true };
    statics.currentPanel = p;
    statics.currentTaskRef = { taskId: 'D-1', filePath: realPath };
    const { provider } = providerFor('D-1');
    await provider.openTask('D-1', { reveal: false });
    expect(onActive).toHaveBeenCalledWith('D-1');
  });

  it('reveal: false shows no error when the task cannot be read', async () => {
    statics.currentPanel = panel();
    const { provider } = providerFor('D-1');
    (provider as unknown as { parser: { getTask: Mock } }).parser.getTask.mockResolvedValue(
      undefined
    );
    await provider.openTask('D-1', { reveal: false });
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('a refresh that a later open overtakes posts no stale data', async () => {
    statics.currentPanel = panel();
    statics.currentTaskRef = { taskId: 'D-1', filePath: realPath };
    const { provider, sendTaskData } = providerFor('D-1');
    let release!: () => void;
    sendTaskData.mockImplementationOnce(
      (_w: unknown, _t: unknown, isStale: () => boolean) =>
        new Promise<void>((done) => (release = () => (expect(isStale()).toBe(true), done())))
    );
    const refresh = provider.openTask('D-1', { reveal: false });
    await vi.waitFor(() => expect(sendTaskData).toHaveBeenCalledTimes(1));
    await provider.openTask('D-1');
    release();
    await refresh;
  });

  it('reveal: false never creates a panel', async () => {
    statics.currentPanel = undefined;
    statics.currentTaskId = undefined;
    const { provider } = providerFor('D-1');
    await provider.openTask('D-1', { reveal: false });
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it('reveal: false leaves a panel that now shows another task', async () => {
    const p = panel();
    statics.currentPanel = p;
    statics.currentTaskId = 'D-2';
    const { provider, sendTaskData } = providerFor('D-1');
    await provider.openTask('D-1', { reveal: false });
    expect(sendTaskData).not.toHaveBeenCalled();
    expect(statics.currentTaskId).toBe('D-2');
  });

  it('a user open brings the panel to the front', async () => {
    const p = panel();
    statics.currentPanel = p;
    const { provider } = providerFor('D-3');
    await provider.openTask('D-3');
    expect(p.reveal).toHaveBeenCalled();
  });
});
