import { describe, expect, it } from "vitest";
import {
  parseArtifactManifest,
  validateArtifactId,
  validateEntry,
} from "./manifest";

const valid = {
  manifestVersion: 1,
  id: "sample-artifact",
  title: "Sample artifact",
  createdAt: "2026-07-10T12:00:00.000Z",
  entry: "index.html",
};

describe("artifact manifests", () => {
  it("parses catalog metadata without interpreting application content", () => {
    const result = parseArtifactManifest(
      JSON.stringify({
        ...valid,
        kind: "visualizer",
        source: { repository: "/root/work" },
      }),
      "/artifacts/sample-artifact/manifest.json",
    );
    expect(result).toMatchObject({
      valid: true,
      href: "/artifacts/sample-artifact/",
      manifest: { kind: "visualizer" },
    });
  });

  it("contains malformed JSON as an invalid catalog entry", () => {
    const result = parseArtifactManifest(
      "{not-json",
      "/artifacts/broken/manifest.json",
    );
    expect(result).toMatchObject({ valid: false, directoryName: "broken" });
  });

  it("requires the directory name and manifest id to agree", () => {
    const result = parseArtifactManifest(
      JSON.stringify(valid),
      "/artifacts/different/manifest.json",
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) expect(result.error).toContain("must match directory");
  });

  it("rejects paths that escape the artifact", () => {
    expect(validateEntry("../index.html")).toContain("within");
    expect(validateEntry("/index.html")).toContain("relative");
    expect(validateEntry("pages/index.html")).toBeUndefined();
  });

  it("rejects unsafe or ambiguous ids", () => {
    expect(validateArtifactId("../escape")).toBeTruthy();
    expect(validateArtifactId("UPPERCASE")).toBeTruthy();
    expect(validateArtifactId("safe-name_1")).toBeUndefined();
  });
});
