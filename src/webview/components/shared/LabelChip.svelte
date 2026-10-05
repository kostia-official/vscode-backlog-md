<script module lang="ts">
  import { createContext } from 'svelte';

  // Each webview root that renders chips sets what a chip click does.
  export const [getAddLabel, setAddLabel] = createContext<(label: string) => void>();
</script>

<script lang="ts">
  let { label }: { label: string } = $props();

  const addLabel = getAddLabel();

  // The chip sits inside a card or row that selects or opens on these events;
  // stopping them keeps a chip click to the label alone.
  const stop = (e: Event) => e.stopPropagation();
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  }
</script>

<button
  type="button"
  class="task-label label-chip"
  data-testid="label-chip-{label}"
  title="Filter by {label}"
  onclick={(e) => {
    e.stopPropagation();
    addLabel(label);
  }}
  ondblclick={stop}
  onkeydown={handleKeydown}
>{label}</button>

<style>
  .label-chip {
    border: none;
    font-family: inherit;
    cursor: pointer;
  }
  .label-chip:hover {
    text-decoration: underline;
  }
  .label-chip:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 1px;
  }
</style>
