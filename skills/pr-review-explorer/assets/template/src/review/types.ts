import type { Component } from "svelte";

export type ReviewFile = {
  path: string;
  status: string;
  additions: string | number;
  deletions: string | number;
  diff: string;
};

export type FindingKind =
  | "bug"
  | "regression"
  | "security"
  | "performance"
  | "maintainability"
  | "missing-test"
  | "question";

export type ReviewAnchor = {
  path: string;
  side: "new" | "old";
  start: number;
  end: number;
};

export type ReviewFinding = {
  id: string;
  kind: FindingKind;
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  /** PR head commit that the finding was reviewed against. */
  reviewedHeadOid: string;
  anchors: readonly ReviewAnchor[];
};

export type FindingEntry = ReviewFinding & { source: string };

export type LayerMeta = Omit<LayerEntry, "component" | "source">;
export type StoryMeta = Omit<StoryEntry, "component" | "source">;

export type LayerEntry = {
  kind: "layer";
  id: string;
  order?: number;
  title: string;
  summary: string;
  files: string[];
  component: Component;
  source: string;
};

export type StoryEntry = {
  kind: "story";
  id: string;
  order?: number;
  title: string;
  description?: string;
  primary?: boolean;
  component: Component;
  source: string;
};

export type ReviewEntry = LayerEntry | StoryEntry;

export type ExcerptSide = "new" | "old";
