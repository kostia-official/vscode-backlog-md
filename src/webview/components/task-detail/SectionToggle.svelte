<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onToggle: () => void;
    testId: string;
    label?: string;
    children?: Snippet;
  }

  let { open, onToggle, testId, label, children }: Props = $props();
</script>

<button
  type="button"
  class="section-toggle"
  class:section-title={!!children}
  aria-expanded={open}
  aria-label={children ? undefined : label}
  data-testid={testId}
  onclick={onToggle}
>
  <svg class="chevron" class:closed={!open} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6"/>
  </svg>
  {@render children?.()}
</button>

<style>
  .section-toggle {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--vscode-descriptionForeground, #858585);
  }

  .section-toggle.section-title {
    margin-bottom: 0;
  }

  .section-toggle:hover {
    color: var(--vscode-foreground, #cccccc);
  }

  .section-toggle:focus-visible {
    outline: 1px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: 2px;
  }

  .chevron {
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .chevron.closed {
    transform: rotate(-90deg);
  }
</style>
