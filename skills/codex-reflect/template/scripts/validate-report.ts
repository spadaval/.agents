import { readFile } from 'node:fs/promises';
import { runAnalysis } from '../src/report/report';
import { validateAnalysis } from '../src/platform/analysis-validator';
import type { EvidencePack } from '../src/platform/types';

const pack = JSON.parse(await readFile(new URL('../public/data/evidence.json', import.meta.url), 'utf8')) as EvidencePack;
const errors = validateAnalysis(runAnalysis, pack);
if (errors.length) { console.error(errors.map((error) => `- ${error}`).join('\n')); process.exitCode = 1; }
else console.log(`Report analysis is valid (${pack.sessions.length} sessions, ${pack.evidence.length} evidence records).`);
