<script lang="ts">
  let { type }: { type: string | undefined } = $props();
</script>

{#if type?.toLowerCase() === 'bug'}
  <span class="bug-badge" data-testid="bug-badge">Bug</span>
{/if}

<style>
  .bug-badge {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
    line-height: 1.2;
    color: var(--vscode-errorForeground, #dc2626);
    border: 1px solid color-mix(in srgb, var(--vscode-errorForeground, #dc2626) 60%, transparent);
  }
</style>
