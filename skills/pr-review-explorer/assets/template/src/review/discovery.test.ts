import type { Component } from "svelte";
import { describe, expect, it } from "vitest";
import { discoverFindings, discoverLayers, discoverStories, loadReviewEntries } from "./discovery";

const component = (() => {}) as unknown as Component;

describe("review entry discovery", () => {
  it("sorts layer modules while preserving exact overlapping file lists", () => {
    const entries = discoverLayers({
      "./layers/later.svelte": {
        default: component,
        meta: { kind: "layer", id: "later", order: 20, title: "Later", summary: "Later changes.", files: ["src/shared.ts", "src/later.ts"] },
      },
      "./layers/first.svelte": {
        default: component,
        meta: { kind: "layer", id: "first", order: 10, title: "First", summary: "First changes.", files: ["src/shared.ts", "src/first.ts"] },
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(["first", "later"]);
    expect(entries[0].files).toEqual(["src/shared.ts", "src/first.ts"]);
    expect(entries[1].files).toEqual(["src/shared.ts", "src/later.ts"]);
  });

  it("rejects duplicate story IDs", () => {
    expect(() =>
      discoverStories({
        "./stories/a.svelte": { default: component, meta: { kind: "story", id: "same", title: "A" } },
        "./stories/b.svelte": { default: component, meta: { kind: "story", id: "same", title: "B" } },
      }),
    ).toThrow(/Duplicate story id/);
  });

  it("requires exact file arrays on every layer", () => {
    expect(() =>
      discoverLayers({
        "./layers/bad.svelte": {
          default: component,
          meta: { kind: "layer", id: "bad", title: "Bad", summary: "Bad changes.", files: ["src/*.ts"] },
        },
      }),
    ).toThrow(/array of exact paths/);
  });

  it("discovers typed findings with direct kinds and anchored ranges", () => {
    expect(
      discoverFindings({
        "./findings/retry.ts": {
          id: "retry",
          kind: "bug",
          severity: 2,
          title: "Retry duplicates work",
          body: "The retry runs after a possible commit.",
          reviewedHeadOid: "deadbeef",
          anchors: [{ path: "src/retry.ts", side: "new", start: 4, end: 8 }],
        },
      }),
    ).toMatchObject([{ id: "retry", severity: 2 }]);
  });

  it("loads an API-discovered same-origin module registry", async () => {
    const modules: Record<string, Record<string, unknown>> = {
      "http://artifact.test/artifacts/review-1/src/review/layers/one.svelte": {
        default: component,
        meta: { kind: "layer", id: "one", title: "One", summary: "One layer.", files: ["src/one.ts"] },
      },
      "http://artifact.test/artifacts/review-1/src/review/stories/intro.svelte": {
        default: component,
        meta: { kind: "story", id: "intro", title: "Intro", primary: true },
      },
      "http://artifact.test/artifacts/review-1/src/review/findings/bug.ts": {
        default: {
          id: "bug",
          kind: "bug",
          severity: 2,
          title: "Bug",
          body: "A concrete bug.",
          reviewedHeadOid: "deadbeef",
          anchors: [{ path: "src/one.ts", side: "new", start: 1, end: 1 }],
        },
      },
    };
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          artifactId: "review-1",
          modules: {
            layers: ["/artifacts/review-1/src/review/layers/one.svelte"],
            stories: ["/artifacts/review-1/src/review/stories/intro.svelte"],
            findings: ["/artifacts/review-1/src/review/findings/bug.ts"],
          },
        }),
        { status: 200 },
      );
    const entries = await loadReviewEntries({
      fetcher: fetcher as typeof fetch,
      importer: async (url) => modules[url],
      pathname: "/artifacts/review-1/layer/one",
      origin: "http://artifact.test",
    });
    expect(entries.layers.map((entry) => entry.id)).toEqual(["one"]);
    expect(entries.primaryStory?.id).toBe("intro");
    expect(entries.findings.map((entry) => entry.id)).toEqual(["bug"]);
  });

  it("rejects cross-origin module URLs", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          artifactId: "review-1",
          modules: { layers: ["https://evil.test/layer.svelte"], stories: [], findings: [] },
        }),
        { status: 200 },
      );
    await expect(
      loadReviewEntries({
        fetcher: fetcher as typeof fetch,
        importer: async () => ({}),
        pathname: "/artifacts/review-1/",
        origin: "http://artifact.test",
      }),
    ).rejects.toThrow(/unsafe module URL/);
  });
});
