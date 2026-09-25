import * as vscode from 'vscode';

/**
 * Watches the backlog folder for file changes and notifies listeners
 */
export class FileWatcher implements vscode.Disposable {
  private watchers: vscode.FileSystemWatcher[] = [];
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  /**
   * Event that fires when a task file changes
   */
  readonly onDidChange = this._onDidChange.event;

  constructor(backlogPath: string) {
    // Watch for all markdown files in the backlog folder
    this.addPattern(backlogPath, '**/*.md');
  }

  /**
   * Also watch `glob` under `base` — e.g. the task directories that the
   * symlinks under the backlog folder point into.
   */
  addPattern(base: string, glob: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(base, glob)
    );

    // Forward all change events
    watcher.onDidChange((uri) => {
      this._onDidChange.fire(uri);
    });

    watcher.onDidCreate((uri) => {
      this._onDidChange.fire(uri);
    });

    watcher.onDidDelete((uri) => {
      this._onDidChange.fire(uri);
    });

    this.watchers.push(watcher);
  }

  dispose() {
    this.watchers.forEach((watcher) => watcher.dispose());
    this._onDidChange.dispose();
  }
}
