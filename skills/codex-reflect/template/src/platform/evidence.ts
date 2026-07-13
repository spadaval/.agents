import type { EvidencePack } from './types';

export async function loadEvidence(): Promise<EvidencePack> {
  const response = await fetch('./evidence/evidence.json');
  if (!response.ok) throw new Error(`Could not load evidence (${response.status}).`);
  return response.json() as Promise<EvidencePack>;
}
