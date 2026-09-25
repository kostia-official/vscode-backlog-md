import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BacklogCli } from '../../core/BacklogCli';

// A fake `backlog` on PATH that echoes its cwd and each argument on its own line.
describe.skipIf(process.platform === 'win32')('BacklogCli.run', () => {
  let dir: string;
  let savedPath: string | undefined;

  beforeAll(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-run-')));
    fs.writeFileSync(
      path.join(dir, 'backlog'),
      '#!/bin/sh\nif [ "$1" = fail ]; then echo "  Draft x not found.  " >&2; exit 1; fi\n' +
        'pwd\nfor a in "$@"; do echo "[$a]"; done\n',
      { mode: 0o755 }
    );
    savedPath = process.env.PATH;
    process.env.PATH = `${dir}${path.delimiter}${savedPath}`;
  });

  afterAll(() => {
    process.env.PATH = savedPath;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('passes every argument as-is, with no shell, in the given cwd', async () => {
    const out = await BacklogCli.run(['task', 'create', '--', '"; echo pwned $HOME', '-x'], dir);
    expect(out.split('\n')).toEqual([
      dir,
      '[task]',
      '[create]',
      '[--]',
      '["; echo pwned $HOME]',
      '[-x]',
      '',
    ]);
  });

  it('throws with the trimmed stderr on a non-zero exit', async () => {
    await expect(BacklogCli.run(['fail'], dir)).rejects.toThrow(/^Draft x not found\.$/);
  });
});
