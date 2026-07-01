<script lang="ts">
  import { evidenceHref } from './evidence';
  let { id, label = 'Evidence' }: { id: string; label?: string } = $props();
</script>

<a class="evidence-link" href={evidenceHref(id)}>{label} ↗</a>
