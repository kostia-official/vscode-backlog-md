import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as vscode from 'vscode';
import { createMockExtensionContext } from '../mocks/vscode';
import { TasksPanelProvider } from '../../providers/TasksPanelProvider';
import { BacklogParser } from '../../core/BacklogParser';

/**
 * The board tab comes back after a window reload: VS Code hands the restored
 * panel to the registered serializer, which wires it like a freshly opened one.
 */
describe('TasksPanelProvider serializer', () => {
  const extensionUri = vscode.Uri.file('/test/extension');
  let context: vscode.ExtensionContext;
  let parser: BacklogParser;

  function makePanel() {
    return {
      webview: {
        html: '',
        options: {},
        asWebviewUri: vi.fn((uri) => uri),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
        postMessage: vi.fn().mockResolvedValue(true),
        cspSource: 'test-csp',
      },
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewPanel;
  }

  function registeredSerializer(): vscode.WebviewPanelSerializer {
    const calls = (vscode.window.registerWebviewPanelSerializer as Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('backlog.tasksEditor');
    return calls[0][1];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockExtensionContext() as unknown as vscode.ExtensionContext;
    parser = {
      getTasks: vi.fn().mockResolvedValue([]),
      getTasksWithCrossBranch: vi.fn().mockResolvedValue([]),
      getConfig: vi.fn().mockResolvedValue({}),
      getStatuses: vi.fn().mockResolvedValue(['To Do', 'Done']),
      getMilestones: vi.fn().mockResolvedValue([]),
      getDrafts: vi.fn().mockResolvedValue([]),
      getCompletedTasks: vi.fn().mockResolvedValue([]),
      getArchivedTasks: vi.fn().mockResolvedValue([]),
    } as unknown as BacklogParser;
  });

  it('registers one serializer and keeps it in the extension subscriptions', () => {
    new TasksPanelProvider(extensionUri, parser, context);
    registeredSerializer();
    expect(context.subscriptions).toHaveLength(1);
  });

  it('adopts a restored panel: webview options, html, message wiring', async () => {
    const provider = new TasksPanelProvider(extensionUri, parser, context);
    const panel = makePanel();

    await registeredSerializer().deserializeWebviewPanel(panel, undefined);

    expect(panel.webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: [extensionUri],
    });
    expect(panel.webview.html).toContain('tasks-editor-page');
    expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
    expect(provider.isOpen()).toBe(true);
    expect(panel.dispose).not.toHaveBeenCalled();

    // reveal() now reuses the restored panel instead of creating one
    provider.reveal();
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
    expect(panel.reveal).toHaveBeenCalled();
  });

  it('disposes a second restored panel while one is already open', async () => {
    const provider = new TasksPanelProvider(extensionUri, parser, context);
    (vscode.window.createWebviewPanel as Mock).mockReturnValue(makePanel());
    provider.reveal();

    const extra = makePanel();
    await registeredSerializer().deserializeWebviewPanel(extra, undefined);

    expect(extra.dispose).toHaveBeenCalled();
    expect(extra.webview.onDidReceiveMessage).not.toHaveBeenCalled();
  });
});
