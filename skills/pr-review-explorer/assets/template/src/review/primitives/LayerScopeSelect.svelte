<script lang="ts">
  export type LayerScopeOption = {
    id: string;
    title: string;
    summary: string;
    files: number;
    lines: number;
    layerNumber?: number;
  };

  let {
    options,
    selectedId,
    onSelect,
  }: {
    options: LayerScopeOption[];
    selectedId: string;
    onSelect: (id: string) => void;
  } = $props();

  let root = $state<HTMLDivElement>();
  let open = $state(false);
  const selected = $derived(
    options.find((option) => option.id === selectedId) ?? options[0],
  );

  const choose = (id: string) => {
    open = false;
    onSelect(id);
  };
  const dismiss = (event: MouseEvent) => {
    if (open && root && event.target instanceof Node && !root.contains(event.target))
      open = false;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") open = false;
  };
</script>

<svelte:window onclick={dismiss} onkeydown={keydown} />

<div class="scope-select" bind:this={root}>
  <button
    class="trigger"
    type="button"
    aria-expanded={open}
    aria-haspopup="dialog"
    onclick={() => (open = !open)}
  >
    <span class="trigger-copy">
      <small>{selected?.layerNumber ? `Layer ${String(selected.layerNumber).padStart(2, "0")}` : "All changes"}</small>
      <strong>{selected?.title}</strong>
      <em>{selected?.files} files · {selected?.lines.toLocaleString()} lines</em>
    </span>
    <b aria-hidden="true">⌄</b>
  </button>
  {#if open}
    <div class="options" role="dialog" aria-label="Choose file scope">
      {#each options as option}
        <button
          type="button"
          class:chosen={option.id === selectedId}
          onclick={() => choose(option.id)}
        >
          <small>{option.layerNumber ? `Layer ${String(option.layerNumber).padStart(2, "0")}` : "All changes"}</small>
          <strong>{option.title}</strong>
          <span>{option.summary}</span>
          <em>{option.files} files · {option.lines.toLocaleString()} lines</em>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .scope-select { position: relative; }
  small { display: block; color: #90a092; font: 700 9px/1.4 ui-monospace, monospace; letter-spacing: 0.12em; text-transform: uppercase; }
  .trigger { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; width: 100%; padding: 8px; color: #dce4dc; text-align: left; cursor: pointer; background: #121713; border: 1px solid #344038; border-radius: 3px; }
  .trigger:hover, .trigger[aria-expanded="true"] { background: #171f19; border-color: #58705d; }
  .trigger-copy { display: grid; gap: 1px; min-width: 0; }
  strong { overflow: hidden; font: 600 12px/1.25 Inter, ui-sans-serif, system-ui, sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  em { color: #a4afa5; font: 10px ui-monospace, monospace; font-style: normal; }
  .trigger > b { align-self: center; color: #8bb8d6; font-size: 16px; }
  .options { position: absolute; z-index: 20; top: calc(100% + 6px); right: 0; left: 0; display: grid; gap: 3px; max-height: min(560px, calc(100vh - 170px)); padding: 6px; overflow: auto; background: #121713; border: 1px solid #405044; border-radius: 4px; box-shadow: 0 12px 30px #000a; }
  .options button { display: grid; gap: 3px; padding: 9px; color: #dce4dc; text-align: left; cursor: pointer; background: transparent; border: 0; border-radius: 3px; }
  .options button:hover, .options button.chosen { background: #202a22; box-shadow: inset 2px 0 #71d39a; }
  .options button > span { color: #c0c9c1; font-size: 11px; line-height: 1.35; }
</style>
