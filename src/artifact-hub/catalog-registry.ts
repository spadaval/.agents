import type { Component } from "svelte";
import type { ArtifactRecord } from "./catalog";
import type { PrCatalogSnapshot, PrCatalogSummary } from "./pr-summary-api";
import GenericArtifactRow from "./rows/GenericArtifactRow.svelte";
import PlanArtifactRow from "./rows/PlanArtifactRow.svelte";
import PrReviewArtifactRow from "./rows/PrReviewArtifactRow.svelte";
import ReflectArtifactRow from "./rows/ReflectArtifactRow.svelte";

export type SmartRowProps = {
  record: ArtifactRecord;
  relativeTime: (value: string) => string;
  prSummary?: PrCatalogSummary;
  prFreshness?: PrCatalogSnapshot["freshness"];
  grouped?: boolean;
  contextOnly?: boolean;
  ambiguous?: boolean;
};

export type CatalogKindDefinition = {
  kind: string;
  label: string;
  pluralLabel: string;
  accent: string;
  component: Component<SmartRowProps>;
};

export const catalogKinds: CatalogKindDefinition[] = [
  {
    kind: "pr-review",
    label: "PR review",
    pluralLabel: "PR reviews",
    accent: "green",
    component: PrReviewArtifactRow,
  },
  {
    kind: "codex-reflect",
    label: "Retrospective",
    pluralLabel: "Retrospectives",
    accent: "rust",
    component: ReflectArtifactRow,
  },
  {
    kind: "html-plan",
    label: "Plan",
    pluralLabel: "Plans",
    accent: "blue",
    component: PlanArtifactRow,
  },
  {
    kind: "visualizer",
    label: "Visualizer",
    pluralLabel: "Visualizers",
    accent: "violet",
    component: GenericArtifactRow,
  },
];

const fallback: CatalogKindDefinition = {
  kind: "artifact",
  label: "Artifact",
  pluralLabel: "Other",
  accent: "gray",
  component: GenericArtifactRow,
};

export function catalogKind(kind: string): CatalogKindDefinition {
  return (
    catalogKinds.find((definition) => definition.kind === kind) ?? fallback
  );
}
