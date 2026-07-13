import type { Component } from "svelte";

export type ReviewFile = {
  path: string;
  status: string;
  additions: string | number;
  deletions: string | number;
  diff: string;
};

export type LayerEntry = {
  kind: "layer";
  id: string;
  order?: number;
  title: string;
  description?: string;
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
