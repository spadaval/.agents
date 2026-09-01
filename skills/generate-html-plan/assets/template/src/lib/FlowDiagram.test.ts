import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlowDiagram, {
  type DiagramEdge,
  type DiagramNode,
} from "./FlowDiagram.svelte";

const nodes: DiagramNode[] = [
  {
    id: "request",
    type: "input",
    position: { x: 0, y: 0 },
    data: { label: "Known context" },
  },
  {
    id: "decision",
    type: "default",
    position: { x: 240, y: 120 },
    data: { label: "Bounded decision" },
  },
  {
    id: "result",
    type: "output",
    position: { x: 0, y: 240 },
    data: { label: "Verified result" },
  },
];

const edges: DiagramEdge[] = [
  { id: "request-decision", source: "request", target: "decision" },
  { id: "decision-result", source: "decision", target: "result" },
];

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FlowDiagram", () => {
  it("renders an accessible, compact authored graph", () => {
    const { container } = render(FlowDiagram, {
      nodes,
      edges,
      title: "Decision flow",
      description: "Known context reaches a bounded decision and verified result.",
      height: 360,
    });

    expect(screen.getByRole("img", { name: "Decision flow" })).toBeTruthy();
    expect(screen.getAllByText("Known context")).toHaveLength(2);
    expect(screen.getAllByText("Bounded decision")).toHaveLength(2);
    expect(screen.getAllByText("Verified result")).toHaveLength(2);
    expect(container.querySelector(".flow-canvas")?.getAttribute("style")).toContain(
      "360px",
    );
    expect(container.querySelector(".svelte-flow__controls")).toBeNull();
  });

  it("shows viewport controls only when interaction is requested", () => {
    const { container } = render(FlowDiagram, {
      nodes,
      edges,
      title: "Interactive decision flow",
      description: "The same authored flow supports deliberate viewport controls.",
      interactive: true,
    });

    expect(container.querySelector(".svelte-flow__controls")).toBeTruthy();
  });
});
