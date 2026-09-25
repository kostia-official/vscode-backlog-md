import { vscode } from './vscode.svelte';

interface SectionState {
  sectionsOpen?: Record<string, boolean>;
}

// Open/closed choices per section name, kept in the webview state so they
// carry across tasks while the detail panel lives. A section with no stored
// choice is open when it has content.
const sectionsOpen = $state<Record<string, boolean>>({
  ...vscode.getState<SectionState>()?.sectionsOpen,
});

export function isSectionOpen(name: string, hasContent: boolean): boolean {
  return sectionsOpen[name] ?? hasContent;
}

export function toggleSection(name: string, hasContent: boolean): void {
  setSectionOpen(name, !isSectionOpen(name, hasContent));
}

export function setSectionOpen(name: string, open: boolean): void {
  sectionsOpen[name] = open;
  vscode.setState({ ...vscode.getState<SectionState>(), sectionsOpen: { ...sectionsOpen } });
}
