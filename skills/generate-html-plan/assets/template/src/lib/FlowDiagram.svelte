<script module lang="ts">
  import type { Edge, EdgeTypes, Node, NodeTypes } from "@xyflow/svelte";

  export type DiagramNode = Node<{ label: string }, string>;
  export type DiagramEdge = Edge;
  export type DiagramNodeTypes = NodeTypes;
  export type DiagramEdgeTypes = EdgeTypes;

  let nextDiagramId = 0;
</script>

<script lang="ts">
  import {
    Controls,
    MarkerType,
    SvelteFlow,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";

  let {
    nodes,
    edges,
    title,
    description,
    height = 420,
    interactive = false,
    nodeTypes = {},
    edgeTypes = {},
  }: {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    title: string;
    description: string;
    height?: number;
    interactive?: boolean;
    nodeTypes?: DiagramNodeTypes;
    edgeTypes?: DiagramEdgeTypes;
  } = $props();

  const instanceId = ++nextDiagramId;
  const titleId = `flow-diagram-title-${instanceId}`;
  const descriptionId = `flow-diagram-description-${instanceId}`;
</script>

<figure>
  <div
    class="flow-canvas"
    class:interactive
    style:--flow-diagram-height={`${height}px`}
    role="img"
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
  >
    <SvelteFlow
      {nodes}
      {edges}
      {nodeTypes}
      {edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.08, minZoom: 0.2, maxZoom: 1 }}
      defaultEdgeOptions={{
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      autoPanOnNodeFocus={false}
      zoomOnScroll={interactive}
      zoomOnDoubleClick={interactive}
      zoomOnPinch={interactive}
      panOnDrag={interactive}
      panOnScroll={false}
      preventScrolling={false}
      deleteKey={null}
      selectionKey={null}
      multiSelectionKey={null}
      panActivationKey={interactive ? "Space" : null}
      zoomActivationKey={interactive ? ["Meta", "Control"] : null}
      proOptions={{ hideAttribution: true }}
    >
      {#if interactive}<Controls showLock={false} />{/if}
    </SvelteFlow>
  </div>

  <ol class="sr-only" aria-label={`${title} nodes`}>
    {#each nodes as node (node.id)}
      <li>{node.data.label}</li>
    {/each}
  </ol>

  <figcaption>
    <strong id={titleId}>{title}</strong>
    <p id={descriptionId}>{description}</p>
  </figcaption>
</figure>

<style>
  figure {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    color: var(--diagram-text, #dce8e2);
    border: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
    border-radius: 8px;
    background: var(--diagram-surface, #0b151a);
  }
  .flow-canvas {
    width: 100%;
    height: var(--flow-diagram-height);
    min-height: 260px;
    background: var(--diagram-canvas, #071015);
  }
  .flow-canvas:not(.interactive) {
    cursor: default;
  }
  figcaption {
    padding: 15px 18px 17px;
    border-top: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
  }
  figcaption strong {
    font-size: 0.82rem;
  }
  figcaption p {
    max-width: 78ch;
    margin: 5px 0 0;
    color: var(--diagram-muted, #91a4ac);
    font-size: 0.75rem;
    line-height: 1.55;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  :global(.svelte-flow__node) {
    min-width: 150px;
    max-width: 230px;
    padding: 11px 14px;
    color: var(--diagram-node-text, #172018);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
    text-align: center;
    white-space: normal;
    border: 1px solid var(--diagram-node-line, #60776b);
    border-radius: 7px;
    background: var(--diagram-node-surface, #eef3ef);
    box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
  }
  :global(.svelte-flow__node-input) {
    border-color: var(--diagram-input-line, #39796e);
    background: var(--diagram-input-surface, #dceee8);
  }
  :global(.svelte-flow__node-output) {
    border-color: var(--diagram-output-line, #68854b);
    background: var(--diagram-output-surface, #e8f0de);
  }
  :global(.svelte-flow__handle) {
    width: 7px;
    height: 7px;
    border: 1px solid var(--diagram-edge, #70877c);
    background: var(--diagram-edge, #70877c);
  }
  :global(.svelte-flow__edge-path) {
    stroke: var(--diagram-edge, #8ba79a);
    stroke-width: 1.8;
  }
  :global(.svelte-flow__edge-text) {
    fill: var(--diagram-text, #dce8e2);
    font-size: 11px;
  }
  :global(.svelte-flow__edge-textbg) {
    fill: var(--diagram-canvas, #071015);
  }
  :global(.svelte-flow__controls) {
    overflow: hidden;
    border: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.3));
    border-radius: 6px;
    box-shadow: none;
  }
  :global(.svelte-flow__controls-button) {
    color: var(--diagram-control, #b9c9cf);
    border-bottom-color: var(--diagram-line, rgba(148, 163, 184, 0.3));
    background: var(--diagram-surface, #0b151a);
  }
  :global(.svelte-flow__controls-button:hover) {
    background: var(--diagram-node-line, #31483d);
  }
  :global(.svelte-flow__controls-button svg) {
    fill: currentColor;
  }
  @media (max-width: 700px) {
    .flow-canvas {
      min-height: 320px;
    }
    figcaption {
      padding: 13px 14px 15px;
    }
  }
</style>
