import { readFileSync } from 'node:fs'; import { resolve } from 'node:path'; import { review } from '../src/report/review';
const pack = JSON.parse(readFileSync(resolve('public/data/pr.json'), 'utf8')) as {files:{path:string}[]};
const paths = new Set(pack.files.map((file) => file.path)); if (!review.layers.length) throw new Error('review.ts must define at least one semantic layer.');
for (const path of paths) { const matches = review.layers.filter((layer) => layer.matches(path)); if (matches.length !== 1) throw new Error(`Expected exactly one layer for ${path}; found ${matches.length}.`); }
