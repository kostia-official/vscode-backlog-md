import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { BacklogParser } from '../../core/BacklogParser';
import { BacklogWriter } from '../../core/BacklogWriter';

// A decision file as `backlog decision create` (1.53.0-kz.5) writes it, with
// section text added the way an agent fills it in.
const CLI_DECISION = `---
id: decision-1
title: Use SQLite for the rules index
date: '2026-09-25 14:49'
status: proposed
---
## Context

The rules corpus needs a query layer.
See [the index](../docs/index.md) and \`bin/rules\`.

## Decision

Use SQLite.

## Consequences

One more binary dependency.
`;

function bodyOf(content: string): string {
  return content.slice(content.indexOf('\n---\n', 4) + 5);
}

function hasBacklogCli(): boolean {
  try {
    execFileSync('backlog', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('decision status change', () => {
  let root: string;
  let backlogPath: string;
  let filePath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'decision-status-'));
    backlogPath = path.join(root, 'backlog');
    fs.mkdirSync(path.join(backlogPath, 'decisions'), { recursive: true });
    fs.writeFileSync(
      path.join(backlogPath, 'config.yml'),
      'project_name: "fixture"\nstatuses: ["To Do", "In Progress", "Done"]\n'
    );
    filePath = path.join(
      backlogPath,
      'decisions',
      'decision-1 - Use-SQLite-for-the-rules-index.md'
    );
    fs.writeFileSync(filePath, CLI_DECISION);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('changes only the status and leaves the body byte-identical', async () => {
    const parser = new BacklogParser(backlogPath);
    await new BacklogWriter().updateDecision('DECISION-1', { status: 'accepted' }, parser);

    const written = fs.readFileSync(filePath, 'utf-8');
    expect(bodyOf(written)).toBe(bodyOf(CLI_DECISION));
    expect((await parser.getDecision('DECISION-1'))?.status).toBe('accepted');
  });

  it.skipIf(!hasBacklogCli())('the fork CLI still lists the rewritten decision', async () => {
    const parser = new BacklogParser(backlogPath);
    await new BacklogWriter().updateDecision('DECISION-1', { status: 'superseded' }, parser);

    const out = execFileSync('backlog', ['decision', 'list', '--plain'], {
      cwd: root,
      encoding: 'utf-8',
    });
    expect(out).toContain('decision-1 - Use SQLite for the rules index (superseded)');
  });
});
