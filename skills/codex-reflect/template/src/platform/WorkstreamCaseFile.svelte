<script lang="ts">
  import Markdown from './Markdown.svelte';
  import AnalyzedAction from './AnalyzedAction.svelte';
  import SourceDisclosure from './SourceDisclosure.svelte';
  import { sourcesInActionRange } from './report-model';
  import type { Action, Citation, CustomSectionPlacement, Phase, ReportViewModel, SourceReference, Workstream } from './types';

  let { workstream, report, onSource, onSelect }: { workstream: Workstream; report: ReportViewModel; onSource: (id: string) => void; onSelect: (id: string) => void } = $props();
  const ancestors = $derived.by(() => { const result: Workstream[] = []; const seen = new Set<string>(); let current = workstream.parentId ? report.byId.get(workstream.parentId) : undefined; while (current && !seen.has(current.id)) { seen.add(current.id); result.unshift(current); current = current.parentId ? report.byId.get(current.parentId) : undefined; } return result; });
  const isRoot = $derived(workstream.id === report.rootId);
  const threadRelations = $derived(report.threadRelations.filter((relation) => relation.from === workstream.id || relation.to === workstream.id));
  const modelConfigurations = $derived(workstream.modelUsage.configurations);
  const currentModel = $derived(modelConfigurations.at(-1));
  const changedFileCount = $derived(new Set(workstream.changes.flatMap((change) => change.paths)).size);
  const project = $derived.by(() => report.evidence.sessions.find((session) => session.id === workstream.id)?.cwd?.split('/').filter(Boolean).at(-1));
  function when(value: string | null): string { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'Time not recorded'; }
  function duration(value: number | null): string { if (value == null) return 'Not recorded'; if (value < 60) return `${Math.round(value)}s`; if (value < 3600) return `${Math.round(value / 60)}m`; return `${Math.floor(value / 3600)}h ${Math.round((value % 3600) / 60)}m`; }
  function number(value: number | null): string { return value == null ? 'Not recorded' : new Intl.NumberFormat().format(value); }
  function source(citation: Citation) { onSource(citation.evidenceId); }
  function citationSources(citations: Citation[]): SourceReference[] { const result: SourceReference[] = []; const seen = new Set<string>(); const add = (source: SourceReference | undefined) => { if (source && !seen.has(source.evidenceId)) { seen.add(source.evidenceId); result.push(source); } }; for (const citation of citations) { const source = report.sourceByEvidence.get(citation.evidenceId); const ownerId = source && typeof source.raw.data.toolInteractionEvidenceId === 'string' ? source.raw.data.toolInteractionEvidenceId : ''; if (ownerId) add(report.sourceByEvidence.get(ownerId)); add(source); } return result.sort(chronological); }
  function actionSources(action: Action) { return sourcesInActionRange(action, workstream.sources); }
  function linkedActionSources(action: Action) { const owned = new Set(actionSources(action).map((item) => item.evidenceId)); return citationSources(action.citations).filter((item) => !owned.has(item.evidenceId)); }
  function slots(placement: CustomSectionPlacement) { return (report.analysis.customSections || []).filter((slot) => slot.placement === placement && (!slot.sessionId || slot.sessionId === workstream.id)); }
  type ActionSegment = { kind: 'action'; action: Action };
  type OtherSegment = { kind: 'other'; id: string; label: string; sources: SourceReference[] };
  type ActivityBand = { kind: 'phase'; id: string; phase: Phase; segments: Array<ActionSegment | OtherSegment> } | { kind: 'unphased'; id: string; label: string; segments: Array<ActionSegment | OtherSegment> };
  function timestamp(value: string | null | undefined): number | null { if (!value) return null; const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; }
  function chronological(left: SourceReference, right: SourceReference) { return (timestamp(left.timestamp) ?? Number.MAX_SAFE_INTEGER) - (timestamp(right.timestamp) ?? Number.MAX_SAFE_INTEGER) || left.evidenceId.localeCompare(right.evidenceId); }
  function activityBands(): ActivityBand[] {
    const phases = [...workstream.phases].sort((left, right) => (timestamp(left.start) ?? Number.MAX_SAFE_INTEGER) - (timestamp(right.start) ?? Number.MAX_SAFE_INTEGER));
    const owned = new Set(workstream.actions.flatMap(actionSources).map((source) => source.evidenceId));
    const unowned = workstream.sources.filter((source) => !owned.has(source.evidenceId)).sort(chronological);
    const rawSegments = (id: string, sources: SourceReference[]): OtherSegment[] => {
      if (!sources.length) return [];
      const first = sources[0]?.timestamp; const last = sources.at(-1)?.timestamp;
      return [{ kind: 'other', id: `${id}:recorded`, label: first === last ? `Recorded ${when(first || null)}` : `Recorded ${when(first || null)} → ${when(last || null)}`, sources }];
    };
    const makeSegments = (id: string, sources: SourceReference[], actions: Action[]): Array<ActionSegment | OtherSegment> => { const segments: Array<ActionSegment | OtherSegment> = []; let cursor = 0; const ordered = [...actions].sort((left, right) => timestamp(left.start)! - timestamp(right.start)!); ordered.forEach((action, index) => { const actionTime = timestamp(action.start) ?? Number.MAX_SAFE_INTEGER; const preceding: SourceReference[] = []; while (cursor < sources.length && (timestamp(sources[cursor].timestamp) ?? Number.MAX_SAFE_INTEGER) < actionTime) preceding.push(sources[cursor++]); segments.push(...rawSegments(`${id}:before:${index}`, preceding), { kind: 'action', action }); }); segments.push(...rawSegments(`${id}:after`, sources.slice(cursor))); return segments; };
    if (!phases.length) return [{ kind: 'unphased', id: 'all-recorded', label: 'Chronological activity', segments: makeSegments('all-recorded', unowned, workstream.actions) }];
    type Bucket = { sources: SourceReference[]; actions: Action[] }; const bucket = (): Bucket => ({ sources: [], actions: [] }); const before = bucket(); const after = bucket(); const gaps = new Map<number, Bucket>(); const inside = new Map<string, Bucket>(); phases.forEach((phase) => inside.set(phase.id, bucket()));
    const locate = (value: number | null): { kind: 'before' | 'after' | 'inside' | 'gap'; index?: number } => { const first = timestamp(phases[0].start); if (value == null || first == null || value < first) return { kind: 'before' }; for (let index = 0; index < phases.length; index += 1) { const start = timestamp(phases[index].start) ?? Number.NEGATIVE_INFINITY; const end = timestamp(phases[index].end) ?? timestamp(phases[index + 1]?.start) ?? Number.POSITIVE_INFINITY; if (value >= start && value <= end) return { kind: 'inside', index }; const next = timestamp(phases[index + 1]?.start); if (value > end && next != null && value < next) return { kind: 'gap', index }; } return { kind: 'after' }; };
    const put = <T extends SourceReference | Action>(item: T, value: number | null, key: 'sources' | 'actions') => { const place = locate(value); const target = place.kind === 'before' ? before : place.kind === 'after' ? after : place.kind === 'inside' ? inside.get(phases[place.index || 0].id)! : (() => { const current = gaps.get(place.index || 0) || bucket(); gaps.set(place.index || 0, current); return current; })(); (target[key] as T[]).push(item); };
    unowned.forEach((item) => put(item, timestamp(item.timestamp), 'sources')); workstream.actions.forEach((item) => put(item, timestamp(item.start), 'actions'));
    const bands: ActivityBand[] = [];
    if (before.sources.length || before.actions.length) bands.push({ kind: 'unphased', id: 'before-phases', label: 'Activity before the first analyzed phase', segments: makeSegments('before-phases', before.sources, before.actions) });
    phases.forEach((phase, phaseIndex) => {
      const items = inside.get(phase.id)!; bands.push({ kind: 'phase', id: phase.id, phase, segments: makeSegments(phase.id, items.sources, items.actions) });
      const gap = gaps.get(phaseIndex); if (gap && (gap.sources.length || gap.actions.length)) bands.push({ kind: 'unphased', id: `gap:${phase.id}`, label: 'Unphased activity between analyzed phases', segments: makeSegments(`gap:${phase.id}`, gap.sources, gap.actions) });
    });
    if (after.sources.length || after.actions.length) bands.push({ kind: 'unphased', id: 'after-phases', label: 'Activity after the final analyzed phase', segments: makeSegments('after-phases', after.sources, after.actions) });
    return bands;
  }
  const bands = $derived.by(activityBands);
