import type { ParsedArtifact, ValidArtifact } from "./manifest";

export interface ArtifactRecord {
  artifact: ValidArtifact;
  project: string;
  branch?: string;
  reference?: string;
  status?: string;
  sourceUrl?: string;
  kindLabel: string;
  searchText: string;
}

function sourceString(source: Record<string, unknown>, field: string): string | undefined {
  return typeof source[field] === "string" ? source[field] : undefined;
}

function projectName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\\/g, "/").replace(/\/$/, "");
  return normalized.split("/").at(-1) || undefined;
}

function kindLabel(kind: string | undefined): string {
  return (
    {
      "html-plan": "Plan",
      "pr-review": "PR review",
      "codex-reflect": "Retrospective",
      visualizer: "Visualizer",
    }[kind ?? ""] ?? "Artifact"
  );
}

export function buildCatalogRecords(
  artifacts: ParsedArtifact[],
): ArtifactRecord[] {
  return artifacts.flatMap((artifact) => {
    if (!artifact.valid) return [];
    const { manifest } = artifact;
    const source = manifest.source ?? {};
    let project = sourceString(source, "project") ?? projectName(sourceString(source, "repository")) ?? "Local";
    let branch = sourceString(source, "branch");
    let reference: string | undefined;
    let status: string | undefined;
    let sourceUrl = sourceString(source, "url");

    if (manifest.kind === "pr-review") {
      const number = source.pr;
      reference = typeof number === "number" ? `PR #${number}` : undefined;
      status = sourceString(source, "status")?.toLowerCase();
    }

    if (manifest.kind === "codex-reflect") {
      const sessionId = sourceString(source, "primaryThreadId");
      reference = sessionId ? `Session ${sessionId.slice(0, 8)}` : undefined;
    }

    if (manifest.kind === "html-plan") {
      project = projectName(sourceString(source, "repository")) ?? project;
      status = "ready";
    }

    const searchText = [
      manifest.title,
      manifest.id,
      manifest.description,
      manifest.kind,
      project,
      branch,
      reference,
      status,
      ...(manifest.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return [{
      artifact,
      project,
      branch,
      reference,
      status,
      sourceUrl,
      kindLabel: kindLabel(manifest.kind),
      searchText,
    }];
  });
}
