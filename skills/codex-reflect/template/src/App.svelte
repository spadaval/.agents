<script lang="ts">
  import { onMount } from 'svelte';
  import { loadEvidence } from './platform/evidence';
  import { deriveReport } from './platform/report-model';
  import { runAnalysis } from './report/report';
  import SourceDrawer from './platform/SourceDrawer.svelte';
  import CrossThreadPage from './platform/CrossThreadPage.svelte';
  import WorkstreamCaseFile from './platform/WorkstreamCaseFile.svelte';
  import WorkstreamTree from './platform/WorkstreamTree.svelte';
  import type { EvidencePack, ReportViewModel, SourceReference } from './platform/types';
  import { analysisHash, legacyEvidenceDestination, parseReportHash, workstreamHash } from './platform/routes';

  let pack = $state<EvidencePack | null>(null);
  let report = $state<ReportViewModel | null>(null);
  let error = $state('');
  let selectedId = $state('');
  let sourceId = $state('');
  let page = $state<'workstream' | 'analysis'>('workstream');
  let railOpen = $state(false);
  let railCollapsed = $state(false);
  let legacyEvidenceId = '';

  function readHash() {
    const route = parseReportHash(location.hash);
    if (route.page === 'analysis') {
      page = 'analysis'; sourceId = route.sourceId; legacyEvidenceId = '';
    } else if (route.page === 'workstream') {
      page = 'workstream'; selectedId = route.workstreamId || report?.rootId || ''; sourceId = route.sourceId;
      legacyEvidenceId = '';
    } else if (route.page === 'legacy') {
      legacyEvidenceId = route.evidenceId;
      redirectLegacy();
    } else {
      selectedId = report?.rootId || '';
      sourceId = '';
      if (report) replaceHash(selectedId);
    }
  }
  function replaceHash(workstreamId: string, evidenceId = '') {
    history.replaceState(null, '', workstreamHash(workstreamId, evidenceId));
  }
  function redirectLegacy() {
    if (!report || !legacyEvidenceId) return;
    const owner = report.evidenceOwners.get(legacyEvidenceId) || report.rootId;
    page = 'workstream'; selectedId = owner; sourceId = legacyEvidenceId;
    history.replaceState(null, '', legacyEvidenceDestination(legacyEvidenceId, report.evidenceOwners, report.rootId));
    legacyEvidenceId = '';
  }
  function selectWorkstream(id: string) {
    page = 'workstream'; selectedId = id; sourceId = ''; railOpen = false;
    location.hash = workstreamHash(id).slice(1);
  }
  function selectAnalysis() { page = 'analysis'; sourceId = ''; railOpen = false; location.hash = analysisHash().slice(1); }
  function openSource(id: string) {
    if (!report) return;
    sourceId = id;
    location.hash = (page === 'analysis' ? analysisHash(id) : workstreamHash(selectedId || report.rootId, id)).slice(1);
  }
  function closeSource() {
    sourceId = '';
    if (page === 'analysis') history.replaceState(null, '', analysisHash()); else if (selectedId) replaceHash(selectedId);
  }
  function toggleRail() {
    railCollapsed = !railCollapsed;
    localStorage.setItem('codex-reflect:rail-collapsed', String(railCollapsed));
  }

  const selected = $derived(report?.byId.get(selectedId) || (report ? report.byId.get(report.rootId) : undefined));
  const source = $derived<SourceReference | null>(selected?.sources.find((item) => item.evidenceId === sourceId)
    || (report && sourceId ? report.sourceByEvidence.get(sourceId) : undefined)
    || null);

  onMount(() => {
    railCollapsed = localStorage.getItem('codex-reflect:rail-collapsed') === 'true';
    window.addEventListener('hashchange', readHash);
    loadEvidence().then((value) => {
      pack = value; report = deriveReport(value, runAnalysis); selectedId ||= report.rootId;
      readHash(); redirectLegacy();
    }).catch((cause: unknown) => { error = cause instanceof Error ? cause.message : 'Could not load the report.'; });
    return () => window.removeEventListener('hashchange', readHash);
  });
</script>

{#if error}
  <main class="load-state"><h1>Report unavailable</h1><p>{error}</p></main>
{:else if !pack || !report}
  <main class="load-state"><div class="loading-mark"></div><p>Opening case files…</p></main>
{:else}
  <div class="app-shell" class:rail-open={railOpen} class:rail-collapsed={railCollapsed}>
    <button class="mobile-rail-toggle" aria-label="Toggle workstream tree" onclick={() => railOpen = !railOpen}>☰</button>
    {#if railOpen}<button class="rail-scrim" aria-label="Close workstream tree" onclick={() => railOpen = false}></button>{/if}
    <aside class="left-rail"><button class="desktop-rail-toggle" aria-label={railCollapsed ? 'Expand report navigation' : 'Collapse report navigation'} onclick={toggleRail}>{railCollapsed ? '›' : '‹'}</button><WorkstreamTree {report} {selectedId} analysisSelected={page === 'analysis'} onAnalysis={selectAnalysis} onSelect={selectWorkstream} /></aside>
    {#if page === 'analysis'}<CrossThreadPage {report} onSource={openSource} onSelect={selectWorkstream} />{:else if selected}<WorkstreamCaseFile workstream={selected} {report} onSource={openSource} onSelect={selectWorkstream} />{/if}
  </div>
  <SourceDrawer {source} onClose={closeSource} />
{/if}