</script>

<main class="case-file">
  <nav class="case-breadcrumb" aria-label="Workstream ancestors">
    {#each ancestors as ancestor}<button onclick={() => onSelect(ancestor.id)}>{ancestor.label}</button><span>›</span>{/each}<span>{workstream.label}</span>
  </nav>
  <header class="case-header">
    <span class="kicker">{isRoot ? 'Run analysis' : workstream.isThreadRoot ? 'Related thread analysis' : 'Workstream analysis'}</span><h1>{workstream.label}</h1>
    <p class="session-context">{#if project}<span>{project}</span>{/if}<span>Session #{workstream.shortId}</span>{#if workstream.git.initial?.branch}<span class="git-context"><code>{workstream.git.initial.branch}</code>{#if workstream.git.initial.commit}<code>@ {workstream.git.initial.commit.slice(0, 10)}</code>{/if}</span>{/if}</p>
    <div class="case-chips"><span class={`outcome-chip ${workstream.outcome}`}>{workstream.outcome}</span><span class={`lifecycle-chip ${workstream.lifecycle}`}>{workstream.lifecycle}</span><span class="role-chip">{workstream.role}</span><span>{when(workstream.start)} → {when(workstream.end)}</span></div>
  </header>
  {#if threadRelations.length}<nav class="thread-relations" aria-label="Related threads">{#each threadRelations as relation}{@const otherId = relation.from === workstream.id ? relation.to : relation.from}{#if report.byId.get(otherId)}<button onclick={() => onSelect(otherId)}><span>{relation.from === workstream.id ? 'Started related thread' : 'Started by related thread'}</span><strong>{report.byId.get(otherId)?.label}</strong><time>{when(relation.timestamp || null)}</time></button>{/if}{/each}</nav>{/if}

  <section class="analysis-lede">
    <span class="kicker">Task</span><h2>{workstream.task.title}</h2><Markdown content={workstream.task.objective || 'The task was not identified in the authored analysis.'} />
    {#if workstream.task.successCriteria.length}<details><summary>Success criteria</summary><ul>{#each workstream.task.successCriteria as item}<li>{item}</li>{/each}</ul></details>{/if}
    <div class="analysis-summary"><span class="kicker">Assessment · {workstream.assessment.confidence} confidence</span><Markdown content={workstream.assessment.summary} /></div>
    {#if workstream.analysisSummary}<Markdown content={workstream.analysisSummary} />{/if}
  </section>

  {#each slots(isRoot ? 'root-after-summary' : 'workstream-after-summary') as slot (slot.id)}{@const Section = slot.component}<Section {report} evidence={report.evidence} {workstream} />{/each}

  <section class="resource-strip" aria-label="Session resources">
    <div><span>Recorded elapsed</span><strong>{duration(workstream.resources.durationSeconds)}</strong></div>
    <div><span>Tool calls</span><strong>{number(workstream.resources.toolCalls)}</strong></div>
    <div><span>Files changed</span><strong>{number(changedFileCount)}</strong></div>
    <div><span>Model</span><strong>{currentModel?.model || 'Not recorded'}</strong>{#if currentModel?.effort}<small>{currentModel.effort} effort</small>{/if}</div>
    <details><summary>Token breakdown</summary><dl><div><dt>Input</dt><dd>{number(workstream.resources.tokens.input)}</dd></div><div><dt>Cached input</dt><dd>{number(workstream.resources.tokens.cachedInput)}</dd></div><div><dt>Uncached input</dt><dd>{number(workstream.resources.tokens.uncachedInput)}</dd></div><div><dt>Output</dt><dd>{number(workstream.resources.tokens.output)}</dd></div><div><dt>Reasoning</dt><dd>{number(workstream.resources.tokens.reasoning)}</dd></div></dl></details>
  </section>
  {#if modelConfigurations.length > 1 || workstream.modelUsage.tokensByModel.length > 1}<details class="session-model"><summary>{modelConfigurations.length} model configurations · attributed token detail</summary><p>Token deltas are assigned to the model active at each captured snapshot.</p><ol>{#each modelConfigurations as configuration}<li><time>{when(configuration.startedAt)}</time><strong>{configuration.model}</strong><span>{configuration.effort ? `${configuration.effort} effort` : 'effort not recorded'}</span></li>{/each}</ol>{#if workstream.modelUsage.tokensByModel.length > 1}<dl>{#each workstream.modelUsage.tokensByModel as usage}<div><dt>{usage.model}</dt><dd>{number(usage.total)} tokens</dd></div>{/each}</dl>{/if}</details>{/if}
  <section class="activity-section analyzed-activity">
    <div class="section-heading"><div><span class="kicker">Interpreted chronology</span><h2>Activity</h2></div><span>{#if workstream.phases.length}{workstream.phases.length} {workstream.phases.length === 1 ? 'phase' : 'phases'} · {/if}{workstream.sources.length} {workstream.sources.length === 1 ? 'event' : 'events'}</span></div>
    <div class="phase-list">{#each bands as band, index (band.id)}
      {#if band.kind === 'phase'}
        <article class="phase"><header><span class="phase-number">{bands.slice(0, index + 1).filter((item) => item.kind === 'phase').length}</span><div><h3>{band.phase.title}</h3><p>{band.phase.summary}</p><time>{when(band.phase.start)} → {when(band.phase.end)}</time></div></header>
          {#if band.phase.citations?.length}<div class="citation-row phase-citations">{#each band.phase.citations as citation}<button onclick={() => source(citation)}>Phase source</button>{/each}</div>{/if}
          <div class="action-list">{#each band.segments as segment (segment.kind === 'action' ? segment.action.id : segment.id)}
            {#if segment.kind === 'action'}<AnalyzedAction action={segment.action} sources={actionSources(segment.action)} linkedSources={linkedActionSources(segment.action)} highlightedIds={segment.action.citations.map((citation) => citation.evidenceId)} currentSessionId={workstream.id} {report} {onSource} {onSelect} />{:else}<SourceDisclosure label={segment.label} sources={segment.sources} {onSource} />{/if}
          {/each}</div>
        </article>
      {:else}<section class="unphased-band"><h3>{band.label}</h3><div class="action-list">{#each band.segments as segment (segment.kind === 'action' ? segment.action.id : segment.id)}{#if segment.kind === 'action'}<AnalyzedAction action={segment.action} sources={actionSources(segment.action)} linkedSources={linkedActionSources(segment.action)} highlightedIds={segment.action.citations.map((citation) => citation.evidenceId)} currentSessionId={workstream.id} {report} {onSource} {onSelect} />{:else}<SourceDisclosure label={segment.label} sources={segment.sources} {onSource} />{/if}{/each}</div></section>{/if}
    {/each}</div>
  </section>

  {#each slots(isRoot ? 'root-after-phases' : 'workstream-after-phases') as slot (slot.id)}{@const Section = slot.component}<Section {report} evidence={report.evidence} {workstream} />{/each}

  {#if workstream.crossLinkParentIds.length}<section class="cross-links-section"><span class="kicker">Additional parents</span>{#each workstream.crossLinkParentIds as id}{#if report.byId.get(id)}<button onclick={() => onSelect(id)}>{report.byId.get(id)?.label} ↗</button>{/if}{/each}</section>{/if}

</main>
