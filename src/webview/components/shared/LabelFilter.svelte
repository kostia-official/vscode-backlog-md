<script lang="ts">
  // Multi-select label filter: a task matches when it has ANY selected label (OR).
  // "All Labels" clears the selection; shown while there are labels or a selection.
  let {
    labels,
    selected,
    onChange,
  }: { labels: string[]; selected: string[]; onChange: (next: string[]) => void } = $props();

  let root: HTMLDetailsElement | undefined = $state();

  // A selected label no task or config has any more stays listed, so it can be unchecked.
  const options = $derived([...new Set([...labels, ...selected])]);
  const summaryText = $derived(selected.length ? selected.join(', ') : 'All Labels');

  function toggle(label: string, checked: boolean) {
    onChange(checked ? [...selected, label] : selected.filter((l) => l !== label));
  }

  function clear() {
    onChange([]);
    if (root) root.open = false;
  }

  function handleWindowPointerDown(e: PointerEvent) {
    if (root?.open && !root.contains(e.target as Node)) root.open = false;
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (root?.open && e.key === 'Escape') root.open = false;
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleWindowKeydown} />

{#if options.length > 0}
  <details class="label-filter-dropdown" data-testid="label-filter" bind:this={root}>
    <summary class="label-filter" class:active={selected.length > 0} title={summaryText}>
      <span class="label-filter-text">{summaryText}</span>
    </summary>
    <div class="label-filter-popup">
      <button type="button" class="label-filter-clear" data-testid="label-filter-clear" onclick={clear}>
        All Labels
      </button>
      {#each options as label (label)}
        <label class="label-filter-option">
          <input
            type="checkbox"
            data-testid="label-filter-option-{label}"
            checked={selected.includes(label)}
            onchange={(e) => toggle(label, (e.target as HTMLInputElement).checked)}
          />
          {label}
        </label>
      {/each}
    </div>
  </details>
{/if}

<style>
  .label-filter-dropdown {
    position: relative;
    display: inline-block;
  }
  summary.label-filter {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 180px;
    list-style: none;
    user-select: none;
  }
  summary.label-filter::-webkit-details-marker {
    display: none;
  }
  summary.label-filter::after {
    content: '▾';
    flex: none;
  }
  summary.label-filter.active {
    border-color: var(--vscode-focusBorder, #007fd4);
  }
  .label-filter-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .label-filter-popup {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 20;
    min-width: 160px;
    max-height: 260px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 4px 0;
    font-size: 12px;
    background: var(--vscode-dropdown-background, #3c3c3c);
    color: var(--vscode-dropdown-foreground, #cccccc);
    border: 1px solid var(--vscode-dropdown-border, #3c3c3c);
    border-radius: 4px;
    box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
  }
  .label-filter-clear,
  .label-filter-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    cursor: pointer;
    white-space: nowrap;
  }
  .label-filter-clear {
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }
  .label-filter-clear:hover,
  .label-filter-option:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
  }
</style>
