import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { ContentDetailProvider } from '../../providers/ContentDetailProvider';
import { TaskDetailProvider } from '../../providers/TaskDetailProvider';

// Each webview bundle has its own CSS file next to the shared styles.css.
const webview = {
  cspSource: 'csp',
  asWebviewUri: (uri: { fsPath: string }) => uri.fsPath,
} as unknown as vscode.Webview;

type HtmlBuilder = { getHtmlContent(webview: vscode.Webview, title?: string): string };

describe('detail webview HTML', () => {
  it('content detail links content-detail.css after styles.css', () => {
    const provider = new ContentDetailProvider(vscode.Uri.file('/ext'), undefined);
    const html = (provider as unknown as HtmlBuilder).getHtmlContent(webview);
    expect(html).toMatch(
      /href="\/ext\/dist\/webview\/styles\.css"[\s\S]*href="\/ext\/dist\/webview\/content-detail\.css"/
    );
  });

  it('task detail links task-detail.css after styles.css', () => {
    const provider = new TaskDetailProvider(vscode.Uri.file('/ext'), undefined);
    const html = (provider as unknown as HtmlBuilder).getHtmlContent(webview, 'T');
    expect(html).toMatch(
      /href="\/ext\/dist\/webview\/styles\.css"[\s\S]*href="\/ext\/dist\/webview\/task-detail\.css"/
    );
  });
});
