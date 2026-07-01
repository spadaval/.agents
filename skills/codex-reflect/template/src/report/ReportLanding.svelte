<script lang="ts">
  import EvidenceLink from '../platform/EvidenceLink.svelte';
  import type { EvidencePack } from '../platform/types';
  let { pack }: { pack: EvidencePack } = $props();
  const sessionEvidence = $derived(pack.evidence.filter((item) => item.kind === 'session_summary'));
</script>

<main>
  <p class="eyebrow">Agent-authored report</p>
  <h2>Editorial findings</h2>
  <section>
    <p>No mission-specific conclusions have been authored yet. Review the helper-owned Markdown and evidence artifacts, then replace this neutral state with concise, evidence-linked findings.</p>
    <p class="muted">Keep this page to reviewed outcome, what went well, what went poorly, Context → Change → Payoff improvements, and explicit uncertainty. Use platform routes for generic timelines, failure tables, delegation, tools, validation, and source inspection.</p>
  </section>
  <section>
    <h3>Reviewed scope</h3>
    {#each sessionEvidence as item}<p><code>{item.sessionId}</code> <EvidenceLink id={item.id} label="Session evidence" /></p>{/each}
  </section>
</main>
