import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiagramViewer from "./DiagramViewer.svelte";

const props = {
  src: "/diagram.svg",
  title: "Event ownership",
  description: "The durable event crosses one persistence boundary.",
  caption: "D2 · ELK",
};

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("DiagramViewer", () => {
  it("provides an accessible inline figure and modal name", async () => {
    const { container } = render(DiagramViewer, props);
    expect(screen.getByRole("img", { name: props.description })).toBeTruthy();
    expect(screen.getByText(props.caption)).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: `Expand ${props.title}` }),
    );

    const dialog = container.querySelector("dialog")!;
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close expanded diagram" })).toBe(
      document.activeElement,
    );
  });

  it("locks scrolling, closes, and restores focus", async () => {
    render(DiagramViewer, props);
    const trigger = screen.getByRole("button", {
      name: `Expand ${props.title}`,
    });

    await fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    await fireEvent.click(
      screen.getByRole("button", { name: "Close expanded diagram" }),
    );
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("handles Escape cancellation and keyboard panning", async () => {
    const { container } = render(DiagramViewer, props);
    const trigger = screen.getByRole("button", {
      name: `Expand ${props.title}`,
    });
    await fireEvent.click(trigger);

    const dialog = container.querySelector("dialog")!;
    const canvas = container.querySelector(".modal-canvas") as HTMLElement;
    const scrollBy = vi.fn();
    Object.defineProperty(canvas, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });

    await fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(scrollBy).toHaveBeenCalledWith({
      left: 96,
      top: 0,
      behavior: "smooth",
    });

    await fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });
});
