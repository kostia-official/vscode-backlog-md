import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseMarkdown } from '../../core/parseMarkdown';

// Layout: <parent>/<workspace>/convex/turn.ts, with a task file in the
// workspace's board and a file outside the workspace next to it.
let parent: string;
let workspace: string;
let source: string;

function write(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'x');
}

function setup(workspaceName: string): void {
  parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'code-paths-')));
  workspace = path.join(parent, workspaceName);
  write(path.join(workspace, 'convex/turn.ts'));
  write(path.join(parent, 'outside.ts'));
  source = path.join(workspace, 'board/tasks/d-1 - X.md');
  write(source);
  (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = [
    { uri: { fsPath: workspace }, name: workspaceName, index: 0 },
  ];
}

const render = (markdown: string) => parseMarkdown(markdown, source);

afterEach(() => {
  fs.rmSync(parent, { recursive: true, force: true });
});

describe('linkCodePaths', () => {
  beforeEach(() => setup('dnd-ai-core'));

  it('links a workspace-relative code path at its line', async () => {
    const target = path.join(workspace, 'convex/turn.ts');
    expect(await render('see `convex/turn.ts:130`')).toContain(
      `<a href="${target}#L130" title="convex/turn.ts:130"><code>convex/turn.ts:130</code></a>`
    );
  });

  it('links a :start-end range and a #L form', async () => {
    expect(await render('`convex/turn.ts:1-5`')).toContain('turn.ts#L1-L5"');
    expect(await render('`convex/turn.ts#L7`')).toContain('turn.ts#L7"');
  });

  it("links the form written from the workspace's parent", async () => {
    expect(await render('`dnd-ai-core/convex/turn.ts`')).toContain(
      `href="${path.join(workspace, 'convex/turn.ts')}"`
    );
  });

  it('leaves missing files, fenced blocks and code inside links alone', async () => {
    expect(await render('`nope.ts`')).not.toContain('<a');
    expect(await render('```\nconvex/turn.ts\n```')).not.toContain('<a');
    const html = await render('[`convex/turn.ts`](y.md)');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="y.md"');
  });

  it('leaves a path that resolves outside the workspace plain', async () => {
    expect(await render('`../../outside.ts`')).not.toContain('<a');
    expect(await render(`\`${path.join(parent, 'outside.ts')}\``)).not.toContain('<a');
  });

  it('encodes # in the href and escapes " in the title', async () => {
    write(path.join(workspace, 'odd/a#b".md'));
    const html = await render('`odd/a#b".md`');
    expect(html).toContain(`href="${encodeURI(path.join(workspace, 'odd/a'))}%23b%22.md"`);
    expect(html).toContain('title="odd/a#b&quot;.md"');
  });

  it('does nothing without a source path', async () => {
    expect(await parseMarkdown('`convex/turn.ts`')).not.toContain('<a');
  });
});

describe('linkCodePaths in a workspace with another name', () => {
  beforeEach(() => setup('D-207-trial'));

  it('drops the first segment to resolve inside the workspace', async () => {
    expect(await render('`dnd-ai-core/convex/turn.ts:3`')).toContain(
      `href="${path.join(workspace, 'convex/turn.ts')}#L3"`
    );
  });
});
