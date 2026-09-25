import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../core/parseMarkdown';

async function href(markdown: string): Promise<string | undefined> {
  const html = await parseMarkdown(markdown);
  return /href="([^"]*)"/.exec(html)?.[1];
}

describe('parseMarkdown line suffixes in link targets', () => {
  it('rewrites :line to #L<line>', async () => {
    expect(await href('[a](file.ts:12)')).toBe('file.ts#L12');
  });

  it('rewrites :start-end to #L<start>-L<end>', async () => {
    expect(await href('[a](dir/file.ts:12-20)')).toBe('dir/file.ts#L12-L20');
  });

  it('rewrites :line,line to the first line', async () => {
    expect(await href('[a](file.ts:12,30)')).toBe('file.ts#L12');
  });

  it('rewrites :line:col to the line', async () => {
    expect(await href('[a](../x/file.md:7:3)')).toBe('../x/file.md#L7');
  });

  it('leaves URLs with a port, mailto and fragment-only links alone', async () => {
    expect(await href('[a](https://x.com:8080/a)')).toBe('https://x.com:8080/a');
    expect(await href('[a](mailto:me@x.com)')).toBe('mailto:me@x.com');
    expect(await href('[a](#L12)')).toBe('#L12');
  });

  it('leaves a path without a line suffix alone', async () => {
    expect(await href('[a](./x.request.md)')).toBe('./x.request.md');
  });
});
