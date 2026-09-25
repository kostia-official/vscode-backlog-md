import { linkCodePaths } from './codePathLinks';
import { sanitizeMarkdownSource } from './sanitizeMarkdown';

let markedParse: ((markdown: string) => string | Promise<string>) | null = null;

async function getMarkedParse(): Promise<(markdown: string) => string | Promise<string>> {
  if (!markedParse) {
    const { marked } = await import('marked');
    marked.setOptions({ gfm: true, breaks: true });
    markedParse = marked.parse;
  }
  return markedParse;
}

// Webviews don't show a URL status bar on hover, so without a title attribute
// link destinations are invisible to the user. Inject title={href} on anchors
// that don't already declare one so the native browser tooltip reveals the target.
export function addLinkTitles(html: string): string {
  return html.replace(/<a\s+([^>]*?)>/gi, (match, attrs: string) => {
    if (/\btitle\s*=/i.test(attrs)) return match;
    const hrefMatch = /\bhref\s*=\s*"([^"]*)"/i.exec(attrs);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    if (!href || href.startsWith('#')) return match;
    return `<a ${attrs} title="${href}">`;
  });
}

// Webviews read `name.ts:12` as a URL scheme and never post it, so a relative
// href ending in `:a`, `:a:col`, `:a,b` or `:a-b` after a file extension is
// rewritten to the `#La[-Lb]` fragment the host understands.
export function rewriteLineSuffixes(html: string): string {
  return html.replace(
    /(<a\s[^>]*?\bhref\s*=\s*")([^"]*)"/gi,
    (match, prefix: string, href: string) => {
      if (href.includes('://') || /^mailto:/i.test(href) || href.includes('#')) return match;
      const line = /^(.*\.[A-Za-z0-9]+):(\d+)(?::\d+|([-,])(\d+))?$/.exec(href);
      if (!line) return match;
      const [, file, start, separator, end] = line;
      const fragment = separator === '-' ? `#L${start}-L${end}` : `#L${start}`;
      return `${prefix}${file}${fragment}"`;
    }
  );
}

// `sourceFilePath` is the file the markdown was read from; with it, inline code
// spans that name an existing file become links.
export async function parseMarkdown(markdown: string, sourceFilePath?: string): Promise<string> {
  const parse = await getMarkedParse();
  const safe = sanitizeMarkdownSource(markdown);
  const result = parse(safe);
  const html = rewriteLineSuffixes(
    addLinkTitles(typeof result === 'string' ? result : await result)
  );
  return sourceFilePath ? linkCodePaths(html, sourceFilePath) : html;
}
