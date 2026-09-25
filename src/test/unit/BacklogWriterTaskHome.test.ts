import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as vscode from 'vscode';
import { BacklogWriter } from '../../core/BacklogWriter';
import { BacklogParser } from '../../core/BacklogParser';
import { BacklogCli } from '../../core/BacklogCli';

const CONFIG = [
  'project_name: "t"',
  'default_status: "Backlog"',
  'statuses: ["Backlog", "In Progress", "Done"]',
  'task_prefix: "D"',
  'auto_commit: false',
  'remote_operations: false',
  'check_active_branches: false',
  'backlog_directory: "tasks-management/board"',
  'task_home: "tasks-management/{ID}-{slug}/task.md"',
  '',
].join('\n');

function taskFile(id: string, title: string): string {
  return `---\nid: ${id}\ntitle: ${title}\nstatus: Backlog\n---\n\n## Description\n\nBody of ${id}\n`;
}

/** A project laid out like ours: task files in `board/` are links into task directories. */
function makeProject(): { root: string; board: string; parser: BacklogParser } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'task-home-')));
  const board = path.join(root, 'tasks-management', 'board');
  fs.writeFileSync(path.join(root, 'backlog.config.yml'), CONFIG);
  fs.mkdirSync(path.join(board, 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(board, 'drafts'), { recursive: true });
  addLinkedTask(root, 'tasks', 'D-1', 'x');
  fs.writeFileSync(
    path.join(board, 'drafts', 'draft-3 - Untitled.md'),
    taskFile('DRAFT-3', 'Untitled')
  );
  const parser = new BacklogParser(board, path.join(root, 'backlog.config.yml'), root);
  return { root, board, parser };
}

