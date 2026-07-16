/// <reference types="vite/client" />

import type { Component } from "svelte";
import type { FindingEntry, LayerEntry, ReviewFinding, StoryEntry } from "./types";

type EntryModule = {
  default: Component;
  meta?: unknown;
};

type ModuleRegistry = {
  artifactId: string;
  modules: {
    layers: string[];
    stories: string[];
    findings: string[];
  };
};

export type ReviewEntries = {
  layers: LayerEntry[];
  stories: StoryEntry[];
  findings: FindingEntry[];
  primaryStory?: StoryEntry;
};

type ModuleImporter = (url: string) => Promise<Record<string, unknown>>;

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
  modules: Record<string, EntryModule> = {},
): LayerEntry[] => {
  const entries = Object.entries(modules).map(([source, module]) => ({
    kind: "layer" as const,
    id: text((module.meta as Record<string, unknown>)?.id, "meta.id", source),
    order: optionalOrder((module.meta as Record<string, unknown>)?.order, source),
    title: text((module.meta as Record<string, unknown>)?.title, "meta.title", source),
    summary: text((module.meta as Record<string, unknown>)?.summary, "meta.summary", source),
    files: exactFiles((module.meta as Record<string, unknown>)?.files, source),
    component: module.default,
    source,
  }));
  assertUniqueIds(entries, "layer");
  return sortEntries(entries);
};

export const discoverStories = (
  modules: Record<string, EntryModule> = {},
): StoryEntry[] => {
  const entries = Object.entries(modules).map(([source, module]) => {
    const meta = module.meta as Record<string, unknown> | undefined;
    if (meta?.primary !== undefined && typeof meta.primary !== "boolean") {
      throw new Error(`${source} primary must be a boolean`);
    }
    return {
      kind: "story" as const,
      id: text(meta?.id, "meta.id", source),
      order: optionalOrder(meta?.order, source),
      title: text(meta?.title, "meta.title", source),
      description: optionalText(meta?.description, "meta.description", source),
      primary: meta?.primary as boolean | undefined,
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

const validKinds = new Set<ReviewFinding["kind"]>([
  "bug", "regression", "security", "performance", "maintainability", "missing-test", "question",
]);

export const discoverFindings = (
  modules: Record<string, unknown> = {},
): FindingEntry[] => {
  const ids = new Set<string>();
  return Object.entries(modules).map(([source, value]) => {
    const finding = value as Partial<ReviewFinding>;
    if (!finding || typeof finding !== "object") throw new Error(`${source} must default-export a finding object`);
    if (typeof finding.id !== "string" || !finding.id.trim()) throw new Error(`${source} finding id must be non-empty`);
    if (ids.has(finding.id)) throw new Error(`Duplicate finding id "${finding.id}"`);
    ids.add(finding.id);
    if (!validKinds.has(finding.kind as ReviewFinding["kind"])) throw new Error(`${source} has an invalid finding kind`);
    if (!Number.isInteger(finding.severity) || finding.severity! < 1 || finding.severity! > 5) throw new Error(`${source} severity must be an integer from 1 to 5`);
    if (typeof finding.title !== "string" || !finding.title.trim() || typeof finding.body !== "string" || !finding.body.trim()) throw new Error(`${source} finding title and body must be non-empty`);
    if (typeof finding.reviewedHeadOid !== "string" || !finding.reviewedHeadOid.trim()) throw new Error(`${source} finding reviewedHeadOid must be non-empty`);
    if (!Array.isArray(finding.anchors) || !finding.anchors.length) throw new Error(`${source} finding needs at least one anchor`);
    for (const anchor of finding.anchors) {
      if (!anchor || typeof anchor.path !== "string" || !anchor.path || (anchor.side !== "new" && anchor.side !== "old") || !Number.isInteger(anchor.start) || !Number.isInteger(anchor.end) || anchor.start < 1 || anchor.end < anchor.start) throw new Error(`${source} has an invalid finding anchor`);
    }
    return { ...(finding as ReviewFinding), source };
  }).sort((a, b) => a.severity - b.severity || a.title.localeCompare(b.title));
};

const artifactIdFromPath = (pathname: string) => {
  const match = pathname.match(/^\/artifacts\/([^/]+)(?:\/|$)/);
  if (!match) throw new Error("Review URL does not identify an artifact");
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new Error("Review URL contains an invalid artifact identifier");
  }
};

const moduleUrls = (value: unknown, kind: string) => {
  if (!Array.isArray(value) || value.some((url) => typeof url !== "string")) {
    throw new Error(`Review module registry has invalid ${kind}`);
  }
  return value as string[];
};

const checkedModuleUrl = (
  value: string,
  artifactId: string,
  origin: string,
) => {
  const url = new URL(value, origin);
  const prefix = `/artifacts/${encodeURIComponent(artifactId)}/src/review/`;
  if (url.origin !== origin || !url.pathname.startsWith(prefix)) {
    throw new Error("Review module registry returned an unsafe module URL");
  }
  return url.href;
};

const defaultImporter: ModuleImporter = (url) =>
  import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>;

export async function loadReviewEntries(
  options: {
    fetcher?: typeof fetch;
    importer?: ModuleImporter;
    pathname?: string;
    origin?: string;
  } = {},
): Promise<ReviewEntries> {
  const fetcher = options.fetcher ?? fetch;
  const importer = options.importer ?? defaultImporter;
  const pathname = options.pathname ?? window.location.pathname;
  const origin = options.origin ?? window.location.origin;
  const artifactId = artifactIdFromPath(pathname);
  const response = await fetcher(
    `/api/artifacts/${encodeURIComponent(artifactId)}/modules`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`Review module registry request failed (${response.status})`);
  }
  const registry = (await response.json()) as Partial<ModuleRegistry>;
  if (registry.artifactId !== artifactId || !registry.modules) {
    throw new Error("Review module registry does not match this artifact");
  }

  const importModules = async (urls: string[]) =>
    Object.fromEntries(
      await Promise.all(
        urls.map(async (value) => {
          const url = checkedModuleUrl(value, artifactId, origin);
          return [url, await importer(url)] as const;
        }),
      ),
    );
  const [layerModules, storyModules, findingModules] = await Promise.all([
    importModules(moduleUrls(registry.modules.layers, "layers")),
    importModules(moduleUrls(registry.modules.stories, "stories")),
    importModules(moduleUrls(registry.modules.findings, "findings")),
  ]);
  const layers = discoverLayers(layerModules as Record<string, EntryModule>);
  const stories = discoverStories(storyModules as Record<string, EntryModule>);
  const findings = discoverFindings(
    Object.fromEntries(
      Object.entries(findingModules).map(([source, module]) => [
        source,
        module.default,
      ]),
    ),
  );
  return {
    layers,
    stories,
    findings,
    primaryStory: stories.find((story) => story.primary),
  };
}
