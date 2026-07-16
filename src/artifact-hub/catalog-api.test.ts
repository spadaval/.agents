import { describe, expect, it, vi } from "vitest";
import { loadArtifactCatalog } from "./catalog-api";

describe("Artifact Hub catalog client", () => {
  it("loads the runtime artifact list without a module registry", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artifacts: [{ valid: true }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(loadArtifactCatalog(fetcher)).resolves.toEqual([{ valid: true }]);
    expect(fetcher).toHaveBeenCalledWith("/api/artifacts", {
      headers: { Accept: "application/json" },
    });
  });

  it("reports malformed runtime responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    await expect(loadArtifactCatalog(fetcher)).rejects.toThrow(/missing artifacts/);
  });
});
