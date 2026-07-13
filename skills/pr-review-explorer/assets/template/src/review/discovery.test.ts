import type { Component } from "svelte";
import { describe, expect, it } from "vitest";
import { discoverLayers, discoverStories } from "./discovery";

const component = (() => {}) as unknown as Component;

describe("review entry discovery", () => {
  it("sorts layer modules while preserving exact overlapping file lists", () => {
    const entries = discoverLayers({
      "./layers/later.svelte": {
        default: component,
        id: "later",
        order: 20,
        title: "Later",
        files: ["src/shared.ts", "src/later.ts"],
      },
      "./layers/first.svelte": {
        default: component,
        id: "first",
        order: 10,
        title: "First",
        files: ["src/shared.ts", "src/first.ts"],
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(["first", "later"]);
    expect(entries[0].files).toEqual(["src/shared.ts", "src/first.ts"]);
    expect(entries[1].files).toEqual(["src/shared.ts", "src/later.ts"]);
  });

  it("rejects duplicate story IDs", () => {
    expect(() =>
      discoverStories({
        "./stories/a.svelte": { default: component, id: "same", title: "A" },
        "./stories/b.svelte": { default: component, id: "same", title: "B" },
      }),
    ).toThrow(/Duplicate story id/);
  });

  it("requires exact file arrays on every layer", () => {
    expect(() =>
      discoverLayers({
        "./layers/bad.svelte": {
          default: component,
          id: "bad",
          title: "Bad",
          files: ["src/*.ts"],
        },
      }),
    ).toThrow(/array of exact paths/);
  });
});
