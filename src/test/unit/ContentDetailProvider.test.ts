import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as vscode from 'vscode';
import { ContentDetailProvider } from '../../providers/ContentDetailProvider';
import type { BacklogParser } from '../../core/BacklogParser';

// vscode mock is provided via vitest.config.ts alias

describe('ContentDetailProvider ready handshake', () => {
  let postMessage: Mock;
  let receive: (message: unknown) => Promise<void>;
  let dispose: () => void;
  let provider: ContentDetailProvider;

  function newPanel() {
    postMessage = vi.fn().mockResolvedValue(true);
    const panel = {
      webview: {
        html: '',
        cspSource: 'test-csp',
        asWebviewUri: vi.fn((uri) => uri),
        postMessage,
        onDidReceiveMessage: vi.fn((cb) => {
          receive = cb;
          return { dispose: vi.fn() };
        }),
      },
      reveal: vi.fn(),
      title: '',
      onDidDispose: vi.fn((cb) => {
        dispose = cb;
        return { dispose: vi.fn() };
      }),
    };
    (vscode.window.createWebviewPanel as Mock).mockReturnValue(panel);
  }

  const decisionPosts = () =>
    postMessage.mock.calls.map(([m]) => m).filter((m) => m.type === 'decisionData');

  beforeEach(() => {
    newPanel();
    const parser = {
      getDecision: vi.fn(async (id: string) => ({ id, title: id, filePath: `/d/${id}.md` })),
    } as unknown as BacklogParser;
    provider = new ContentDetailProvider(vscode.Uri.file('/ext'), parser);
  });

  afterEach(() => {
    dispose?.();
  });

  it('posts nothing to a new panel until the webview sends ready, then posts once', async () => {
    await provider.openDecision('decision-1');
    expect(postMessage).not.toHaveBeenCalled();

    await receive({ type: 'ready' });
    expect(decisionPosts()).toHaveLength(1);
    expect(decisionPosts()[0].decision.id).toBe('decision-1');
  });

  it('posts only the last of two opens made before ready', async () => {
    await provider.openDecision('decision-1');
    await provider.openDecision('decision-2');
    await receive({ type: 'ready' });

    expect(decisionPosts()).toHaveLength(1);
    expect(decisionPosts()[0].decision.id).toBe('decision-2');
  });

  it('posts at once on a ready panel', async () => {
    await provider.openDecision('decision-1');
    await receive({ type: 'ready' });
    await provider.openDecision('decision-2');

    expect(decisionPosts().map((m) => m.decision.id)).toEqual(['decision-1', 'decision-2']);
  });

  it('posts the pending payload again on a second ready', async () => {
    await provider.openDecision('decision-1');
    await receive({ type: 'ready' });
    await receive({ type: 'ready' });

    expect(decisionPosts().map((m) => m.decision.id)).toEqual(['decision-1', 'decision-1']);
  });

  it('waits for ready again on a new panel after dispose', async () => {
    await provider.openDecision('decision-1');
    await receive({ type: 'ready' });
    dispose();

    newPanel();
    await provider.openDecision('decision-2');
    expect(postMessage).not.toHaveBeenCalled();
    await receive({ type: 'ready' });
    expect(decisionPosts().map((m) => m.decision.id)).toEqual(['decision-2']);
  });
});
