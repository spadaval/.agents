import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanArtifactCatalog, scanArtifactModules } from "./artifact-api";

const roots: string[] = [];

async function temporaryRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-api-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true })));
});

describe("Artifact Hub runtime API", () => {
  it("rescans manifests and reports invalid artifact directories", async () => {
    const root = await temporaryRoot();
    await fs.mkdir(path.join(root, "valid"));
    await fs.writeFile(
      path.join(root, "valid", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        id: "valid",
        title: "Valid artifact",
        createdAt: "2026-07-14T12:00:00Z",
        entry: "index.html",
      }),
    );
    await fs.mkdir(path.join(root, "missing-manifest"));

    const first = await scanArtifactCatalog(root);
    expect(first).toHaveLength(2);
    expect(first.find((entry) => entry.directoryName === "valid")?.valid).toBe(true);
    expect(first.find((entry) => entry.directoryName === "missing-manifest")?.valid).toBe(false);

    await fs.mkdir(path.join(root, "later"));
    await fs.writeFile(
      path.join(root, "later", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        id: "later",
        title: "Added later",
        createdAt: "2026-07-14T12:01:00Z",
        entry: "index.html",
      }),
    );
    expect(await scanArtifactCatalog(root)).toHaveLength(3);
  });

  it("returns only allowlisted review modules as same-origin URLs", async () => {
    const root = await temporaryRoot();
    const artifact = path.join(root, "review-1");
    await fs.mkdir(path.join(artifact, "src", "review", "layers"), { recursive: true });
    await fs.mkdir(path.join(artifact, "src", "review", "stories"), { recursive: true });
    await fs.mkdir(path.join(artifact, "src", "review", "findings"), { recursive: true });
    await fs.writeFile(path.join(artifact, "manifest.json"), "{}");
    await fs.writeFile(path.join(artifact, "src", "review", "layers", "one.svelte"), "");
    await fs.writeFile(path.join(artifact, "src", "review", "layers", "ignored.ts"), "");
    await fs.writeFile(path.join(artifact, "src", "review", "stories", "intro.svelte"), "");
    await fs.writeFile(path.join(artifact, "src", "review", "findings", "bug.ts"), "");

    await expect(scanArtifactModules(root, "review-1")).resolves.toEqual({
      artifactId: "review-1",
      modules: {
        layers: ["/artifacts/review-1/src/review/layers/one.svelte"],
        stories: ["/artifacts/review-1/src/review/stories/intro.svelte"],
        findings: ["/artifacts/review-1/src/review/findings/bug.ts"],
      },
    });
  });

  it("rejects traversal-shaped artifact identifiers", async () => {
    const root = await temporaryRoot();
    await expect(scanArtifactModules(root, "../outside")).rejects.toThrow(/id must/);
  });
});
