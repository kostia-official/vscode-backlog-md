<script lang="ts">
  import LabelFilter from '../shared/LabelFilter.svelte';

  let {
    milestoneGrouping,
    onToggleGrouping,
    labels,
    selected,
    onLabelsChange,
  }: {
    milestoneGrouping: boolean;
    onToggleGrouping: (enabled: boolean) => void;
    labels: string[];
    selected: string[];
    onLabelsChange: (next: string[]) => void;
  } = $props();
</script>

<div class="kanban-toolbar">
  <div class="grouping-toggle">
    <button
      class="grouping-btn"
      class:active={!milestoneGrouping}
      data-grouping="none"
      onclick={() => onToggleGrouping(false)}
    >
      All Tasks
    </button>
    <button
      class="grouping-btn"
      class:active={milestoneGrouping}
      data-grouping="milestone"
      onclick={() => onToggleGrouping(true)}
    >
      By Milestone
    </button>
  </div>
  <LabelFilter {labels} {selected} onChange={onLabelsChange} />
</div>

<style>
  .kanban-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
