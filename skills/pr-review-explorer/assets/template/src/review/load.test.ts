import { afterEach, describe, expect, it, vi } from "vitest";
import { loadReviewPack } from "./load";

const pack = {
  repository: "owner/repo",
  pr: {
    number: 7,
    title: "Change",
    url: "https://example.test/pr/7",
    baseRefName: "main",
    headRefName: "change",
    additions: 1,
    deletions: 0,
    changedFiles: 1,
  },
  files: [
    {
      path: "src/file.ts",
      status: "modified",
      additions: 1,
      deletions: 0,
      diff: "@@ -1 +1 @@\n-old\n+new",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("loadReviewPack", () => {
  it("prefers the normalized same-origin endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            repository: "https://enterprise.test/owner/repo",
            pr: 7,
            endpoint: "/hub/pr-pack",
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(pack)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadReviewPack()).resolves.toEqual(pack);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${window.location.origin}/hub/pr-pack`,
      { headers: { Accept: "application/json" } },
    );
  });

  it("does not make a direct REST request for an enterprise repository", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          repository: "https://enterprise.test/owner/repo",
          pr: 7,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadReviewPack()).rejects.toThrow(
      /Enterprise repositories require a same-origin endpoint/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
