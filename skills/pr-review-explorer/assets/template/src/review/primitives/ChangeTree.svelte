<script lang="ts">
  import { FileTree, type GitStatus } from "@pierre/trees";
  import type { ReviewFile } from "../types";

  let {
    files,
    layerCount,
    findingCount,
    onSelect,
    variant = "main",
    showLayerCount = true,
  }: {
    files: ReviewFile[];
    layerCount: (path: string) => number;
    findingCount: (path: string) => number;
    onSelect: (path: string) => void;
    variant?: "main" | "rail";
    showLayerCount?: boolean;
  } = $props();

  let container = $state<HTMLDivElement>();

  const gitStatus = (status: string): GitStatus | undefined =>
    ({
      A: "added",
      D: "deleted",
      M: "modified",
      R: "renamed",
      C: "modified",
    })[status.toUpperCase()] as GitStatus | undefined;

  $effect(() => {
    if (!container) return;
    const paths = files.map((file) => file.path);
    const pathSet = new Set(paths);
    const filesByPath = new Map(files.map((file) => [file.path, file]));
    const tree = new FileTree({
      paths,
      flattenEmptyDirectories: true,
      initialExpansion: "open",
      search: true,
      gitStatus: files.flatMap((file) => {
        const status = gitStatus(file.status);
        return status ? [{ path: file.path, status }] : [];
      }),
      onSelectionChange: (selectedPaths) => {
        const path = selectedPaths.at(-1);
        if (path && pathSet.has(path)) onSelect(path);
      },
      renderRowDecoration: ({ item }) => {
        if (item.kind !== "file") return null;
        const file = filesByPath.get(item.path);
        if (!file) return null;
        const changedLines =
          Number(file.additions) + Number(file.deletions);
        const count = layerCount(item.path);
        const membership = showLayerCount
          ? count
            ? ` · ${count} layer${count === 1 ? "" : "s"}`
            : " · unmapped"
          : "";
        const findings = findingCount(item.path);
        const findingIndicator = findings
          ? ` · ${findings} finding${findings === 1 ? "" : "s"}`
          : "";
        return {
          text: `${changedLines} line${changedLines === 1 ? "" : "s"}${membership}${findingIndicator}`,
        };
      },
    });
    tree.render({ containerWrapper: container });
    return () => tree.cleanUp();
  });
</script>

<div
  class="change-tree"
  class:rail={variant === "rail"}
  bind:this={container}
></div>

<style>
  .change-tree {
    height: min(640px, 65vh);
    overflow: hidden;
    background: #121713;
    border: 1px solid var(--line);
    border-radius: 5px;
    --trees-accent-override: var(--blue);
    --trees-bg-override: #121713;
    --trees-bg-muted-override: #1b261d;
    --trees-border-color-override: var(--line);
    --trees-fg-override: #dce4dc;
    --trees-fg-muted-override: #90a092;
    --trees-font-family-override: ui-monospace, monospace;
    --trees-font-size-override: 12px;
    --trees-input-bg-override: #0c100d;
    --trees-search-bg-override: #0c100d;
    --trees-selected-bg-override: #253126;
    --trees-selected-fg-override: #f0f5ef;
    --trees-status-added-override: var(--green);
    --trees-status-deleted-override: var(--red);
    --trees-status-modified-override: var(--blue);
    --trees-status-renamed-override: #dfba65;
    --trees-scrollbar-gutter-override: 6px;
    --trees-scrollbar-thumb-override: #4d5e4f;
  }
  .change-tree.rail {
    height: 100%;
    background: transparent;
    border: 0;
    border-radius: 0;
    --trees-font-size-override: 11px;
    --trees-padding-inline-override: 4px;
    --trees-item-padding-x-override: 6px;
  }
</style>
