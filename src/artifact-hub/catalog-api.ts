import type { ParsedArtifact } from "./manifest";

export async function loadArtifactCatalog(
  fetcher: typeof fetch = fetch,
): Promise<ParsedArtifact[]> {
  const response = await fetcher("/api/artifacts", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Artifact catalog request failed (${response.status})`);
  }
  const payload = (await response.json()) as { artifacts?: unknown };
  if (!Array.isArray(payload.artifacts)) {
    throw new Error("Artifact catalog response is missing artifacts");
  }
  return payload.artifacts as ParsedArtifact[];
}
