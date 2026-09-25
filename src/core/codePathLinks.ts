import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { isInsideWorkspace } from './openWorkspaceFile';

// A path-like code span: no spaces, then an optional `:12`, `:12-20`, `:12,30`,
// `:12:4` or `#L12[-L20]` line suffix.
const CODE_PATH = /^([^\s:]+?)(?::(\d+)(?:([-,:])(\d+))?|#L(\d+)(?:-L?(\d+))?)?$/;

// Skips `<pre>` blocks and existing links; captures the text of inline `<code>`.
const CODE_SPAN = /<pre[\s>][\s\S]*?<\/pre>|<a\s[\s\S]*?<\/a>|<code>([^<]*)<\/code>/gi;

/**
 * Turns inline `<code>` spans whose text names an existing file inside the
 * workspace into links, e.g. `` `convex/turn.ts:130` `` or the
 * `dnd-ai-core/convex/turn.ts` form written from the workspace's parent.
 */
export function linkCodePaths(html: string, sourceFilePath: string): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return html;
  return html.replace(CODE_SPAN, (match, code: string | undefined) => {
    if (code === undefined) return match;
    const text = decodeEntities(code);
    const parsed = CODE_PATH.exec(text);
    if (!parsed) return match;
    const [, filePath, colonStart, separator, colonEnd, hashStart, hashEnd] = parsed;
    if (!filePath.includes('/') && !/\.[A-Za-z0-9]+$/.test(filePath)) return match;
    const target = resolveCodePath(filePath, sourceFilePath, folders);
    if (!target) return match;
    let href = encodeURI(target).replace(/#/g, '%23');
    const start = colonStart ?? hashStart;
    if (start) {
      // `:a,b` names two separate lines and `:a:col` a column; both reveal line a.
      const end = hashEnd ?? (separator === '-' ? colonEnd : undefined);
      href += end ? `#L${start}-L${end}` : `#L${start}`;
    }
    return `<a href="${href}" title="${escapeHtml(text)}">${match}</a>`;
  });
}

function resolveCodePath(
  filePath: string,
  sourceFilePath: string,
  folders: readonly vscode.WorkspaceFolder[]
): string | undefined {
  const bases = [path.dirname(safeRealpath(sourceFilePath) ?? sourceFilePath)];
  for (const folder of folders) bases.push(folder.uri.fsPath);
  for (const folder of folders) bases.push(path.dirname(folder.uri.fsPath));
  const candidates = bases.map((base) => path.resolve(base, filePath));
  const rest = filePath.split('/').slice(1).join('/');
  if (rest) {
    for (const folder of folders) candidates.push(path.resolve(folder.uri.fsPath, rest));
  }
  for (const candidate of candidates) {
    const real = safeRealpath(candidate);
    if (!real || !isInsideWorkspace(real, folders)) continue;
    try {
      if (fs.statSync(real).isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

function safeRealpath(fsPath: string): string | undefined {
  try {
    return fs.realpathSync(fsPath);
  } catch {
    return undefined;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
