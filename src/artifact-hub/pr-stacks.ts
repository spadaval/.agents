import type { PrCatalogSnapshot, PrCatalogSummary } from "./pr-summary-api";
import type { PrGroup } from "./pr-groups";

export type PrStack = {
  id: string;
  project: string;
  groups: PrGroup[];
  freshness: PrCatalogSnapshot["freshness"];
};

export type PrStackResolution = {
  stacks: PrStack[];
  memberToStack: Map<string, string>;
  ambiguous: Set<string>;
};

type Node = {
  id: string;
  group: PrGroup;
  summary: PrCatalogSummary;
};

const repositoryKey = (value: string) => value.toLowerCase();
const refKey = (host: string, repository: string, ref: string) =>
  `${host}\u0000${repositoryKey(repository)}\u0000${ref}`;

export function inferPrStacks(
  groups: PrGroup[],
  snapshot: PrCatalogSnapshot | null,
): PrStackResolution {
  const empty = (): PrStackResolution => ({
    stacks: [],
    memberToStack: new Map(),
    ambiguous: new Set(),
  });
  if (!snapshot) return empty();

  const nodes: Node[] = groups.flatMap((group) => {
    const summary = group.summary;
    if (!group.identity || !summary || summary.pr.state !== "OPEN") return [];
    return [{ id: group.id, group, summary }];
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parentsByHead = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = refKey(
      node.group.identity!.host,
      node.summary.pr.headRepository,
      node.summary.pr.headRefName,
    );
    const parents = parentsByHead.get(key) ?? [];
    parents.push(node);
    parentsByHead.set(key, parents);
  }

  const children = new Map<string, Set<string>>();
  const parents = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const child of nodes) {
    const key = refKey(
      child.group.identity!.host,
      child.summary.pr.baseRepository,
      child.summary.pr.baseRefName,
    );
    const candidates = (parentsByHead.get(key) ?? []).filter(
      (parent) =>
        parent.id !== child.id &&
        repositoryKey(parent.summary.repository) ===
          repositoryKey(child.summary.repository),
    );
    if (candidates.length > 1) {
      ambiguous.add(child.id);
      continue;
    }
    const parent = candidates[0];
    if (!parent) continue;
    parents.set(child.id, parent.id);
    const siblings = children.get(parent.id) ?? new Set<string>();
    siblings.add(child.id);
    children.set(parent.id, siblings);
  }

  const connected = new Map<string, Set<string>>();
  for (const [child, parent] of parents) {
    (connected.get(child) ?? connected.set(child, new Set()).get(child)!).add(
      parent,
    );
    (
      connected.get(parent) ?? connected.set(parent, new Set()).get(parent)!
    ).add(child);
  }

  const visited = new Set<string>();
  const stacks: PrStack[] = [];
  for (const start of connected.keys()) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const pending = [start];
    while (pending.length) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      component.push(id);
      for (const neighbor of connected.get(id) ?? []) pending.push(neighbor);
    }
    if (component.length < 2) continue;

    const componentIds = new Set(component);
    const indegree = new Map(
      component.map((id) => [id, parents.has(id) ? 1 : 0]),
    );
    const ready = component
      .filter((id) => indegree.get(id) === 0)
      .sort(
        (left, right) =>
          byId.get(left)!.summary.pr.number -
          byId.get(right)!.summary.pr.number,
      );
    const ordered: string[] = [];
    while (ready.length) {
      const id = ready.shift()!;
      ordered.push(id);
      for (const child of children.get(id) ?? []) {
        if (!componentIds.has(child)) continue;
        const next = (indegree.get(child) ?? 0) - 1;
        indegree.set(child, next);
        if (next === 0) {
          ready.push(child);
          ready.sort(
            (left, right) =>
              byId.get(left)!.summary.pr.number -
              byId.get(right)!.summary.pr.number,
          );
        }
      }
    }
    if (ordered.length !== component.length) {
      component.forEach((id) => ambiguous.add(id));
      continue;
    }
    const stackGroups = ordered.map((id) => byId.get(id)!.group);
    const root = byId.get(ordered[0])!;
    stacks.push({
      id: `pr-stack:${repositoryKey(root.summary.repository)}:${ordered.join(",")}`,
      project: root.group.project,
      groups: stackGroups,
      freshness: snapshot.freshness,
    });
  }

  const memberToStack = new Map<string, string>();
  for (const stack of stacks) {
    for (const group of stack.groups) {
      memberToStack.set(group.id, stack.id);
    }
  }
  return { stacks, memberToStack, ambiguous };
}
