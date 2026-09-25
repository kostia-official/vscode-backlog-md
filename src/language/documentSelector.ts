import type * as vscode from 'vscode';
import { taskHomeGlob } from '../core/taskHome';

/**
 * Create a DocumentSelector that scopes language providers to backlog task files.
 * Matches markdown files inside {backlogDir}/{tasks,drafts,completed,archive}/ directories,
 * and with `taskHome` set also the real task files those links point to.
 */
export function createBacklogDocumentSelector(
  backlogDir: string = 'backlog',
  taskHome?: string
): vscode.DocumentSelector {
  const taskHomeFilters = taskHome
    ? [{ language: 'markdown', pattern: `**/${taskHomeGlob(taskHome)}` }]
    : [];
  return [
    { language: 'markdown', pattern: `**/${backlogDir}/tasks/**/*.md` },
    { language: 'markdown', pattern: `**/${backlogDir}/drafts/**/*.md` },
    { language: 'markdown', pattern: `**/${backlogDir}/completed/**/*.md` },
    { language: 'markdown', pattern: `**/${backlogDir}/archive/**/*.md` },
    ...taskHomeFilters,
  ];
}
