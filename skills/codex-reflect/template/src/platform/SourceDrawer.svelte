<script lang="ts">
  import type { SourceReference } from './types';
  let { source, onClose }: { source: SourceReference | null; onClose: () => void } = $props();
  function raw(value: unknown): string { return JSON.stringify(value, null, 2); }
</script>

{#if source}
  <button class="drawer-scrim" aria-label="Close source drawer" onclick={onClose}></button>
  <aside class="source-drawer" aria-label="Source details" data-testid="source-drawer">
    <header><div><span class="kicker">Source</span><h2>Provenance</h2></div><button class="drawer-close" aria-label="Close source drawer" onclick={onClose}>×</button></header>
    <dl>
      <div><dt>Event ID</dt><dd><code>{source.evidenceId}</code></dd></div>
      <div><dt>Session ID</dt><dd><code>{source.sessionId}</code></dd></div>
      <div><dt>Time</dt><dd>{source.timestamp || 'Time not recorded'}</dd></div>
      {#if source.path}<div><dt>Transcript</dt><dd><code>{source.path}</code>{#if source.line}<span> · line {source.line}</span>{/if}</dd></div>{/if}
      {#if source.paths?.length}<div><dt>Transcripts</dt><dd>{#each source.paths as path}<code class="block-code">{path}</code>{/each}</dd></div>{/if}
    </dl>
    <details class="raw-source"><summary>Raw event data</summary><pre>{raw(source.raw)}</pre></details>
  </aside>
{/if}
