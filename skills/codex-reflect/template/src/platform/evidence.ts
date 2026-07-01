import type { EvidencePack } from './types';

export async function loadEvidence(): Promise<EvidencePack> {
  const response = await fetch('/data/evidence.json');
  if (!response.ok) throw new Error(`Could not load evidence (${response.status}).`);
  return response.json() as Promise<EvidencePack>;
}

export function evidenceHref(id: string): string { return `#/evidence/${encodeURIComponent(id)}`; }
