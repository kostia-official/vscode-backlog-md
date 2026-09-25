import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { FileWatcher } from '../../core/FileWatcher';

type Handler = (uri: vscode.Uri) => void;

// Each fake watcher records its pattern and lets the test fire its events.
const { created } = vi.hoisted(() => ({
  created: [] as Array<{ pattern: unknown; fire: Record<string, Handler>; dispose: () => void }>,
}));

vi.mock('vscode', async (importOriginal) => {
  const original = await importOriginal<typeof import('vscode')>();
  return {
    ...original,
    RelativePattern: class {
      constructor(
        public base: string,
        public pattern: string
      ) {}
    },
    workspace: {
      ...original.workspace,
      createFileSystemWatcher: vi.fn((pattern: unknown) => {
        const fire: Record<string, Handler> = {};
        const watcher = {
          pattern,
          fire,
          dispose: vi.fn(),
          onDidChange: (h: Handler) => (fire.change = h),
          onDidCreate: (h: Handler) => (fire.create = h),
          onDidDelete: (h: Handler) => (fire.delete = h),
        };
        created.push(watcher);
        return watcher;
      }),
    },
  };
});

describe('FileWatcher.addPattern', () => {
  it('watches one more glob, forwards its events, and disposes it with the rest', () => {
    created.length = 0;
    const watcher = new FileWatcher('/p/board');
    const seen: string[] = [];
    watcher.onDidChange((uri) => seen.push(String(uri)));

    watcher.addPattern('/p', 'tasks-management/*-*/task.md');

    expect(created.map((w) => w.pattern)).toEqual([
      { base: '/p/board', pattern: '**/*.md' },
      { base: '/p', pattern: 'tasks-management/*-*/task.md' },
    ]);
    const extra = created[1];
    extra.fire.change('changed' as unknown as vscode.Uri);
    extra.fire.create('created' as unknown as vscode.Uri);
    extra.fire.delete('deleted' as unknown as vscode.Uri);
    expect(seen).toEqual(['changed', 'created', 'deleted']);

    watcher.dispose();
    expect(created.every((w) => vi.mocked(w.dispose).mock.calls.length === 1)).toBe(true);
  });
});
