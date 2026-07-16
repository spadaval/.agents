import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

type Literal =
  string | number | boolean | null | Literal[] | { [key: string]: Literal };
type Metadata = {
  id: string;
  order?: number;
  title: string;
  summary?: string;
  files?: string[];
  primary?: boolean;
};
type Finding = {
  id: string;
  kind: string;
  severity: number;
  title: string;
  body: string;
  reviewedHeadOid: string;
  anchors: Array<{ path: string; side: string; start: number; end: number }>;
};
type RuntimeSource = {
  repository?: string;
  url?: string;
  apiBase?: string;
  pr?: number;
};

const root = resolve(process.cwd());
const { parse } = createRequire(resolve(root, "package.json"))(
  "svelte/compiler",
) as typeof import("svelte/compiler");
const ts = createRequire(resolve(root, "package.json"))(
  "typescript",
) as typeof import("typescript");
const layersDirectory = resolve(root, "src/review/layers");
const storiesDirectory = resolve(root, "src/review/stories");
const findingsDirectory = resolve(root, "src/review/findings");
const evidencePath = resolve(root, "evidence/pr.json");
const runtimePath = resolve(root, "runtime/source.json");
const errors: string[] = [];

type AstNode = { type: string; [key: string]: unknown };

function literalValue(node: AstNode, file: string): Literal {
  if (node.type === "Literal") return node.value as Literal;
  if (node.type === "UnaryExpression" && node.operator === "-") {
    const value = literalValue(node.argument as AstNode, file);
    if (typeof value === "number") return -value;
  }
  if (node.type === "ArrayExpression") {
    return (node.elements as (AstNode | null)[]).map((item) => {
      if (!item)
        throw new Error(`${file}: metadata arrays may not contain holes.`);
      return literalValue(item, file);
    });
  }
  if (node.type === "ObjectExpression") {
    const value: Record<string, Literal> = {};
    for (const property of node.properties as AstNode[]) {
      if (
        property.type !== "Property" ||
        property.kind !== "init" ||
        property.computed ||
        property.shorthand
      ) {
        throw new Error(
          `${file}: metadata must contain literal property assignments only.`,
        );
      }
      const key = property.key as AstNode;
      const name =
        key.type === "Identifier"
          ? (key.name as string)
          : key.type === "Literal"
            ? (key.value as string)
            : undefined;
      if (!name)
        throw new Error(
          `${file}: metadata property names must be identifiers or strings.`,
        );
      value[name] = literalValue(property.value as AstNode, file);
    }
    return value;
  }
  if (
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "ParenthesizedExpression",
    ].includes(node.type)
  ) {
    return literalValue(node.expression, file);
  }
  throw new Error(
    `${file}: metadata values must be static JSON-compatible literals.`,
  );
}

function readMetadata(path: string): Record<string, Literal> {
  const source = readFileSync(path, "utf8");
  const moduleBody = (parse(source, { filename: path }).module?.content.body ??
    []) as AstNode[];
  if (!moduleBody.length)
    throw new Error(
      `${path}: expected a <script module> block exporting entry metadata.`,
    );
  const metadata: Record<string, Literal> = {};
  for (const statement of moduleBody) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    const declaration = statement.declaration as AstNode | undefined;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const variable of declaration.declarations as AstNode[]) {
      const name = variable.id as AstNode;
      if (name.type === "Identifier" && variable.init)
        metadata[name.name as string] = literalValue(
          variable.init as AstNode,
          path,
        );
    }
  }
  const meta = metadata.meta;
  if (!meta || Array.isArray(meta) || typeof meta !== "object")
    throw new Error(
      `${path}: module script must export a literal meta object.`,
    );
  return meta as Record<string, Literal>;
}

function modulePaths(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".svelte"))
    .map((entry) => resolve(directory, entry.name))
    .sort();
}

function findingPaths(): string[] {
  if (!existsSync(findingsDirectory)) return [];
  return readdirSync(findingsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => resolve(findingsDirectory, entry.name))
    .sort();
}

function tsLiteralValue(
  node: import("typescript").Expression,
  file: string,
): Literal {
  while (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node)
  )
    node = node.expression;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken
  ) {
    const value = tsLiteralValue(node.operand, file);
    if (typeof value === "number") return -value;
  }
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((element) => {
      if (!ts.isExpression(element))
        throw new Error(`${file}: finding arrays may only contain literals.`);
      return tsLiteralValue(element, file);
    });
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, Literal> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !property.name)
        throw new Error(
          `${file}: findings must contain literal property assignments only.`,
        );
      const name =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : undefined;
      if (!name)
        throw new Error(
          `${file}: finding property names must be identifiers or strings.`,
        );
      value[name] = tsLiteralValue(property.initializer, file);
    }
    return value;
  }
  throw new Error(`${file}: finding values must be static JSON-compatible literals.`);
}

