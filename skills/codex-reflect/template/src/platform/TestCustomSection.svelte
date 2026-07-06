<script lang="ts">
  import type { CustomSectionContext } from './types';
  let { report, evidence, workstream }: CustomSectionContext = $props();
</script>
<p data-testid="custom-section">Custom context: {report.workstreams.length} workstreams · {evidence.sessions.length} sessions · {workstream?.shortId}</p>
