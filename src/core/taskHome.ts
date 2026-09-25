import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BacklogCli } from './BacklogCli';
import type { BacklogParser } from './BacklogParser';
import type { BacklogConfig } from './types';

/**
 * The `task_home` template from config, when set. With it, task files under
 * `tasks/` are symlinks into per-task directories, so task commands go through
 * the backlog CLI instead of moving files.
 */
export function readTaskHome(config: BacklogConfig): string | undefined {
  return typeof config.task_home === 'string' && config.task_home !== ''
    ? config.task_home
    : undefined;
}

/**
 * Throws unless `id` is a plain task id (`D-12`, `task-3.1`), so it can never
 * be read by the CLI as an option or carry anything else into an argv.
 */
export function assertTaskId(id: string): void {
  if (!/^[A-Z]+-\d+(\.\d+)*$/i.test(id)) {
    throw new Error(`Invalid task id: ${id}`);
  }
}

/** The `task_home` template as a glob: every `{…}` placeholder becomes `*`. */
export function taskHomeGlob(taskHome: string): string {
  return taskHome.replace(/\{[^}]*\}/g, '*');
}

/**
 * Moves the symlink `src` into `destDir` under the same name, re-pointed with
 * a relative target so it still resolves to the same file. Returns the new path.
 */
export function moveLink(src: string, destDir: string): string {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(src));
  fs.symlinkSync(path.relative(fs.realpathSync(destDir), fs.realpathSync(src)), dest);
  fs.unlinkSync(src);
  return dest;
}

/** Runs the backlog CLI in the project root. */
export function taskCli(parser: BacklogParser, args: string[]): Promise<string> {
  return BacklogCli.run(args, parser.getProjectRoot());
}

// Task ids as the CLI prints them; a trailing `.` ends the id.
const ID = '([A-Z]+-\\d+(?:\\.\\d+)*)';

/**
 * `backlog task complete|archive <id>`: the CLI moves the link and cleans the
 * dependencies itself. Returns where the link now lives.
 */
export async function cliMoveTask(
  parser: BacklogParser,
  taskId: string,
  command: 'complete' | 'archive'
): Promise<string> {
  assertTaskId(taskId);
  const task = await parser.getTask(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  await taskCli(parser, ['task', command, taskId]);
  parser.invalidateTaskCache();
  const folder = command === 'complete' ? 'completed' : path.join('archive', 'tasks');
  return path.join(parser.getBacklogPath(), folder, path.basename(task.filePath));
}

/**
 * `backlog draft promote <id>`. The new id comes from the CLI's output, else
 * from the one task that appeared. When neither tells it, warns and returns
 * undefined — the draft is promoted either way.
 */
export async function cliPromoteDraft(
  parser: BacklogParser,
  draftId: string
): Promise<string | undefined> {
  assertTaskId(draftId);
  const before = new Set((await parser.getTasks()).map((t) => t.id));
  const output = await taskCli(parser, ['draft', 'promote', draftId]);
  parser.invalidateTaskCache();
  const printed = new RegExp(`Promoted draft \\S+ to ${ID}`, 'i').exec(output)?.[1];
  if (printed) return printed;

  const added = (await parser.getTasks()).map((t) => t.id).filter((id) => !before.has(id));
  if (added.length === 1) return added[0];
  void vscode.window.showWarningMessage(
    `Draft ${draftId} was promoted, but its new task id is unknown (${added.length} new tasks).`
  );
  void vscode.commands.executeCommand('backlog.refresh');
  return undefined;
}

/** `backlog task create -p <parent> -- <title>`; id and path from its output. */
export async function cliCreateSubtask(
  parser: BacklogParser,
  parentTaskId: string,
  title?: string
): Promise<{ id: string; filePath: string }> {
  assertTaskId(parentTaskId);
  if (!title) {
    throw new Error('A subtask needs a title while task_home is set');
  }
  const output = await taskCli(parser, ['task', 'create', '-p', parentTaskId, '--', title]);
  const id = new RegExp(`Created task ${ID}`, 'i').exec(output)?.[1];
  const file = /^File: (.+?)\s*$/m.exec(output)?.[1];
  if (!id || !file) {
    throw new Error(`Unexpected backlog output: ${output.trim()}`);
  }
  parser.invalidateTaskCache();
  return { id, filePath: path.resolve(parser.getProjectRoot(), file) };
}
