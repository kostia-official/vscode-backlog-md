import { describe, it, expect } from 'vitest';
import { getTaskTypeValues, isBugType } from '../../core/taskTypes';

const CLI_DEFAULTS = ['bug', 'feature', 'enhancement', 'task', 'chore', 'docs', 'spike'];

describe('getTaskTypeValues', () => {
  it('trims, drops empty entries and dedupes case-insensitively, keeping the first spelling', () => {
    expect(getTaskTypeValues([' Bug ', 'bug', '', 'Task', 'TASK', '  '])).toEqual(['Bug', 'Task']);
  });

  it('accepts a single string', () => {
    expect(getTaskTypeValues(' Bug ')).toEqual(['Bug']);
  });

  it('falls back to the CLI defaults when nothing usable is configured', () => {
    expect(getTaskTypeValues(undefined)).toEqual(CLI_DEFAULTS);
    expect(getTaskTypeValues([])).toEqual(CLI_DEFAULTS);
    expect(getTaskTypeValues(['', ' '])).toEqual(CLI_DEFAULTS);
    expect(getTaskTypeValues(42)).toEqual(CLI_DEFAULTS);
  });
});

describe('isBugType', () => {
  it('matches bug in any case and with spaces, nothing else', () => {
    expect(isBugType('Bug')).toBe(true);
    expect(isBugType(' bug ')).toBe(true);
    expect(isBugType('Task')).toBe(false);
    expect(isBugType(undefined)).toBe(false);
  });
});
