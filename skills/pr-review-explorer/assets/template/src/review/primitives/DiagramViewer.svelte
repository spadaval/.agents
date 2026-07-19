<script module lang="ts">
  let nextDiagramId = 0;
</script>

<script lang="ts">
  import { onDestroy, tick } from "svelte";

  let {
    src,
    title,
    description,
    caption = "",
    minWidth = 780,
    expandedMinWidth = 1600,
  }: {
    src: string;
    title: string;
    description: string;
    caption?: string;
    minWidth?: number;
    expandedMinWidth?: number;
  } = $props();

  const instanceId = ++nextDiagramId;
  const titleId = `diagram-title-${instanceId}`;
  const descriptionId = `diagram-description-${instanceId}`;

  let dialog: HTMLDialogElement;
  let closeButton: HTMLButtonElement;
  let modalCanvas: HTMLElement;
  let trigger: HTMLElement | null = null;
  let previousOverflow = "";
  let scrollLocked = false;

  async function openDiagram(event: MouseEvent) {
    trigger = event.currentTarget as HTMLElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scrollLocked = true;
    dialog.showModal();
    await tick();
    closeButton.focus();
  }

  function closeDiagram() {
    if (dialog.open) dialog.close();
  }

  function finishClose() {
    if (scrollLocked) document.body.style.overflow = previousOverflow;
    scrollLocked = false;
    requestAnimationFrame(() => trigger?.focus());
  }

  function cancelDialog(event: Event) {
    event.preventDefault();
    closeDiagram();
  }

  function panDiagram(event: KeyboardEvent) {
    const step = event.shiftKey ? 360 : 96;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      PageUp: [0, -Math.max(300, window.innerHeight * 0.7)],
      PageDown: [0, Math.max(300, window.innerHeight * 0.7)],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    modalCanvas.scrollBy({
      left: offset[0],
      top: offset[1],
      behavior: "smooth",
    });
  }

  onDestroy(() => {
    if (dialog?.open) dialog.close();
    if (scrollLocked) document.body.style.overflow = previousOverflow;
  });
</script>

<figure>
  <div class="inline-canvas" style:--diagram-min-width={`${minWidth}px`}>
    <button
      class="expand"
      type="button"
      aria-label={`Expand ${title}`}
      title="Expand diagram"
      onclick={openDiagram}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5M3 8l6-6M21 8l-6-6M3 16l6 6M21 16l-6 6"
        />
      </svg>
    </button>
    <img {src} alt={description} />
  </div>
  <figcaption>
    <div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
    {#if caption}<span>{caption}</span>{/if}
  </figcaption>
</figure>

<dialog
  bind:this={dialog}
  aria-labelledby={titleId}
  aria-describedby={descriptionId}
  oncancel={cancelDialog}
  onclose={finishClose}
  onkeydown={panDiagram}
  onclick={(event) => event.target === dialog && closeDiagram()}
>
  <section class="modal-panel">
    <header>
      <div>
        <small>Expanded architecture diagram</small>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </div>
      <button
        bind:this={closeButton}
        class="close"
        type="button"
        aria-label="Close expanded diagram"
        title="Close"
        onclick={closeDiagram}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
    </header>
    <section
      bind:this={modalCanvas}
      class="modal-canvas"
      style:--expanded-min-width={`${expandedMinWidth}px`}
    >
      <img {src} alt={description} />
    </section>
  </section>
</dialog>

<style>
  figure {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
    border-radius: 8px;
    background: var(--diagram-surface, #0b151a);
  }
  .inline-canvas {
    position: relative;
    overflow: auto;
    padding: 20px;
    background: var(--diagram-canvas, #071015);
    scrollbar-color: #607881 #0d1b21;
  }
  .inline-canvas img {
    display: block;
    width: 100%;
    min-width: var(--diagram-min-width);
    height: auto;
    margin: 0 auto;
  }
  .expand,
  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--diagram-control, #b9c9cf);
    border: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.3));
    border-radius: 6px;
    background: color-mix(
      in srgb,
      var(--diagram-surface, #0b151a) 92%,
      transparent
    );
    cursor: pointer;
  }
  .expand {
    position: sticky;
    top: 8px;
    left: calc(100% - 40px);
    z-index: 2;
    width: 36px;
    height: 36px;
    margin-bottom: -36px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  .expand:hover,
  .expand:focus-visible,
  .close:hover,
  .close:focus-visible {
    color: #fff;
    border-color: var(--diagram-accent, #5eead4);
    outline: none;
  }
  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  figcaption {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: start;
    padding: 16px 18px;
    border-top: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
  }
  figcaption strong {
    font-size: 0.82rem;
  }
  figcaption p {
    margin: 5px 0 0;
    color: var(--diagram-muted, #91a4ac);
    font-size: 0.75rem;
    line-height: 1.55;
  }
  figcaption span {
    color: var(--diagram-muted, #71848c);
    font:
      600 0.62rem ui-monospace,
      monospace;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  dialog {
    position: fixed;
    inset: 0;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 18px;
    color: inherit;
    border: 0;
    background: transparent;
  }
  dialog::backdrop {
    background: rgba(2, 7, 10, 0.94);
    backdrop-filter: blur(14px);
  }
  .modal-panel {
    display: grid;
    width: 100%;
    height: 100%;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    border: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
    border-radius: 8px;
    background: var(--diagram-surface, #071015);
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.65);
  }
  .modal-panel > header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: start;
    padding: 18px 20px;
    border-bottom: 1px solid var(--diagram-line, rgba(148, 163, 184, 0.25));
  }
  header small {
    color: var(--diagram-muted, #71848c);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  header h2 {
    margin: 4px 0 0;
    font-size: clamp(1.1rem, 2vw, 1.55rem);
  }
  header p {
    max-width: 960px;
    margin: 6px 0 0;
    color: var(--diagram-muted, #91a4ac);
    font-size: 0.75rem;
    line-height: 1.55;
  }
  .close {
    width: 40px;
    height: 40px;
  }
  .modal-canvas {
    overflow: auto;
    padding: 28px;
    background: var(--diagram-canvas, #050d11);
    scrollbar-color: #607881 #0d1b21;
  }
  .modal-canvas img {
    display: block;
    width: auto;
    min-width: max(100%, var(--expanded-min-width));
    height: auto;
    margin: 0 auto;
  }
  @media (max-width: 760px) {
    .inline-canvas {
      padding: 12px;
    }
    figcaption {
      display: block;
    }
    figcaption span {
      display: block;
      margin-top: 10px;
    }
    dialog {
      padding: 0;
    }
    .modal-panel {
      border: 0;
      border-radius: 0;
    }
    .modal-panel > header {
      padding: 14px;
    }
    header p {
      display: none;
    }
    .modal-canvas {
      padding: 14px;
    }
  }
</style>
