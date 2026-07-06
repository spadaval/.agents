<script lang="ts">
  import Markdown from './Markdown.svelte';
  import { relativeTime } from './activity-grouping';
  import type { ChangeEvent, DelegationEvent, FailureEvent, ReportViewModel, ValidationEvent, WorkstreamEvent } from './types';

  let { event, report, onSource, onSelect }: {
    event: WorkstreamEvent;
    report: ReportViewModel;
    onSource: (id: string) => void;
    onSelect: (id: string) => void;
  } = $props();

  const failure = $derived(event.kind === 'failure' ? event as FailureEvent : null);
  const change = $derived(event.kind === 'change' ? event as ChangeEvent : null);
  const validation = $derived(event.kind === 'validation' ? event as ValidationEvent : null);
  const delegation = $derived(event.kind === 'delegation' ? event as DelegationEvent : null);
  const child = $derived(delegation ? report.byId.get(delegation.childId) : undefined);
  const typeLabels: Record<WorkstreamEvent['kind'], string> = {
    message: 'Agent', user_message: 'User', failure: 'Failure', change: 'Change', validation: 'Command', delegation: 'Workstream', tool: 'Tool'
  };

  function when(value: string | null): string {
    return relativeTime(value, event.source.sessionStart);
  }
  function duration(seconds: number | null | undefined): string {
    if (seconds == null) return 'duration unknown';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  function plain(value: string, limit = 300): string {
    const cleaned = value
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '[code]')
      .replace(/[`*_>#~-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > limit ? `${cleaned.slice(0, limit - 1)}…` : cleaned;
  }
  function patchCount(): number { return child?.changes.reduce((total, item) => total + item.patchCount, 0) || 0; }
  function commandCount(): number { return child?.validations.reduce((total, item) => total + item.commands.length, 0) || 0; }
</script>

<article class={`activity-event ${event.kind}`}>
  <div class="activity-node" aria-hidden="true"></div>
  <div class="activity-time"><time>{when(event.timestamp)}</time><span>{typeLabels[event.kind]}</span></div>
  <div class="activity-body">
    <header><h3>{event.title}</h3><button class="source-button" onclick={() => onSource(event.source.evidenceId)}>Source</button></header>

    {#if failure}
      <code class="command-line">{failure.command}</code>
      <div class="failure-message"><p>{plain(failure.error, 360)}</p></div>
      <details class="event-details">
        <summary>Failure details and recovery</summary>
        {#if failure.error.length > 360}<h4>Command output</h4><pre>{failure.error}</pre>{/if}
        {#if failure.response}<h4>Immediate response</h4><Markdown content={failure.response} />{/if}
        {#if failure.followUpAction}<h4>Follow-up action</h4><code class="command-line">{failure.followUpAction}</code>{/if}
        <h4>Observed result</h4><p>{failure.outcome}</p>
      </details>
    {:else if change}
      <p>{change.patchCount} {change.patchCount === 1 ? 'patch event' : 'patch events'} across {change.paths.length} {change.paths.length === 1 ? 'path' : 'paths'}.</p>
      <details class="event-details">
        <summary>Changed paths</summary>
        <ul class="path-list">{#each change.paths as path}<li><code>{path}</code></li>{/each}</ul>
      </details>
    {:else if validation}
      {#if validation.commands[0]}<code class="command-line">{validation.commands[0]}</code>{/if}
      {#if validation.commands.length > 1}<p class="muted-copy">{validation.commands.length - 1} more commands in this uninterrupted run.</p>{/if}
      <details class="event-details">
        <summary>{validation.commands.length === 1 ? 'Command output' : `${validation.commands.length} commands and outputs`}</summary>
        <ol class="check-list">
          {#each validation.commands as command, index}
            <li><code class="command-line">{command}</code>{#if validation.outputs[index]}<pre>{validation.outputs[index]}</pre>{/if}</li>
          {/each}
        </ol>
      </details>
    {:else if delegation && child}
      <div class="delegation-summary">
        <span class={`status-dot ${child.outcome}`}></span>
        <span>{child.role} · {child.outcome}</span>
        <button onclick={() => onSelect(child.id)}>Open workstream →</button>
      </div>
      <div class="delegation-span"><span>{when(event.timestamp)} → {when(delegation.endTimestamp)}</span><span>{duration(child.resources.durationSeconds)}</span><span>{child.failures.length} failures</span><span>{patchCount()} patches</span><span>{commandCount()} commands</span></div>
      <p>{plain(event.summary, 360)}</p>
      <details class="event-details">
        <summary>Assignment and reported result</summary>
        <h4>Analyzed task</h4><Markdown content={child.task.objective} />
        <h4>Assessment</h4><Markdown content={child.assessment.summary} />
      </details>
    {:else if event.kind === 'user_message'}
      <div class="user-message-content"><Markdown content={event.summary} /></div>
    {:else}
      <p>{plain(event.summary)}</p>
      {#if event.summary.length > 300}
        <details class="event-details"><summary>Full update</summary><Markdown content={event.summary} /></details>
      {/if}
    {/if}

    {#if event.sources.length > 1}
      <details class="source-list"><summary>{event.sources.length} source events</summary>
        <div>{#each event.sources as source, index}<button onclick={() => onSource(source.evidenceId)}>Source {index + 1} · {when(source.timestamp)}</button>{/each}</div>
      </details>
    {/if}
  </div>
</article>
