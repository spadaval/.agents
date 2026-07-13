import type { ExcerptSide } from "./types";

export type PatchExcerpt =
  | { ok: true; patch: string }
  | { ok: false; message: string };

type PatchRow = {
  raw: string;
  oldBefore: number;
  newBefore: number;
  oldLine?: number;
  newLine?: number;
  kind: "context" | "addition" | "deletion" | "marker";
};

type PatchHunk = { rows: PatchRow[] };

const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

const missingRangeMessage = (
  side: ExcerptSide,
  start: number,
  end: number,
  missing: number[],
) => {
  const detail = missing.length
    ? ` Missing line${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`
    : "";
  return `The fetched patch does not contain the complete ${side}-file range ${start}–${end}.${detail}`;
};

const parseHunks = (patch: string): PatchHunk[] => {
  const hunks: PatchHunk[] = [];
  let active: PatchHunk | undefined;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const match = hunkHeader.exec(raw);
    if (match) {
      oldLine = Number(match[1]);
      newLine = Number(match[3]);
      active = { rows: [] };
      hunks.push(active);
      continue;
    }
    if (!active) continue;

    const oldBefore = oldLine;
    const newBefore = newLine;
    if (raw.startsWith("+")) {
      active.rows.push({
        raw,
        oldBefore,
        newBefore,
        kind: "addition",
        newLine,
      });
      newLine += 1;
    } else if (raw.startsWith("-")) {
      active.rows.push({
        raw,
        oldBefore,
        newBefore,
        kind: "deletion",
        oldLine,
      });
      oldLine += 1;
    } else if (raw.startsWith(" ")) {
      active.rows.push({
        raw,
        oldBefore,
        newBefore,
        kind: "context",
        oldLine,
        newLine,
      });
      oldLine += 1;
      newLine += 1;
    } else if (raw.startsWith("\\ No newline")) {
      active.rows.push({ raw, oldBefore, newBefore, kind: "marker" });
    }
  }
  return hunks;
};

const patchPreamble = (patch: string, path: string) => {
  const firstHunk = patch.search(/^@@ /m);
  if (firstHunk > 0) return patch.slice(0, firstHunk).trimEnd();
  return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}`;
};

const hunkForRows = (rows: PatchRow[]) => {
  const first = rows[0];
  const oldCount = rows.filter(
    (row) => row.kind === "context" || row.kind === "deletion",
  ).length;
  const newCount = rows.filter(
    (row) => row.kind === "context" || row.kind === "addition",
  ).length;
  return `@@ -${first.oldBefore},${oldCount} +${first.newBefore},${newCount} @@\n${rows.map((row) => row.raw).join("\n")}`;
};

/**
 * Creates a minimal valid unified patch for a semantic old- or new-file line
 * range. Rendering remains Pierre's responsibility; this only selects evidence.
 */
export const createPatchExcerpt = (
  patch: string,
  path: string,
  side: ExcerptSide,
  start: number,
  end: number,
  context = 2,
): PatchExcerpt => {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    !Number.isInteger(context) ||
    start < 1 ||
    end < start ||
    context < 0
  ) {
    return {
      ok: false,
      message: `Invalid ${side}-file range ${start}–${end}.`,
    };
  }

  const hunks = parseHunks(patch);
  const matching = hunks.flatMap((hunk, hunkIndex) =>
    hunk.rows.flatMap((row, rowIndex) => {
      const line = side === "new" ? row.newLine : row.oldLine;
      return line !== undefined && line >= start && line <= end
        ? [{ hunkIndex, rowIndex, line }]
        : [];
    }),
  );
  const covered = new Set(matching.map(({ line }) => line));
  const missing = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index,
  ).filter((line) => !covered.has(line));
  if (!matching.length || missing.length) {
    return { ok: false, message: missingRangeMessage(side, start, end, missing) };
  }

  const excerptHunks = hunks.flatMap((hunk, hunkIndex) => {
    const selected = matching
      .filter((match) => match.hunkIndex === hunkIndex)
      .map((match) => match.rowIndex);
    if (!selected.length) return [];

    const selectedFirst = Math.min(...selected);
    const selectedLast = Math.max(...selected);
    let first = Math.max(0, selectedFirst - context);
    let last = Math.min(hunk.rows.length - 1, selectedLast + context);

    // A selected addition needs the deletion block it replaces; likewise an
    // old-file selection needs the corresponding additions. Do not expand
    // through same-side rows: a newly added file is one enormous addition run.
    if (side === "new") {
      for (let index = selectedFirst - 1; index >= 0; index -= 1) {
        const kind = hunk.rows[index].kind;
        if (kind !== "deletion" && kind !== "marker") break;
        first = Math.min(first, index);
      }
    } else {
      for (
        let index = selectedLast + 1;
        index < hunk.rows.length;
        index += 1
      ) {
        const kind = hunk.rows[index].kind;
        if (kind !== "addition" && kind !== "marker") break;
        last = Math.max(last, index);
      }
    }
    return [hunkForRows(hunk.rows.slice(first, last + 1))];
  });

  return {
    ok: true,
    patch: `${patchPreamble(patch, path)}\n${excerptHunks.join("\n")}`,
  };
};
