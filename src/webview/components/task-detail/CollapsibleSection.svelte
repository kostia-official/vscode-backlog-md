<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionToggle from './SectionToggle.svelte';
  import { isSectionOpen, toggleSection } from '../../stores/sectionCollapse.svelte';

  interface Props {
    name: string;
    hasContent: boolean;
    children: Snippet;
  }

  let { name, hasContent, children }: Props = $props();

  const open = $derived(isSectionOpen(name, hasContent));
  const testId = $derived(`toggle-${name.toLowerCase().replace(/\s+/g, '-')}`);
</script>

<!-- Wraps a section that renders its own title: open, the chevron sits at the
     section's top right; collapsed, one header row with the name remains. -->
{#if open}
  <div class="collapsible-open">
    <div class="corner-toggle">
      <SectionToggle open onToggle={() => toggleSection(name, hasContent)} {testId} label="Collapse {name}" />
    </div>
    {@render children()}
  </div>
{:else}
  <div class="section">
    <div class="section-header">
      <SectionToggle open={false} onToggle={() => toggleSection(name, hasContent)} {testId}>{name}</SectionToggle>
    </div>
  </div>
{/if}

<style>
  .collapsible-open {
    position: relative;
  }

  .corner-toggle {
    position: absolute;
    top: 0;
    right: 0;
  }
</style>
