<script lang="ts">
  import type { BacklogDecision } from '../../lib/types';
  import { vscode } from '../../stores/vscode.svelte';
  import { DECISION_STATUSES } from '../../../core/types';

  let {
    decisions,
  }: {
    decisions: BacklogDecision[];
  } = $props();

  let searchQuery = $state('');

  let statusFilter = $state<string | null>(null);

  let filteredDecisions = $derived(
    decisions
      .filter((d) => statusFilter === null || d.status === statusFilter)
      .filter(
        (d) =>
          !searchQuery ||
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.status && d.status.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  );

  function handleCreateDecision() {
    vscode.postMessage({ type: 'createDecision' });
  }

  function handleOpenDecision(decisionId: string) {
    vscode.postMessage({ type: 'openDecision', decisionId });
  }

  function getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'accepted':
        return 'status-accepted';
      case 'proposed':
        return 'status-proposed';
      case 'rejected':
        return 'status-rejected';
      case 'superseded':
        return 'status-superseded';
      default:
        return 'status-unknown';
    }
  }
</script>

<div class="decisions-list">
  <div class="list-toolbar">
    <div class="filter-row">
      <div class="status-chips" role="group" aria-label="Filter by status">
        <button
          class="status-badge filter-chip status-unknown"
          class:active={statusFilter === null}
          aria-pressed={statusFilter === null}
          data-testid="decision-filter-all"
          onclick={() => (statusFilter = null)}
        >All</button>
        {#each DECISION_STATUSES as status (status)}
          <button
            class="status-badge filter-chip {getStatusBadgeClass(status)}"
            class:active={statusFilter === status}
            aria-pressed={statusFilter === status}
            data-testid="decision-filter-{status}"
            onclick={() => (statusFilter = status)}
          >{status}</button>
        {/each}
      </div>
      <button class="new-decision-btn" data-testid="new-decision-btn" onclick={handleCreateDecision}>
        New decision
      </button>
    </div>
    <div class="search-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        class="search-input"
        placeholder="Search decisions..."
        data-testid="decisions-search-input"
        bind:value={searchQuery}
      />
    </div>
  </div>

  {#if filteredDecisions.length === 0}
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m20 16-4-4 4-4"/><path d="M4 20V4"/><path d="m20 16H8a4 4 0 0 1 0-8h12"/>
      </svg>
      <p>{searchQuery || statusFilter ? 'No decisions match your filters' : 'No decisions found'}</p>
      {#if !searchQuery && !statusFilter}
        <p class="empty-hint">Add markdown files to <code>backlog/decisions/</code> to see them here</p>
      {/if}
    </div>
  {:else}
    <div class="list-items" data-testid="decisions-list-items">
      {#each filteredDecisions as decision (decision.id)}
        <button
          class="list-item"
          data-testid="decision-item-{decision.id}"
          data-decision-id={decision.id}
          onclick={() => handleOpenDecision(decision.id)}
        >
          <div class="item-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m20 16-4-4 4-4"/><path d="M4 20V4"/><path d="m20 16H8a4 4 0 0 1 0-8h12"/>
            </svg>
          </div>
          <div class="item-content">
            <div class="item-title">{decision.title}</div>
            <div class="item-meta">
              {#if decision.status}
                <span class="status-badge {getStatusBadgeClass(decision.status)}">{decision.status}</span>
              {/if}
              {#if decision.date}
                <span class="date-text">{decision.date}</span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .decisions-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .list-toolbar {
    padding: 8px;
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-widget-border, #444));
  }

  .filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .status-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .filter-chip {
    border: 1px solid transparent;
    font-family: inherit;
    cursor: pointer;
    opacity: 0.6;
  }

  .filter-chip.active {
    opacity: 1;
    border-color: currentColor;
  }

  .filter-chip:focus-visible,
  .new-decision-btn:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
  }

  .new-decision-btn {
    border: none;
    border-radius: 2px;
    padding: 2px 8px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }

  .new-decision-btn:hover {
    background: var(--vscode-button-hoverBackground, #1177bb);
  }

  .search-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--vscode-input-background, #3c3c3c);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    color: var(--vscode-input-foreground, #ccc);
  }

  .search-wrapper svg {
    flex-shrink: 0;
    opacity: 0.6;
  }

  .search-input {
    all: unset;
    flex: 1;
    font-size: 12px;
    line-height: 20px;
    color: var(--vscode-input-foreground, #ccc);
  }

  .search-input::placeholder {
    color: var(--vscode-input-placeholderForeground, #888);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 16px;
    color: var(--vscode-descriptionForeground, #888);
    text-align: center;
  }

  .empty-state p {
    margin: 0;
    font-size: 12px;
  }

  .empty-hint {
    opacity: 0.7;
    font-size: 11px !important;
  }

  .empty-hint code {
    background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.17));
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 11px;
  }

  .list-items {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .list-item {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .list-item:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
  }

  .list-item:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }

  .item-icon {
    flex-shrink: 0;
    padding-top: 1px;
    color: var(--vscode-descriptionForeground, #888);
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 13px;
    color: var(--vscode-foreground, #ccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
    align-items: center;
  }

  .status-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: capitalize;
    font-weight: 500;
  }

  .status-accepted {
    background: rgba(76, 175, 80, 0.2);
    color: #81c784;
  }

  .status-proposed {
    background: rgba(33, 150, 243, 0.2);
    color: #64b5f6;
  }

  .status-rejected {
    background: rgba(244, 67, 54, 0.2);
    color: #ef9a9a;
  }

  .status-superseded {
    background: rgba(255, 152, 0, 0.2);
    color: #ffb74d;
  }

  .status-unknown {
    background: rgba(158, 158, 158, 0.2);
    color: #bdbdbd;
  }

  .date-text {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #888);
  }
</style>
