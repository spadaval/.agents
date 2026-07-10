#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2); const value = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const repo = resolve(value('--repo') ?? '.'); const pr = value('--pr'); const output = value('--output-dir');
if (!pr || !output) throw new Error('Usage: extract-pr.mjs --repo <repo> --pr <number> --output-dir <new-workspace>');
const run = (...args) => { try { return execFileSync(args[0], args.slice(1), { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { const detail = error.stderr?.toString().trim() || error.stdout?.toString().trim() || error.message; throw new Error(`Command failed (${args.join(' ')}): ${detail}`); } };
const destination = resolve(output); if (existsSync(destination)) throw new Error(`Output directory already exists: ${destination}`);
const meta = JSON.parse(run('gh', 'pr', 'view', pr, '--json', 'number,title,body,url,author,baseRefName,baseRefOid,headRefName,headRefOid,state,isDraft,mergeable,reviewDecision,additions,deletions,changedFiles,labels,statusCheckRollup'));
const { baseRefOid: base, headRefOid: head } = meta; run('git', 'cat-file', '-e', `${base}^{commit}`); run('git', 'cat-file', '-e', `${head}^{commit}`);
const nameFields = run('git', 'diff', '--name-status', '-z', `${base}...${head}`).split('\0'); const numFields = run('git', 'diff', '--numstat', '-z', `${base}...${head}`).split('\0'); const stats = new Map();
for (const row of numFields) if (row) { const [additions, deletions, path] = row.split('\t'); stats.set(path, { additions, deletions }); }
const files = []; for (let index = 0; index < nameFields.length - 1;) { const status = nameFields[index++]; let path = nameFields[index++]; if (/^[RC]/.test(status)) path = nameFields[index++]; const diff = run('git', 'diff', '--no-ext-diff', '--unified=4', `${base}...${head}`, '--', path); files.push({ path, status, ...(stats.get(path) ?? { additions: '0', deletions: '0' }), diff }); }
mkdirSync(join(destination, 'evidence'), { recursive: true, mode: 0o700 }); mkdirSync(join(destination, 'markdown'));
writeFileSync(join(destination, 'evidence/pr.json'), `${JSON.stringify({ schemaVersion: 1, repository: repo, pr: meta, files }, null, 2)}\n`); chmodSync(join(destination, 'evidence/pr.json'), 0o400);
const lines = [`# PR #${meta.number}: ${meta.title}`, '', `- Base: \`${base}\` (${meta.baseRefName})`, `- Head: \`${head}\` (${meta.headRefName})`, `- Scope: ${files.length} files, +${meta.additions}/-${meta.deletions}`, '', '## Changed files', '', ...files.map((file) => `- \`${file.path}\` — ${file.status}, +${file.additions}/-${file.deletions}`)];
writeFileSync(join(destination, 'markdown/index.md'), `${lines.join('\n')}\n`); writeFileSync(join(destination, 'manifest.json'), `${JSON.stringify({ pr: Number(pr), appCreated: false }, null, 2)}\n`); console.log(join(destination, 'markdown/index.md'));
