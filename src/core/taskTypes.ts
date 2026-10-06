// Same fallback as the CLI's DEFAULT_TASK_TYPES when the config has no usable types.
const CLI_DEFAULT_TASK_TYPES = ['bug', 'feature', 'enhancement', 'task', 'chore', 'docs', 'spike'];

/** Config `types` normalised like the CLI's getTaskTypeValues; a single string counts as one type. */
export function getTaskTypeValues(configured: unknown): string[] {
  const entries =
    typeof configured === 'string' ? [configured] : Array.isArray(configured) ? configured : [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of entries) {
    const value = String(entry ?? '').trim();
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }
  return values.length > 0 ? values : [...CLI_DEFAULT_TASK_TYPES];
}

export function isBugType(type: string | undefined): boolean {
  return type?.trim().toLowerCase() === 'bug';
}
