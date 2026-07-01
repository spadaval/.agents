<script lang="ts">
  import EvidenceLink from './EvidenceLink.svelte';
  import type { Evidence, EvidencePack } from './types';
  let { pack, kind, evidenceId = '' }: {
    pack: EvidencePack;
    kind: 'overview' | 'timeline' | 'failures' | 'delegation' | 'tools' | 'validation' | 'evidence';
    evidenceId?: string;
  } = $props();

  const labels = { overview: 'Overview', timeline: 'Timeline', failures: 'Failures', delegation: 'Delegation', tools: 'Tools', validation: 'Validation and changes', evidence: 'Evidence inspector' };
  const title = $derived(labels[kind]);
  const items = $derived(filtered(kind, pack.evidence));
  const selected = $derived(pack.evidence.find((item) => item.id === evidenceId));
  const rootSummary = $derived(pack.evidence.find((item) => item.kind === 'session_summary' && item.sessionId === pack.rootSessionId));
  function filtered(page: typeof kind, all: Evidence[]) {
    if (page === 'timeline') return all.filter((item) => ['turn', 'long_gap', 'failure', 'patch'].includes(item.kind));
    if (page === 'failures') return all.filter((item) => item.kind === 'failure');
    if (page === 'delegation') return all.filter((item) => item.kind === 'delegation_edge' || item.kind === 'session_summary');
    if (page === 'tools') return all.filter((item) => item.kind === 'tool_count');
    if (page === 'validation') return all.filter((item) => item.kind === 'patch');
    return all;
  }
  function text(data: unknown): string { return JSON.stringify(data, null, 2); }
</script>

<main>
  <p class="eyebrow">Stable platform route</p><h2>{title}</h2>
  {#if kind === 'overview'}
    <section class="metrics">
      <article><span>Logical sessions</span><strong>{pack.sessions.length}</strong>{#if rootSummary}<EvidenceLink id={rootSummary.id} />{/if}</article>
      <article><span>Evidence records</span><strong>{pack.evidence.length}</strong>{#if rootSummary}<EvidenceLink id={rootSummary.id} />{/if}</article>
      <article><span>Failure signals</span><strong>{pack.evidence.filter((item) => item.kind === 'failure').length}</strong>{#if rootSummary}<EvidenceLink id={rootSummary.id} />{/if}</article>
      <article><span>Changed paths</span><strong>{pack.evidence.filter((item) => item.kind === 'patch').length}</strong>{#if rootSummary}<EvidenceLink id={rootSummary.id} />{/if}</article>
    </section>
    <section><h3>Scope</h3><p>Root logical session <code>{pack.rootSessionId}</code>; generated {pack.generatedAt}.</p><p class="muted">Outcome remains an editorial conclusion. See the report landing after reviewing evidence.</p></section>
  {:else if kind === 'evidence' && selected}
    <section id={selected.id}><h3>{selected.kind}</h3><p><code>{selected.id}</code></p><p>{selected.excerpt || 'No compact excerpt was captured.'}</p><pre>{text(selected.source)}</pre><pre>{text(selected.data)}</pre></section>
  {:else}
    <section><p class="muted">Each row links to its stable source handle. Long gaps are logged-event gaps, not proof of idleness.</p>
      {#if kind === 'delegation'}<p>Resolved edges are transcript-derived; verify roles and handoffs before treating every link as a subagent.</p>{/if}
      {#if kind === 'validation'}<p>Changed paths originate only from patch events. Checks are available only when recorded in evidence.</p>{/if}
      <div class="rows">
        {#each items as item}
          <article id={item.id}><div><span class="tag">{item.kind}</span> <time>{item.timestamp || 'no timestamp'}</time></div><p>{item.excerpt || 'No compact excerpt captured.'}</p><EvidenceLink id={item.id} /></article>
        {:else}<p>No matching evidence was extracted.</p>{/each}
      </div>
    </section>
  {/if}
</main>
