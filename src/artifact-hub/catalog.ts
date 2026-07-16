import type { ParsedArtifact, ValidArtifact } from "./manifest";

export interface ArtifactRecord {
  artifact: ValidArtifact;
  kind: string;
  project: string;
  repository?: string;
  branch?: string;
  baseBranch?: string;
  reference?: string;
  status?: string;
  sourceUrl?: string;
  producer?: string;
  imported: boolean;
  source: Record<string, unknown>;
  searchText: string;
}

export function sourceString(
  source: Record<string, unknown>,
  field: string,
): string | undefined {
  return typeof source[field] === "string" ? source[field] : undefined;
}

export function sourceNumber(
  source: Record<string, unknown>,
  field: string,
): number | undefined {
  return typeof source[field] === "number" ? source[field] : undefined;
}

export function sourceArray(
  source: Record<string, unknown>,
  field: string,
): unknown[] {
  return Array.isArray(source[field]) ? source[field] : [];
}

function projectName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\\/g, "/").replace(/\/$/, "");
  return normalized.split("/").at(-1) || undefined;
}

export function buildCatalogRecords(
  artifacts: ParsedArtifact[],
): ArtifactRecord[] {
  return artifacts.flatMap((artifact) => {
    if (!artifact.valid) return [];
    const { manifest } = artifact;
    const source = manifest.source ?? {};
    const kind = manifest.kind ?? "artifact";
    const repository = sourceString(source, "repository");
    let project =
      sourceString(source, "project") ?? projectName(repository) ?? "Local";
    const branch = sourceString(source, "branch");
    const baseBranch = sourceString(source, "baseBranch");
    const producer = sourceString(source, "producer");
    let reference: string | undefined;
    let status: string | undefined;
    const sourceUrl = sourceString(source, "url");

    if (kind === "pr-review") {
      const number = sourceNumber(source, "pr");
      reference = number === undefined ? undefined : `PR #${number}`;
      status = sourceString(source, "status")?.toLowerCase();
    }

    if (kind === "codex-reflect") {
      const sessionId =
        sourceString(source, "primaryThreadId") ??
        sourceString(source, "discoverySessionId");
      reference = sessionId ? `Session ${sessionId.slice(0, 8)}` : undefined;
    }

    if (kind === "html-plan") {
      project = projectName(repository) ?? project;
      status = "ready";
    }

    const imported = Boolean(
      manifest.tags?.includes("migrated") ||
      sourceString(source, "legacyWorkspace"),
    );
    const searchText = [
      manifest.title,
      manifest.id,
      manifest.description,
      kind,
      project,
      repository,
      branch,
      baseBranch,
      reference,
      status,
      producer,
      ...Object.values(source).filter(
        (value): value is string => typeof value === "string",
      ),
      ...(manifest.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return [
      {
        artifact,
        kind,
        project,
        repository,
        branch,
        baseBranch,
        reference,
        status,
        sourceUrl,
        producer,
        imported,
        source,
        searchText,
      },
    ];
  });
}
