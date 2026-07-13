import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  artifactUrl,
  buildManifest,
  createArtifact,
  resolveArtifactPath,
  validateArtifactId,
  validateEntryPath,
} from "./artifact-hub.mjs";

const temporary = [];
afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((item) => fs.rm(item, { recursive: true, force: true })),
  );
});

describe("Artifact Hub CLI safety", () => {
  it("keeps ids inside the canonical root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-hub-test-"));
    temporary.push(root);
    expect(resolveArtifactPath("safe-app", root)).toBe(
      path.join(root, "safe-app"),
    );
    expect(() => resolveArtifactPath("../escape", root)).toThrow(/artifact id/);
    expect(() => validateArtifactId("/absolute")).toThrow(/artifact id/);
  });

  it("accepts nested HTML entries but rejects traversal", () => {
    expect(validateEntryPath("pages/index.html")).toBe("pages/index.html");
    expect(() => validateEntryPath("../index.html")).toThrow(/within/);
    expect(() => validateEntryPath("index.ts")).toThrow(/HTML/);
  });

  it("builds only the minimal catalog contract", () => {
    expect(
      buildManifest({
        id: "small-viewer",
        title: "Small viewer",
        entry: "index.html",
        createdAt: "2026-07-10T12:00:00Z",
        kind: "visualizer",
        tags: ["local", "local"],
        source: { repository: "/root/project" },
      }),
    ).toEqual({
      manifestVersion: 1,
      id: "small-viewer",
      title: "Small viewer",
      createdAt: "2026-07-10T12:00:00Z",
      entry: "index.html",
      kind: "visualizer",
      tags: ["local"],
      source: { repository: "/root/project" },
    });
  });

  it("creates an owner-only complete artifact and leaves no staging directory", async () => {
    const sandbox = await fs.mkdtemp(
      path.join(os.tmpdir(), "artifact-hub-test-"),
    );
    temporary.push(sandbox);
    const template = path.join(sandbox, "template");
    const root = path.join(sandbox, "artifacts");
    await fs.mkdir(template);
    await fs.writeFile(
      path.join(template, "index.html"),
      "<!doctype html><title>Test</title>",
    );

    const result = await createArtifact(
      { id: "atomic-app", title: "Atomic app", entry: "index.html", template },
      root,
    );

    expect(
      JSON.parse(
        await fs.readFile(path.join(result.path, "manifest.json"), "utf8"),
      ),
    ).toMatchObject({
      manifestVersion: 1,
      id: "atomic-app",
    });
    expect((await fs.stat(root)).mode & 0o777).toBe(0o700);
    expect((await fs.stat(result.path)).mode & 0o777).toBe(0o700);
    expect(
      (await fs.readdir(root)).some((entry) => entry.startsWith(".")),
    ).toBe(false);
    await expect(
      createArtifact({ id: "atomic-app", title: "Duplicate", template }, root),
    ).rejects.toThrow(/already exists/);
  });

  it("rejects templates that carry a private runtime", async () => {
    const sandbox = await fs.mkdtemp(
      path.join(os.tmpdir(), "artifact-hub-test-"),
    );
    temporary.push(sandbox);
    const template = path.join(sandbox, "template");
    await fs.mkdir(template);
    await fs.writeFile(
      path.join(template, "index.html"),
      "<!doctype html><title>Test</title>",
    );
    await fs.writeFile(path.join(template, "package.json"), "{}");

    await expect(
      createArtifact(
        { id: "private-runtime", title: "Private runtime", template },
        path.join(sandbox, "artifacts"),
      ),
    ).rejects.toThrow(/private runtime file/);
  });

  it("uses the forwarded base URL without changing artifact routing", () => {
    const previous = process.env.ARTIFACT_HUB_BASE_URL;
    process.env.ARTIFACT_HUB_BASE_URL = "https://viewer.example.test/hub/";
    try {
      expect(artifactUrl("small-viewer", "pages/index.html")).toBe(
        "https://viewer.example.test/hub/artifacts/small-viewer/",
      );
    } finally {
      if (previous === undefined) delete process.env.ARTIFACT_HUB_BASE_URL;
      else process.env.ARTIFACT_HUB_BASE_URL = previous;
    }
  });
});
