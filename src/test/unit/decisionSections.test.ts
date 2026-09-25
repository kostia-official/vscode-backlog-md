import { describe, it, expect } from 'vitest';
import { BacklogParser } from '../../core/BacklogParser';

// A decision body whose sections hold their own headings, lists, a table, a
// fenced block with a `## ` line, and headings named like the sections.
const DECISION = `---
id: decision-7
title: Where the rules index lives
date: '2026-09-25'
status: accepted
---
## Context

# Background
The rules need a query layer.

## Decision drivers
- speed
- one file

### Options
1. SQLite
2. JSON

| option | size |
| --- | --- |
| SQLite | 4 MB |

\`\`\`md
## Decision
not a section
\`\`\`

> quoted

## Decision

Use [SQLite](../docs/index.md).

## Consequences

One more binary.

## Alternatives

JSON files.
`;

describe('parseDecisionContent sections', () => {
  const parser = new BacklogParser('/fake/backlog');
  const decision = parser.parseDecisionContent(DECISION, '/fake/decisions/decision-7.md')!;

  it('keeps other headings, lists, tables and fences inside the current section', () => {
    expect(decision.context).toContain('# Background');
    expect(decision.context).toContain('## Decision drivers\n- speed\n- one file');
    expect(decision.context).toContain('### Options\n1. SQLite');
    expect(decision.context).toContain('| SQLite | 4 MB |');
    expect(decision.context).toContain('```md\n## Decision\nnot a section\n```');
    expect(decision.context).toContain('> quoted');
  });

  it('starts a section only on its exact heading', () => {
    expect(decision.title).toBe('Where the rules index lives');
    expect(decision.decision).toBe('Use [SQLite](../docs/index.md).');
    expect(decision.consequences).toBe('One more binary.');
    expect(decision.alternatives).toBe('JSON files.');
  });
});

describe('parseDecisionContent text before the first section', () => {
  it('opens Context instead of being dropped', () => {
    const parser = new BacklogParser('/fake/backlog');
    const decision = parser.parseDecisionContent(
      '# Pick a queue\n\nWe need one by Friday.\n\n## Context\n\nTwo options.\n\n## Decision\n\nRedis.\n',
      '/fake/decisions/decision-8 - Pick-a-queue.md'
    )!;
    expect(decision.title).toBe('Pick a queue');
    expect(decision.context).toBe('We need one by Friday.\n\nTwo options.');
    expect(decision.decision).toBe('Redis.');
  });
});

describe('parseDecisionContent headings and fences', () => {
  const parser = new BacklogParser('/fake/backlog');
  const parse = (body: string) =>
    parser.parseDecisionContent(
      `---\ntitle: Pick a queue\nstatus: proposed\n---\n${body}`,
      '/fake/decisions/decision-9.md'
    )!;

  it('skips a leading # line that repeats the frontmatter title', () => {
    const decision = parse('# Pick a queue\n\nWhy now.\n\n## Context\n\nTwo options.\n');
    expect(decision.context).toBe('Why now.\n\nTwo options.');
  });

  it('keeps a # line inside a section as content', () => {
    const decision = parse('## Decision\n\n# Redis\n\nFast enough.\n');
    expect(decision.title).toBe('Pick a queue');
    expect(decision.decision).toBe('# Redis\n\nFast enough.');
  });

  it('closes a fence only on the same char at least as long', () => {
    const body = '## Context\n\n````md\n```\n~~~\n## Decision\n````\n\n## Decision\n\nRedis.\n';
    const decision = parse(body);
    expect(decision.context).toBe('````md\n```\n~~~\n## Decision\n````');
    expect(decision.decision).toBe('Redis.');
  });
});
