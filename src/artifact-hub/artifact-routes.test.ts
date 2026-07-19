import { describe, expect, it } from "vitest";
import {
  injectArtifactBase,
  injectArtifactNavigation,
  matchArtifactRoute,
} from "./artifact-routes";

describe("Artifact Hub clean routes", () => {
  it("matches artifact roots and deep application paths", () => {
    expect(matchArtifactRoute("/artifacts/review-475/")).toEqual({
      id: "review-475",
      relativePath: "",
    });
    expect(
      matchArtifactRoute(
        "/artifacts/review-475/story/reproducible-scale-validation",
      ),
    ).toEqual({
      id: "review-475",
      relativePath: "story/reproducible-scale-validation",
    });
  });

  it("rejects malformed artifact identifiers", () => {
    expect(matchArtifactRoute("/artifacts/%2e%2e/story/nope")).toBeUndefined();
    expect(matchArtifactRoute("/other/review-475/")).toBeUndefined();
  });

  it("injects one artifact-root base URL", () => {
    expect(
      injectArtifactBase(
        "<html><head><title>x</title></head></html>",
        "review-475",
      ),
    ).toContain('<head><base href="/artifacts/review-475/">');
    expect(
      injectArtifactBase(
        '<html><head><base href="/custom/"></head></html>',
        "review-475",
      ).match(/<base/g),
    ).toHaveLength(1);
  });

  it("injects shared navigation without changing artifact source files", () => {
    const html = injectArtifactNavigation(
      "<html><head></head><body><main>Artifact</main></body></html>",
    );

    expect(html).toContain(
      '<script type="module" src="/src/artifact-hub/artifact-navigation.ts"></script></body>',
    );
    expect(injectArtifactNavigation(html)).toBe(html);
  });
});
