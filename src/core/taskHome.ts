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
