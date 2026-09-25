<script lang="ts">
  import { renderMermaidAction } from '../../lib/mermaidAction';
  import MarkdownEditor from '../shared/MarkdownEditor.svelte';
  import { vscode } from '../../stores/vscode.svelte';
  import SectionToggle from './SectionToggle.svelte';
  import { isSectionOpen, setSectionOpen, toggleSection } from '../../stores/sectionCollapse.svelte';

  interface Props {
    taskId: string;
    title: string;
    fieldName: string;
    content: string;
    contentHtml: string;
    emptyLabel?: string;
    onUpdate: (value: string) => void;
    isReadOnly?: boolean;
  }

  let {
    taskId,
    title,
    fieldName,
    content,
    contentHtml,
    emptyLabel = `No ${title.toLowerCase()}`,
    onUpdate,
    isReadOnly = false,
  }: Props = $props();

  let isEditing = $state(false);

  // Description is always open; every other field collapses, empty ones by default.
  const collapsible = $derived(fieldName !== 'description');
  const open = $derived(!collapsible || isSectionOpen(title, content !== ''));
  let prevTaskId = '';
  let suppressUpdate = false;

  $effect(() => {
    if (taskId !== prevTaskId) {
      prevTaskId = taskId;
      suppressUpdate = true;
      isEditing = false;
      queueMicrotask(() => {
        suppressUpdate = false;
      });
    }
  });

  function guardedUpdate(value: string) {
    if (!suppressUpdate) {
      onUpdate(value);
    }
  }

  function toggleEdit() {
    if (isReadOnly) return;
    isEditing = !isEditing;
    if (isEditing && !open) setSectionOpen(title, true);
  }

  function handleViewClick() {
    if (isReadOnly) return;
    isEditing = true;
  }

  function handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const link = target?.closest?.('a') as HTMLAnchorElement | null;
    if (link) {
      const href = link.getAttribute('href');
      if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        event.preventDefault();
        event.stopPropagation();
        const [relativePath, fragment] = href.split('#');
        vscode.postMessage({
          type: 'openWorkspaceFile',
          relativePath,
          fragment: fragment ?? null,
        });
        return;
      }
    }
    handleViewClick();
  }
</script>

<div class="section" data-testid="{fieldName}-section">
  <div class="section-header">
    {#if collapsible}
      <SectionToggle {open} onToggle={() => toggleSection(title, content !== '')} testId="toggle-{fieldName}">{title}</SectionToggle>
    {:else}
      <div class="section-title">{title}</div>
    {/if}
    <button
      class="edit-btn"
      data-testid="edit-{fieldName}-btn"
      onclick={toggleEdit}
      onpointerdown={(e) => isEditing && e.stopPropagation()}
      disabled={isReadOnly}
    >
      {isEditing ? 'Done' : 'Edit'}
    </button>
  </div>
  {#if open}
    <div class="description-container">
      {#if isEditing}
        <MarkdownEditor
          content={content}
          placeholder="Add {title.toLowerCase()}..."
          onUpdate={guardedUpdate}
          onExit={() => (isEditing = false)}
          {isReadOnly}
        />
      {:else}
        <div
          class="markdown-content description-view"
          data-testid="{fieldName}-view"
          onclick={handleContentClick}
          onkeydown={(e) => e.key === 'Enter' && handleViewClick()}
          role="button"
          tabindex={isReadOnly ? -1 : 0}
          use:renderMermaidAction={contentHtml}
        >
          {#if contentHtml}
            {@html contentHtml}
          {:else}
            <em class="empty-value">{emptyLabel}</em>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
