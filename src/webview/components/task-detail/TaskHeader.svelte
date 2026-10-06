<script lang="ts">
  import type { TaskStatus, TaskPriority } from '../../lib/types';
  import { statusToClass, customStatusStyle } from '../../lib/statusColors';
  import PriorityIcon from '../shared/PriorityIcon.svelte';

  interface Props {
    taskId: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority | undefined;
    type: string | undefined;
    types: string[];
    statuses: string[];
    isBlocked: boolean;
    isReadOnly?: boolean;
    onUpdateTitle: (title: string) => void;
    onUpdateStatus: (status: string) => void;
    onUpdatePriority: (priority: string | undefined) => void;
    onUpdateType: (type: string) => void;
  }

  let {
    taskId,
    title,
    status,
    priority,
    type,
    types,
    statuses,
    isBlocked,
    isReadOnly = false,
    onUpdateTitle,
    onUpdateStatus,
    onUpdatePriority,
    onUpdateType,
  }: Props = $props();

  let titleValue = $state('');
  let originalTitle = $state('');
  let titleEl: HTMLTextAreaElement | undefined = $state();

  // Sync when title prop changes (on initial load and after save)
  $effect(() => {
    titleValue = title;
    originalTitle = title;
  });

  // Auto-resize textarea when value changes
  $effect(() => {
    // Track titleValue to trigger on changes
    void titleValue;
    requestAnimationFrame(() => autoResize());
  });

  const statusClass = $derived(statusToClass(status));
  const statusInlineStyle = $derived(customStatusStyle(status));
  const priorityClass = $derived(priority ? `priority-${priority}` : '');
  const priorities = ['high', 'medium', 'low'];
  const typeOptions = $derived(
    type && !types.some((t) => t.toLowerCase() === type.toLowerCase()) ? [...types, type] : types
  );
  const selectedType = $derived(
    typeOptions.find((t) => t.toLowerCase() === type?.toLowerCase()) ?? ''
  );
  const isBugType = $derived(selectedType.toLowerCase() === 'bug');

  function autoResize() {
    if (!titleEl) return;
    titleEl.style.height = 'auto';
    titleEl.style.height = titleEl.scrollHeight + 'px';
  }

  function handleTitleBlur() {
    const newTitle = titleValue.trim();
    if (newTitle && newTitle !== originalTitle) {
      originalTitle = newTitle;
      onUpdateTitle(newTitle);
    }
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    } else if (e.key === 'Escape') {
      titleValue = originalTitle;
      (e.target as HTMLTextAreaElement).blur();
    }
  }

  function handleStatusChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    onUpdateStatus(value);
  }

  function handleTypeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value) onUpdateType(value);
  }

  function handlePriorityChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value || undefined;
    onUpdatePriority(value);
  }
</script>

<div class="task-header">
  <div class="task-id" data-testid="task-id">{taskId}</div>
  <textarea
    class="editable-title"
    data-testid="title-input"
    bind:value={titleValue}
    bind:this={titleEl}
    disabled={isReadOnly}
    onblur={handleTitleBlur}
    onkeydown={handleTitleKeydown}
    oninput={autoResize}
    rows="1"
  ></textarea>
  <div class="task-badges">
    <select
      class="dropdown-select status-select status-{statusClass}"
      style={statusInlineStyle}
      data-testid="status-select"
      value={status}
      disabled={isReadOnly}
      onchange={handleStatusChange}
    >
      {#each statuses as s (s)}
        <option value={s}>{s}</option>
      {/each}
    </select>
    {#if typeOptions.length > 0}
      <select
        class="dropdown-select type-select"
        class:type-bug={isBugType}
        data-testid="type-select"
        value={selectedType}
        disabled={isReadOnly}
        onchange={handleTypeChange}
      >
        {#if !selectedType}
          <option value="" disabled>Type</option>
        {/if}
        {#each typeOptions as t (t)}
          <option value={t}>{t}</option>
        {/each}
      </select>
    {/if}
    <span class="priority-select-wrapper">
      {#if priority}
        <PriorityIcon priority={priority} size={16} />
      {/if}
      <select
        class="dropdown-select priority-select {priorityClass}"
        data-testid="priority-select"
        value={priority || ''}
        disabled={isReadOnly}
        onchange={handlePriorityChange}
      >
        <option value="">No Priority</option>
        {#each priorities as p (p)}
          <option value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        {/each}
      </select>
    </span>
    {#if isBlocked}
      <span class="blocked-badge" data-testid="blocked-badge">Blocked</span>
    {/if}
  </div>
</div>
