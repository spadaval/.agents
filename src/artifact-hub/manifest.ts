export interface ArtifactManifest {
  manifestVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  entry: string;
  description?: string;
  kind?: string;
  tags?: string[];
  source?: Record<string, unknown>;
}

export interface ValidArtifact {
  valid: true;
  manifestPath: string;
  directoryName: string;
  manifest: ArtifactManifest;
  href: string;
}

export interface InvalidArtifact {
  valid: false;
  manifestPath: string;
  directoryName: string;
  error: string;
}

export type ParsedArtifact = ValidArtifact | InvalidArtifact;

export const ARTIFACT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,78}[a-z0-9])?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateArtifactId(id: string): string | undefined {
  if (!ARTIFACT_ID_PATTERN.test(id) || id === "." || id === "..") {
    return "id must be 1-80 lowercase letters, numbers, dots, underscores, or hyphens and start and end with a letter or number";
  }
  return undefined;
}

export function validateEntry(entry: string): string | undefined {
  if (
    !entry ||
    entry.startsWith("/") ||
    entry.includes("\\") ||
    entry.includes("\0")
  ) {
    return "entry must be a non-empty artifact-relative path";
  }
  const segments = entry.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return "entry must stay within the artifact directory";
  }
  if (!entry.endsWith(".html")) {
    return "entry must name an HTML file";
  }
  return undefined;
}

function artifactDirectory(manifestPath: string): string {
  const normalized = manifestPath.replaceAll("\\", "/");
  const match = normalized.match(/(?:^|\/)artifacts\/([^/]+)\/manifest\.json$/);
  return match?.[1] ?? normalized.split("/").at(-2) ?? "unknown";
}

function artifactHref(id: string): string {
  return `/artifacts/${encodeURIComponent(id)}/`;
}

export function parseArtifactManifest(
  raw: string,
  manifestPath: string,
): ParsedArtifact {
  const directoryName = artifactDirectory(manifestPath);
  const invalid = (error: string): InvalidArtifact => ({
    valid: false,
    manifestPath,
    directoryName,
    error,
  });

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return invalid(
      `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isRecord(value)) return invalid("manifest must be a JSON object");
  if (value.manifestVersion !== 1) return invalid("manifestVersion must be 1");

  for (const field of ["id", "title", "createdAt", "entry"] as const) {
    if (typeof value[field] !== "string" || value[field].trim() === "") {
      return invalid(`${field} must be a non-empty string`);
    }
  }

  const id = value.id as string;
  const idError = validateArtifactId(id);
  if (idError) return invalid(idError);
  if (id !== directoryName)
    return invalid(
      `id ${JSON.stringify(id)} must match directory ${JSON.stringify(directoryName)}`,
    );

  const entry = value.entry as string;
  const entryError = validateEntry(entry);
  if (entryError) return invalid(entryError);

  const createdAt = value.createdAt as string;
  if (Number.isNaN(Date.parse(createdAt)))
    return invalid("createdAt must be a valid date-time string");

  if (
    value.description !== undefined &&
    typeof value.description !== "string"
  ) {
    return invalid("description must be a string when present");
  }
  if (value.kind !== undefined && typeof value.kind !== "string") {
    return invalid("kind must be a string when present");
  }
  if (
    value.tags !== undefined &&
    (!Array.isArray(value.tags) ||
      value.tags.some((tag) => typeof tag !== "string"))
  ) {
    return invalid("tags must be an array of strings when present");
  }
  if (value.source !== undefined && !isRecord(value.source)) {
    return invalid("source must be an object when present");
  }

  const manifest: ArtifactManifest = {
    manifestVersion: 1,
    id,
    title: (value.title as string).trim(),
    createdAt,
    entry,
    ...(value.description !== undefined
      ? { description: value.description as string }
      : {}),
    ...(value.kind !== undefined ? { kind: value.kind as string } : {}),
    ...(value.tags !== undefined ? { tags: value.tags as string[] } : {}),
    ...(value.source !== undefined
      ? { source: value.source as Record<string, unknown> }
      : {}),
  };

  return {
    valid: true,
    manifestPath,
    directoryName,
    manifest,
    href: artifactHref(id),
  };
}
