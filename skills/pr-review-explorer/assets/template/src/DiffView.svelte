<script lang="ts">
  import PierreDiff from "./review/primitives/PierreDiff.svelte";

  let { diff }: { diff: string } = $props();
</script>

<PierreDiff {diff} />
