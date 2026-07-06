<script lang="ts">
  import RawEvidenceRow from './RawEvidenceRow.svelte';
  import { activityCounts, activityRecords, groupActivity, groupLabel, relativeTime } from './activity-grouping';
  import type { SourceReference } from './types';
  let { label, sources, highlightedIds = [], onSource, open = false }: { label: string; sources: SourceReference[]; highlightedIds?: string[]; onSource: (id: string) => void; open?: boolean } = $props();
  let loaded = $state(false); let limit = $state(100);
  $effect(() => { sources; limit = 100; loaded = Boolean(open); });
  const records = $derived(activityRecords(sources));
  const grouped = $derived(groupActivity(records));
  const counts = $derived(activityCounts(sources, records));
  const context = $derived(label.toLowerCase().startsWith('linked') ? 'Linked' : '');
  function range(group: (typeof grouped)[number]): string {
    const first = group.items[0]?.source; const last = group.items.at(-1)?.source;
    if (!first) return '';
    const start = relativeTime(first.timestamp, first.sessionStart);
    const end = last && last !== first ? relativeTime(last.timestamp, last.sessionStart) : '';
    return end && end !== start ? `${start}–${end}` : start;
  }
</script>
{#if sources.length}
  <details class="source-disclosure" {open} title={label} ontoggle={(event) => { if (event.currentTarget.open) loaded = true; }}>
    <summary><span>{context ? `${context} · ` : ''}{counts.events} {counts.events === 1 ? 'event' : 'events'}</span><span class="activity-counts">{#if counts.commands}<b class="command">{counts.commands} {counts.commands === 1 ? 'command' : 'commands'}</b>{/if}{#if counts.files}<b class="file">{counts.files} {counts.files === 1 ? 'file' : 'files'}</b>{/if}{#if counts.failures}<b class="failure">{counts.failures} {counts.failures === 1 ? 'failure' : 'failures'}</b>{/if}{#if counts.git}<b class="git">{counts.git} Git</b>{/if}{#if counts.messages}<b class="message">{counts.messages} {counts.messages === 1 ? 'message' : 'messages'}</b>{/if}</span></summary>
    {#if loaded}<div class="raw-evidence-list">{#each grouped.slice(0, limit) as group}{#if group.items.length > 1}<section class={`raw-evidence-group ${group.category}`}><header><strong>{groupLabel(group)}</strong><time>{range(group)}</time></header>{#each group.items as item}<RawEvidenceRow source={item.source} related={item.derived} category={item.category} highlighted={highlightedIds.includes(item.source.evidenceId)} relatedHighlights={highlightedIds} {onSource} />{/each}</section>{:else}{#each group.items as item}<RawEvidenceRow source={item.source} related={item.derived} category={item.category} highlighted={highlightedIds.includes(item.source.evidenceId)} relatedHighlights={highlightedIds} {onSource} />{/each}{/if}{/each}</div>{#if limit < grouped.length}<button class="load-more" onclick={() => limit += 100}>Show 100 more · {grouped.length - limit} remaining</button>{/if}{/if}
  </details>
{/if}
