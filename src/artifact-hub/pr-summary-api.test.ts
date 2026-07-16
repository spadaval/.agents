import { describe, expect, it, vi } from "vitest";
import {
  loadPrCatalogSnapshot,
  loadPrCatalogSummary,
} from "./pr-summary-api";

describe("PR catalog summary client", () => {
  it("loads the lightweight encoded summary endpoint", async () => {
    const payload = {
      schemaVersion: 1,
      repository: "owner/repo",
      pr: { number: 42, state: "CLOSED", title: "Ship it" },
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    await expect(loadPrCatalogSummary("review/a", fetcher)).resolves.toEqual(
      payload,
    );
    expect(fetcher).toHaveBeenCalledWith("/api/pr-review/review%2Fa/summary", {
      headers: { Accept: "application/json" },
    });
  });

  it("reports live-summary failures without discarding snapshot data", async () => {
    const fetcher = vi.fn(
      async () => new Response("nope", { status: 502 }),
    ) as unknown as typeof fetch;
    await expect(loadPrCatalogSummary("review", fetcher)).rejects.toThrow(
      "Live PR summary unavailable (502)",
    );
  });

  it("loads one atomic catalog snapshot for stack inference", async () => {
    const payload = {
      schemaVersion: 1,
      generatedAt: "2026-07-14T12:00:00Z",
      freshness: "live",
      summaries: {},
      errors: {},
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    await expect(loadPrCatalogSnapshot(fetcher)).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith("/api/pr-review-summaries", {
      headers: { Accept: "application/json" },
    });
  });
});