function addLinkedTask(root: string, folder: string, id: string, slug: string): string {
  const dir = path.join(root, 'tasks-management', `${id}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'task.md'), taskFile(id, slug.toUpperCase()));
  const linkDir = path.join(root, 'tasks-management', 'board', folder);
  fs.mkdirSync(linkDir, { recursive: true });
  const link = path.join(linkDir, `${id.toLowerCase()} - ${slug.toUpperCase()}.md`);
  fs.symlinkSync(path.relative(linkDir, path.join(dir, 'task.md')), link);
  return link;
}

describe('BacklogWriter with task_home', () => {
  let root: string;
  let board: string;
  let parser: BacklogParser;
  const writer = new BacklogWriter();
  let run: MockInstance<typeof BacklogCli.run>;

  beforeEach(() => {
    ({ root, board, parser } = makeProject());
    run = vi.spyOn(BacklogCli, 'run').mockResolvedValue('');
    vi.mocked(vscode.window.showWarningMessage).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('completes and archives through the CLI in the project root', async () => {
    const completed = await writer.completeTask('D-1', parser);
    expect(run).toHaveBeenLastCalledWith(['task', 'complete', 'D-1'], root);
    expect(completed).toBe(path.join(board, 'completed', 'd-1 - X.md'));

    const archived = await writer.archiveTask('D-1', parser);
    expect(run).toHaveBeenLastCalledWith(['task', 'archive', 'D-1'], root);
    expect(archived).toBe(path.join(board, 'archive', 'tasks', 'd-1 - X.md'));
  });

  it('refuses an id that is not a plain task id before running anything', async () => {
    for (const id of ['D-1; x', '--help']) {
      await expect(writer.completeTask(id, parser)).rejects.toThrow('Invalid task id');
      await expect(writer.archiveTask(id, parser)).rejects.toThrow('Invalid task id');
      await expect(writer.promoteDraft(id, parser)).rejects.toThrow('Invalid task id');
      await expect(writer.createSubtask(id, board, parser, 'T')).rejects.toThrow('Invalid task id');
    }
    expect(run).not.toHaveBeenCalled();
  });

  it('creates a subtask with the title as one argv element after --', async () => {
    const file = path.join(board, 'tasks', 'd-1.1 - t.md');
    run.mockResolvedValue(`Created task D-1.1\nFile: ${file}\n`);

    for (const title of ['"; rm -rf ~', '-x']) {
      const result = await writer.createSubtask('D-1', board, parser, title);
      expect(run).toHaveBeenLastCalledWith(['task', 'create', '-p', 'D-1', '--', title], root);
      expect(result).toEqual({ id: 'D-1.1', filePath: file });
    }
  });

  it('refuses a subtask without a title', async () => {
    await expect(writer.createSubtask('D-1', board, parser)).rejects.toThrow('needs a title');
    expect(run).not.toHaveBeenCalled();
  });

  describe('promoteDraft', () => {
    it('takes the new id from the CLI output', async () => {
      run.mockResolvedValue('Promoted draft DRAFT-3 to D-12\n');
      expect(await writer.promoteDraft('DRAFT-3', parser)).toBe('D-12');
      expect(run).toHaveBeenCalledWith(['draft', 'promote', 'DRAFT-3'], root);
    });

    it('falls back to the one task that appeared when the output has no id', async () => {
      run.mockImplementation(async () => {
        addLinkedTask(root, 'tasks', 'D-2', 'untitled');
        return 'Promoted draft DRAFT-3\n';
      });
      expect(await writer.promoteDraft('DRAFT-3', parser)).toBe('D-2');
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    it.each([
      ['no', []],
      ['two', ['D-2', 'D-3']],
    ])('warns and returns undefined when %s new tasks appeared', async (_label, ids) => {
      run.mockImplementation(async () => {
        ids.forEach((id) => addLinkedTask(root, 'tasks', id, `n${id}`));
        return 'Promoted draft DRAFT-3\n';
      });
      expect(await writer.promoteDraft('DRAFT-3', parser)).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });
  });

  it('restores an archived link so it still resolves to the same task.md', async () => {
    fs.unlinkSync(path.join(board, 'tasks', 'd-1 - X.md'));
    const archived = addLinkedTask(root, 'archive/tasks', 'D-5', 'y');
    const target = fs.realpathSync(archived);
    const before = fs.readFileSync(target);

    const restored = await writer.restoreArchivedTask('D-5', parser);

    expect(restored).toBe(path.join(board, 'tasks', 'd-5 - Y.md'));
    expect(fs.lstatSync(restored).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(restored)).toBe(target);
    expect(fs.existsSync(archived)).toBe(false);
    expect(fs.readFileSync(target).equals(before)).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses to delete a linked task or demote, but deletes a draft', async () => {
    await expect(writer.deleteTask('D-1', parser)).rejects.toThrow('Delete is disabled');
    await expect(writer.demoteTask('D-1', parser)).rejects.toThrow('Demote is disabled');
    expect(fs.existsSync(path.join(root, 'tasks-management', 'D-1-x', 'task.md'))).toBe(true);

    await writer.deleteTask('DRAFT-3', parser);
    expect(fs.existsSync(path.join(board, 'drafts', 'draft-3 - Untitled.md'))).toBe(false);
  });
});

const hasBacklog = (() => {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', ['backlog']);
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasBacklog)('BacklogWriter with task_home and the real backlog CLI', () => {
  it('promotes a draft written by createDraft into a task directory with a link', async () => {
    const { root, board, parser } = makeProject();
    try {
      fs.rmSync(path.join(board, 'drafts'), { recursive: true });
      fs.rmSync(path.join(board, 'tasks'), { recursive: true });
      fs.rmSync(path.join(root, 'tasks-management', 'D-1-x'), { recursive: true });
      const writer = new BacklogWriter();
      const draft = await writer.createDraft(board, parser);

      const id = await writer.promoteDraft(draft.id, parser);

      expect(id).toBe('D-1');
      const home = path.join(root, 'tasks-management', 'D-1-untitled', 'task.md');
      expect(fs.existsSync(home)).toBe(true);
      const task = await parser.getTask('D-1');
      expect(task && fs.lstatSync(task.filePath).isSymbolicLink()).toBe(true);
      expect(task && fs.realpathSync(task.filePath)).toBe(home);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