function readFinding(path: string): Record<string, Literal> {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const assignment = source.statements.find(ts.isExportAssignment);
  if (!assignment || assignment.isExportEquals)
    throw new Error(`${path}: must default-export one literal finding object.`);
  const value = tsLiteralValue(assignment.expression, path);
  if (!value || Array.isArray(value) || typeof value !== "object")
    throw new Error(`${path}: default export must be a literal finding object.`);
  return value as Record<string, Literal>;
}

function collectFindings(): Finding[] {
  const findings: Finding[] = [];
  const ids = new Set<string>();
  const validKinds = new Set([
    "bug",
    "regression",
    "security",
    "performance",
    "maintainability",
    "missing-test",
    "question",
  ]);
  for (const path of findingPaths()) {
    const label = `finding ${basename(path)}`;
    try {
      const value = readFinding(path);
      if (typeof value.id !== "string" || !value.id.trim())
        errors.push(`${label}: id must be a non-empty string.`);
      else if (ids.has(value.id))
        errors.push(`duplicate finding id: ${value.id}.`);
      else ids.add(value.id);
      if (typeof value.kind !== "string" || !validKinds.has(value.kind))
        errors.push(`${label}: kind must be a supported direct finding kind.`);
      if (
        !Number.isInteger(value.severity) ||
        (value.severity as number) < 1 ||
        (value.severity as number) > 5
      )
        errors.push(`${label}: severity must be an integer from 1 to 5.`);
      if (typeof value.title !== "string" || !value.title.trim())
        errors.push(`${label}: title must be a non-empty string.`);
      if (typeof value.body !== "string" || !value.body.trim())
        errors.push(`${label}: body must be a non-empty string.`);
      if (
        typeof value.reviewedHeadOid !== "string" ||
        !value.reviewedHeadOid.trim()
      )
        errors.push(`${label}: reviewedHeadOid must be a non-empty commit OID.`);
      if (!Array.isArray(value.anchors) || !value.anchors.length)
        errors.push(`${label}: anchors must be a non-empty array.`);
      else
        for (const anchor of value.anchors) {
          if (!anchor || Array.isArray(anchor) || typeof anchor !== "object") {
            errors.push(`${label}: every anchor must be an object.`);
            continue;
          }
          const item = anchor as Record<string, Literal>;
          if (typeof item.path !== "string" || !item.path)
            errors.push(`${label}: anchor path must be a non-empty exact path.`);
          if (item.side !== "new" && item.side !== "old")
            errors.push(`${label}: anchor side must be "new" or "old".`);
          if (
            !Number.isInteger(item.start) ||
            !Number.isInteger(item.end) ||
            (item.start as number) < 1 ||
            (item.end as number) < (item.start as number)
          )
            errors.push(
              `${label}: anchor range must use positive start/end lines.`,
            );
        }
      findings.push(value as unknown as Finding);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return findings;
}

function validateCommon(
  metadata: Record<string, Literal>,
  path: string,
  kind: "layer" | "story",
): Metadata | undefined {
  const label = `${kind} ${basename(path)}`;
  if (metadata.kind !== kind)
    errors.push(`${label}: meta.kind must be "${kind}".`);
  if (typeof metadata.id !== "string" || !metadata.id.trim())
    errors.push(`${label}: id must be a non-empty string.`);
  if (
    metadata.order !== undefined &&
    (typeof metadata.order !== "number" || !Number.isFinite(metadata.order))
  ) {
    errors.push(`${label}: order must be a finite number when provided.`);
  }
  if (typeof metadata.title !== "string" || !metadata.title.trim())
    errors.push(`${label}: title must be a non-empty string.`);
  if (errors.some((error) => error.startsWith(`${label}:`))) return undefined;
  return metadata as unknown as Metadata;
}

function collect(kind: "layer" | "story", directory: string): Metadata[] {
  const entries: Metadata[] = [];
  for (const path of modulePaths(directory)) {
    try {
      const metadata = readMetadata(path);
      const entry = validateCommon(metadata, path, kind);
      if (!entry) continue;
      if (kind === "layer") {
        if (typeof metadata.summary !== "string" || !metadata.summary.trim()) {
          errors.push(
            `layer ${basename(path)}: summary must be a non-empty string.`,
          );
          continue;
        }
        entry.summary = metadata.summary;
        if (
          !Array.isArray(metadata.files) ||
          metadata.files.some((file) => typeof file !== "string" || !file)
        ) {
          errors.push(
            `layer ${basename(path)}: files must be an array of exact, non-empty paths.`,
          );
          continue;
        }
        entry.files = metadata.files as string[];
        if (entry.files.length === 0)
          errors.push(`layer ${basename(path)}: empty layers are not allowed.`);
        const duplicates = [
          ...new Set(
            entry.files.filter(
              (file, index) => entry.files!.indexOf(file) !== index,
            ),
          ),
        ];
        for (const file of duplicates)
          errors.push(`layer ${entry.id}: duplicate file entry ${file}.`);
      } else if (
        metadata.primary !== undefined &&
        typeof metadata.primary !== "boolean"
      ) {
        errors.push(
          `story ${basename(path)}: primary must be a boolean when provided.`,
        );
      }
      entries.push(entry);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const ids = new Map<string, number>();
  const orders = new Map<number, number>();
  for (const entry of entries) {
    ids.set(entry.id, (ids.get(entry.id) ?? 0) + 1);
    if (entry.order !== undefined)
      orders.set(entry.order, (orders.get(entry.order) ?? 0) + 1);
  }
  for (const [id, count] of ids)
    if (count > 1) errors.push(`duplicate ${kind} id: ${id}.`);
  for (const [order, count] of orders)
    if (count > 1) errors.push(`duplicate ${kind} order: ${order}.`);
  return entries;
}

function runtimeFiles(source: RuntimeSource): Set<string> {
  if (!Number.isInteger(source.pr))
    throw new Error("runtime/source.json: pr must be an integer.");
  const candidate = source.url ?? source.repository;
  if (!candidate)
    throw new Error("runtime/source.json: url or repository is required.");
  let hostname: string | undefined;
  let owner: string;
  let repository: string;
  try {
    const url = new URL(candidate);
    hostname = url.hostname;
    [owner, repository] = url.pathname.split("/").filter(Boolean);
  } catch {
    [owner, repository] = candidate.split("/").filter(Boolean);
  }
  repository = repository?.replace(/\.git$/, "");
  if (!owner || !repository)
    throw new Error(
      "runtime/source.json must identify an owner and repository.",
    );
  const args = ["api"];
  if (hostname) args.push("--hostname", hostname);
  args.push(
    "--paginate",
    `repos/${owner}/${repository}/pulls/${source.pr}/files`,
    "--method",
    "GET",
    "-f",
    "per_page=100",
    "--jq",
    ".[].filename",
  );
  try {
    const output = execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return new Set(output.split(/\r?\n/).filter(Boolean));
  } catch (error) {
    const failure = error as { stderr?: Buffer | string; message?: string };
    const detail =
      failure.stderr?.toString().trim() || failure.message || String(error);
    throw new Error(
      `Unable to load live PR files (gh ${args.join(" ")}): ${detail}`,
    );
  }
}

function changedFiles(): {
  paths: Set<string>;
  source: "runtime" | "evidence";
} {
  if (existsSync(runtimePath)) {
    return {
      paths: runtimeFiles(
        JSON.parse(readFileSync(runtimePath, "utf8")) as RuntimeSource,
      ),
      source: "runtime",
    };
  }
  if (existsSync(evidencePath)) {
    const pack = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      files?: { path?: unknown }[];
    };
    if (!Array.isArray(pack.files))
      throw new Error("evidence/pr.json: files must be an array.");
    return {
      paths: new Set(
        pack.files.map((file) => {
          if (typeof file.path !== "string" || !file.path)
            throw new Error(
              "evidence/pr.json: every file needs a non-empty path.",
            );
          return file.path;
        }),
      ),
      source: "evidence",
    };
  }
  throw new Error("runtime/source.json or evidence/pr.json is required.");
}

const layers = collect("layer", layersDirectory);
const stories = collect("story", storiesDirectory);
const findings = collectFindings();
if (layers.length === 0)
  errors.push("src/review/layers must contain at least one layer module.");
if (stories.filter((story) => story.primary).length > 1)
  errors.push("at most one story may declare primary: true.");

let changed: Set<string> | undefined;
let source: "runtime" | "evidence" | undefined;
try {
  ({ paths: changed, source } = changedFiles());
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

if (changed) {
  const mapped = new Set(layers.flatMap((layer) => layer.files ?? []));
  for (const file of changed)
    if (!mapped.has(file)) errors.push(`unassigned changed file: ${file}.`);
  for (const file of mapped)
    if (!changed.has(file)) errors.push(`stale mapped path: ${file}.`);
  for (const finding of findings)
    for (const anchor of finding.anchors)
      if (!changed.has(anchor.path))
        errors.push(
          `finding ${finding.id}: anchor path is not a current changed file: ${anchor.path}.`,
        );
}

if (errors.length) {
  throw new Error(`Review validation failed:\n- ${errors.join("\n- ")}`);
}
console.log(
  `Review validation passed (${source}: ${changed!.size} changed files; ${layers.length} layers; ${stories.length} stories; ${findings.length} findings).`,
);
