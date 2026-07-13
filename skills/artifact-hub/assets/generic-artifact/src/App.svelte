<script lang="ts">
  interface Manifest {
    title: string;
    description?: string;
  }

  let manifest = $state<Manifest>({ title: "Artifact" });
  let error = $state<string>();

  fetch(new URL("./manifest.json", window.location.href))
    .then((response) => {
      if (!response.ok)
        throw new Error(`Manifest request failed (${response.status})`);
      return response.json();
    })
    .then((value: Manifest) => {
      manifest = value;
    })
    .catch((cause: unknown) => {
      error = cause instanceof Error ? cause.message : String(cause);
    });
</script>

<svelte:head><title>{manifest.title}</title></svelte:head>

<main>
  <a class="back" href="/">← Artifact Hub</a>
  <p class="eyebrow">Custom visualizer</p>
  <h1>{manifest.title}</h1>
  {#if manifest.description}<p class="description">
      {manifest.description}
    </p>{/if}
  {#if error}<p class="error">{error}</p>{/if}
  <section>
    <h2>Start here</h2>
    <p>
      Edit <code>src/App.svelte</code>. This application owns all of its pages
      and components while sharing the Hub runtime.
    </p>
  </section>
</main>
