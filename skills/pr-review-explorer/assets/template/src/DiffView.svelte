<script lang="ts">
  import type { DiffLineAnnotation } from "@pierre/diffs";
  import PierreDiff from "./review/primitives/PierreDiff.svelte";
  import type { FindingEntry, ReviewAnchor } from "./review/types";

export type FindingAnnotation = {
  finding: FindingEntry;
  anchor: ReviewAnchor;
  selected: boolean;
  reviewHref: string;
};

  let {
    diff,
    annotations = [],
  }: {
    diff: string;
    annotations?: DiffLineAnnotation<FindingAnnotation>[];
  } = $props();
</script>

<PierreDiff {diff} {annotations} />
