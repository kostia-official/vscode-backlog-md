/**
 * The board editor tab survives a window reload: VS Code restores the panel
 * through the extension's webview serializer, pinned state included.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CdpClient } from './lib/CdpClient';
import { sleep, cdpEval, executeCommand, runCommand } from './lib/cdp-helpers';
import {
  launchVsCode,
  closeVsCode,
  waitForCdpReady,
  type VsCodeInstance,
} from './lib/vscode-launcher';
import { clearWebviewSessionCache } from './lib/webview-helpers';
import { waitForExtensionReady, waitForWebviewContent, waitForWorkbench } from './lib/wait-helpers';
import { createTestWorkspace, cleanupTestWorkspace } from './lib/test-workspace';

const CDP_PORT = 9341;

let instance: VsCodeInstance;
let workspacePath: string;

// The board tab's title is "Backlog"; a pinned tab carries the `sticky` class.
function boardTabState(cdp: CdpClient): Promise<unknown> {
  return cdpEval(
    cdp,
    `(() => {
      const tab = [...document.querySelectorAll('.tabs-container .tab')]
        .find((t) => (t.getAttribute('aria-label') || '').split(',')[0].trim() === 'Backlog');
      return tab ? { pinned: tab.classList.contains('sticky') } : null;
    })()`
  );
}

describe('Board tab restore', () => {
  beforeAll(async () => {
    workspacePath = createTestWorkspace(`cdp-tab-restore-${Date.now()}`);
    instance = await launchVsCode({ workspacePath, cdpPort: CDP_PORT });
    await waitForExtensionReady(instance.cdp);
  }, 90_000);

  afterAll(() => {
    if (instance) closeVsCode(instance);
    if (workspacePath) cleanupTestWorkspace(workspacePath);
  }, 15_000);

  it('brings the pinned board tab back after Reload Window', async () => {
    await executeCommand(instance.cdp, 'backlog.openTasksInEditor');
    await waitForWebviewContent(instance.cdp, 'tasksEditor', 'TASK-', { timeoutMs: 10_000 });
    await runCommand(instance.cdp, 'View: Pin Editor');
    expect(await boardTabState(instance.cdp)).toEqual({ pinned: true });

    await runCommand(instance.cdp, 'Developer: Reload Window');
    instance.cdp.close();
    await sleep(2_000);

    // The renderer is a new page target after a reload; reconnect to it.
    const cdp = new CdpClient();
    await cdp.connect(await waitForCdpReady(CDP_PORT));
    instance.cdp = cdp;
    clearWebviewSessionCache();
    await waitForWorkbench(cdp);

    const text = await waitForWebviewContent(cdp, 'tasksEditor', 'TASK-', { timeoutMs: 30_000 });
    expect(text).toContain('TASK-');
    expect(await boardTabState(cdp)).toEqual({ pinned: true });
  });
});
