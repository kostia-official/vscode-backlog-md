import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { assertTaskId, moveLink, readTaskHome, taskHomeGlob } from '../../core/taskHome';

describe('taskHome', () => {
  it('turns every placeholder of the template into a glob star', () => {
    expect(taskHomeGlob('tasks-management/{ID}-{slug}/task.md')).toBe(
      'tasks-management/*-*/task.md'
    );
  });

  it('reads task_home only when it is a non-empty string', () => {
    expect(readTaskHome({ task_home: 'a/{ID}/task.md' })).toBe('a/{ID}/task.md');
    expect(readTaskHome({ task_home: '' })).toBeUndefined();
    expect(readTaskHome({})).toBeUndefined();
  });

  it('accepts plain and dotted task ids and nothing that could reach argv as more', () => {
    for (const id of ['D-1', 'task-12', 'DRAFT-3', 'D-1.2.3']) {
      expect(() => assertTaskId(id)).not.toThrow();
    }
    for (const id of ['D-1; x', '--help', '-D-1', 'D-1 ', 'D-', '../D-1', 'D-1\n-x']) {
      expect(() => assertTaskId(id)).toThrow('Invalid task id');
    }
  });

  it('moves a link with a relative target that still resolves to the same file', () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'move-link-')));
    try {
      fs.mkdirSync(path.join(root, 'D-1-x'));
      fs.writeFileSync(path.join(root, 'D-1-x', 'task.md'), 'body');
      fs.mkdirSync(path.join(root, 'board', 'archive', 'tasks'), { recursive: true });
      const src = path.join(root, 'board', 'archive', 'tasks', 'd-1 - X.md');
      fs.symlinkSync('../../../D-1-x/task.md', src);

      const dest = moveLink(src, path.join(root, 'board', 'tasks'));

      expect(dest).toBe(path.join(root, 'board', 'tasks', 'd-1 - X.md'));
      expect(fs.readlinkSync(dest)).toBe(path.join('..', '..', 'D-1-x', 'task.md'));
      expect(fs.readFileSync(dest, 'utf-8')).toBe('body');
      expect(fs.existsSync(src)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
