<script lang="ts">
  import Markdown from './Markdown.svelte';
  import SourceDisclosure from './SourceDisclosure.svelte';
  import type { Action, ReportViewModel, SourceReference } from './types';
  let { action, sources, linkedSources = [], highlightedIds, currentSessionId, report, onSource, onSelect }: { action: Action; sources: SourceReference[]; linkedSources?: SourceReference[]; highlightedIds: string[]; currentSessionId: string; report: ReportViewModel; onSource: (id: string) => void; onSelect: (id: string) => void } = $props();
  const relatedSessions = $derived((action.sessionIds || []).filter((id) => id !== currentSessionId && report.byId.has(id)));
</script>
<article class="action"><h4>{action.title}</h4><Markdown content={action.summary} /><p class="action-result">{action.result}</p>{#if action.significance}<p class="action-significance">{action.significance}</p>{/if}
  {#if relatedSessions.length}<nav class="action-workstreams" aria-label="Related workstreams">{#each relatedSessions as id}<button onclick={() => onSelect(id)}>{report.byId.get(id)?.label} →</button>{/each}</nav>{/if}
  <SourceDisclosure label="Recorded activity in this action" {sources} {highlightedIds} {onSource} />
  <SourceDisclosure label="Linked evidence from related workstreams" sources={linkedSources} {highlightedIds} {onSource} />
</article>
