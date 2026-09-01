# Diagram Authoring

Read this only after a node-edge diagram has been justified. A plan that merely
discusses architecture does not automatically need one.

Use Svelte Flow for architecture boundaries, multi-stage control flows,
ownership relationships, and dependency graphs. Use native HTML tables or
grids for exact timings, mappings, comparisons, roadmaps, and delivery
sequences. Omit the diagram when prose or a small table is clearer.

Treat every diagram as an authored explanation:

1. Give it one question. Split independent concerns and show terminal outcomes
   as destinations.
2. Start from `src/lib/FlowDiagram.svelte`. Give every node an explicit position
   in a compact reading path. Keep the graph non-editable; enable pan or zoom
   only when the inline viewport cannot remain legible.
3. Supply a factual title, accessible description, concise labels, meaningful
   edge direction, and logical source order. Use custom nodes only when they add
   semantics.
4. For the same flow before and after a change, prefer one Current/Target
   selector. Removed behavior belongs only in Current.
5. Remove adjacent prose, tables, or callouts that merely repeat the same
   relationship. Keep another representation only when it adds precision.

Run the diagram component tests and inspect every authored layout at desktop
and narrow widths. Confirm labels remain readable, the initial viewport is
compact, edges communicate direction, page scrolling is not trapped, and any
enabled pan or zoom works by mouse and keyboard.
