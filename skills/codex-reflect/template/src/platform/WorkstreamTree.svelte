<script lang="ts">
  import type { ReportViewModel, Workstream } from './types';

  let { report, selectedId, analysisSelected = false, onAnalysis, onSelect }: {
    report: ReportViewModel;
    selectedId: string;
    analysisSelected?: boolean;
    onAnalysis: () => void;
    onSelect: (id: string) => void;
  } = $props();

  let collapsed = $state<string[]>([]);
  type Row = { workstream: Workstream; depth: number; last: boolean };
  const sessionTime = (item: Workstream): number => item.start && !Number.isNaN(Date.parse(item.start)) ? Date.parse(item.start) : Number.MAX_SAFE_INTEGER;

  function rows(): Row[] {
    const result: Row[] = [];
    const seen = new Set<string>();
    function visit(id: string, depth: number, last: boolean) {
      const workstream = report.byId.get(id);
      if (!workstream || seen.has(id)) return;
      seen.add(id); result.push({ workstream, depth, last });
      if (collapsed.includes(id)) return;
      workstream.childIds.forEach((childId, index) => visit(childId, depth + 1, index === workstream.childIds.length - 1));
    }
    const threads = report.workstreams.filter((item) => item.isThreadRoot).sort((left, right) => sessionTime(left) - sessionTime(right) || left.id.localeCompare(right.id));
    threads.forEach((item, index) => visit(item.id, 0, index === threads.length - 1));
    return result;
  }

  const visibleRows = $derived.by(() => {
    collapsed;
    return rows();
  });
  function toggle(event: MouseEvent, id: string) {
    event.preventDefault(); event.stopPropagation();
    collapsed = collapsed.includes(id) ? collapsed.filter((item) => item !== id) : [...collapsed, id];
  }
  function choose(event: MouseEvent, id: string) {
    event.preventDefault(); onSelect(id);
  }
</script>

<div class="tree-heading">
  <div><span class="kicker">Postmortem</span><strong>Run report</strong></div>
  <span class="tree-count">{report.workstreams.length}</span>
</div>
<nav class="report-navigation" aria-label="Report pages"><a href="#/analysis" class:selected={analysisSelected} onclick={(event) => { event.preventDefault(); onAnalysis(); }}><span>Cross-thread analysis</span><small>Run-wide findings</small></a></nav>
<div class="tree-subheading"><span>Threads and workstreams</span><small>Chronological within each level</small></div>
<div class="workstream-tree" role="tree" aria-label="Related threads and delegated workstreams">
  {#each visibleRows as row (row.workstream.id)}
    <div
      class="tree-row"
      class:selected={row.workstream.id === selectedId}
      class:root-node={row.depth === 0}
      role="treeitem"
      aria-selected={row.workstream.id === selectedId}
      aria-level={row.depth + 1}
      style={`--depth:${row.depth}`}
    >
      <span class="branch" aria-hidden="true">{row.depth === 0 ? '●' : row.last ? '└─' : '├─'}</span>
      {#if row.workstream.childIds.length}
        <button class="tree-toggle" aria-label={`${collapsed.includes(row.workstream.id) ? 'Expand' : 'Collapse'} ${row.workstream.label}`} onclick={(event) => toggle(event, row.workstream.id)}>
          {collapsed.includes(row.workstream.id) ? '▸' : '▾'}
        </button>
      {:else}<span class="tree-toggle spacer"></span>{/if}
      <a href={`#/workstream/${encodeURIComponent(row.workstream.id)}`} onclick={(event) => choose(event, row.workstream.id)}>
        <span class="node-label">{row.workstream.label}</span>
        <span class="node-meta">
          <span class={`status-dot ${row.workstream.outcome}`} aria-label={row.workstream.outcome}></span>
          {#if row.workstream.isThreadRoot}<span>{row.workstream.isPrimaryThread ? 'Primary thread' : 'Related thread'}</span>{:else}<span>{row.workstream.role}</span>{/if}
          {#if row.workstream.crossLinkParentIds.length}<span class="cross-link" title="Linked from another workstream">↗ {row.workstream.crossLinkParentIds.length}</span>{/if}
        </span>
      </a>
    </div>
  {/each}
</div>
