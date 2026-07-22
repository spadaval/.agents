import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState({}, "", "/");
});

const artifact = (id: string, title: string, kind: string) => ({
  valid: true as const,
  manifestPath: `/artifacts/${id}/manifest.json`,
  directoryName: id,
  href: `/artifacts/${id}/`,
  manifest: {
    manifestVersion: 1 as const,
    id,
    title,
    createdAt: "2026-07-20T12:00:00Z",
    entry: "index.html",
    kind,
    source:
      kind === "pr-review"
        ? {
            repository: "https://github.example/owner/project",
            project: "project",
            pr: 42,
            url: "https://github.example/owner/project/pull/42",
          }
        : { project: "project" },
  },
});

describe("Artifact Hub catalog", () => {
  it("hides merged PR artifacts by default and reveals their merged status", async () => {
    const responses = {
      "/api/artifacts": {
        artifacts: [
          artifact("merged-review", "Merged review artifact", "pr-review"),
          artifact("visible-plan", "Visible plan", "html-plan"),
        ],
      },
      "/api/pr-review-summaries": {
        schemaVersion: 1,
        generatedAt: "2026-07-21T12:00:00Z",
        freshness: "live",
        summaries: {
          "merged-review": {
            schemaVersion: 1,
            repository: "owner/project",
            pr: {
              additions: 1,
              baseRefName: "main",
              baseRepository: "owner/project",
              changedFiles: 1,
              comments: 0,
              deletions: 0,
              headRefName: "feature",
              headRepository: "owner/project",
              isDraft: false,
              mergedAt: "2026-07-21T11:00:00Z",
              number: 42,
              reviewComments: 0,
              state: "MERGED",
              title: "Merged change",
              updatedAt: "2026-07-21T11:00:00Z",
              url: "https://github.example/owner/project/pull/42",
            },
          },
        },
        errors: {},
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const key = String(input) as keyof typeof responses;
        return new Response(JSON.stringify(responses[key]), {
          status: responses[key] ? 200 : 404,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    render(App);

    expect(await screen.findByText("Visible plan")).toBeTruthy();
    expect(screen.queryByText("Merged change")).toBeNull();
    expect(screen.getByText(/1 merged hidden/)).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Show 1 merged" }),
    );

    expect(await screen.findByText("Merged change")).toBeTruthy();
    expect(screen.getByText("MERGED")).toBeTruthy();
    expect(new URLSearchParams(location.search).get("merged")).toBe("show");
  });
});
