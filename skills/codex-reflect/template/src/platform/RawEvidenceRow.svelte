<script lang="ts">
  import type { SourceReference } from './types';
  import { categoryFor, relativeTime, type ActivityCategory } from './activity-grouping';
  let { source, related = [], category, highlighted = false, relatedHighlights = [], onSource }: { source: SourceReference; related?: SourceReference[]; category?: ActivityCategory; highlighted?: boolean; relatedHighlights?: string[]; onSource: (id: string) => void } = $props();
  const resolvedCategory = $derived(category || categoryFor(source, related));
  const labels: Record<ActivityCategory, string> = { command: 'Command', file: 'File edit', git: 'Git', failure: 'Failure', user: 'User', agent: 'Agent', delegation: 'Delegation', context: 'Context', other: 'Event' };
  function clean(value: string): string { return value.replace(/^Chunk ID:\s*\S+\s*/i, '').replace(/^Wall time:\s*[^\n]+\s*/i, '').replace(/^Process exited with code\s+\d+\s*/i, '').replace(/^Original token count:\s*\d+\s*/i, '').replace(/\s+/g, ' ').trim(); }
  const summary = $derived.by(() => {
    const paths = related.flatMap((item) => Array.isArray(item.raw.data.changes) ? item.raw.data.changes.map(String) : []);
    if (resolvedCategory === 'file' && paths.length) return `Changed ${paths.join(', ')}`;
    const annotation = related.find((item) => item.raw.kind === 'failure' || item.raw.kind === 'git_observation');
    return clean(annotation?.raw.excerpt || source.raw.excerpt || String(source.raw.data.command || source.raw.data.cmd || source.raw.data.message || ''));
  });
</script>
<button class={`raw-evidence-row ${resolvedCategory}`} class:highlighted onclick={() => onSource(source.evidenceId)}>
  <span><time>{relativeTime(source.timestamp, source.sessionStart)}</time><strong>{labels[resolvedCategory]}</strong></span>
  <span>{#if highlighted}<b class="citation-mark">Cited</b>{/if}{summary ? (summary.length > 180 ? `${summary.slice(0, 179)}…` : summary) : 'Open structured source'}</span>
</button>
{#if related.length}<details class="derived-evidence"><summary>{related.length} linked {related.length === 1 ? 'detail' : 'details'}</summary>{#each related as item}<button class:highlighted={relatedHighlights.includes(item.evidenceId)} onclick={() => onSource(item.evidenceId)}><strong>{item.raw.kind.replaceAll('_', ' ')}{#if relatedHighlights.includes(item.evidenceId)} · cited{/if}</strong><span>{item.raw.excerpt || 'Open structured source'}</span></button>{/each}</details>{/if}
