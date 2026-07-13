/// <reference types="vite/client" />

import type { Component } from "svelte";
import type { LayerEntry, StoryEntry } from "./types";

type EntryModule = {
  default: Component;
  id?: unknown;
  order?: unknown;
  title?: unknown;
  description?: unknown;
  files?: unknown;
  primary?: unknown;
};

const layerModules = import.meta.glob("./layers/*.svelte", {
  eager: true,
}) as Record<string, EntryModule>;
const storyModules = import.meta.glob("./stories/*.svelte", {
  eager: true,
}) as Record<string, EntryModule>;

const text = (value: unknown, field: string, source: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${source} must module-export a non-empty ${field}`);
  }
  return value;
};

const optionalText = (value: unknown, field: string, source: string) => {
  if (value === undefined) return undefined;
  return text(value, field, source);
};

const optionalOrder = (value: unknown, source: string) => {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${source} order must be a finite number`);
  }
  return value;
};

const exactFiles = (value: unknown, source: string) => {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !item || /[*?{}]/.test(item),
    )
  ) {
    throw new Error(
      `${source} must module-export files as an array of exact paths`,
    );
  }
  return [...new Set(value)];
};

const sortEntries = <T extends { order?: number; title: string; id: string }>(
  entries: T[],
) =>
  entries.sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );

const assertUniqueIds = (
  entries: Array<{ id: string; source: string }>,
  kind: string,
) => {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.id);
    if (previous)
      throw new Error(
        `Duplicate ${kind} id "${entry.id}" in ${previous} and ${entry.source}`,
      );
    seen.set(entry.id, entry.source);
  }
};

export const discoverLayers = (
  modules: Record<string, EntryModule> = layerModules,
): LayerEntry[] => {
  const entries = Object.entries(modules).map(([source, module]) => ({
    kind: "layer" as const,
    id: text(module.id, "id", source),
    order: optionalOrder(module.order, source),
    title: text(module.title, "title", source),
    description: optionalText(module.description, "description", source),
    files: exactFiles(module.files, source),
    component: module.default,
    source,
  }));
  assertUniqueIds(entries, "layer");
  return sortEntries(entries);
};

export const discoverStories = (
  modules: Record<string, EntryModule> = storyModules,
): StoryEntry[] => {
  const entries = Object.entries(modules).map(([source, module]) => {
    if (module.primary !== undefined && typeof module.primary !== "boolean") {
      throw new Error(`${source} primary must be a boolean`);
    }
    return {
      kind: "story" as const,
      id: text(module.id, "id", source),
      order: optionalOrder(module.order, source),
      title: text(module.title, "title", source),
      description: optionalText(module.description, "description", source),
      primary: module.primary as boolean | undefined,
      component: module.default,
      source,
    };
  });
  assertUniqueIds(entries, "story");
  if (entries.filter((entry) => entry.primary).length > 1) {
    throw new Error(
      "Only one discovered story may module-export primary = true",
    );
  }
  return sortEntries(entries);
};

export const layers = discoverLayers();
export const stories = discoverStories();
export const primaryStory = stories.find((story) => story.primary);
