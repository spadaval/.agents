<script lang="ts">
  import { onMount } from 'svelte';
  import PlatformPage from './platform/PlatformPage.svelte';
  import ReportLanding from './report/ReportLanding.svelte';
  import { loadEvidence } from './platform/evidence';
  import type { EvidencePack } from './platform/types';
  import { customRoutes } from './report/routes';

  type BuiltInRoute = 'report' | 'overview' | 'timeline' | 'failures' | 'delegation' | 'tools' | 'validation' | 'evidence';
  type PlatformRoute = Exclude<BuiltInRoute, 'report'>;
  const nav: Array<[BuiltInRoute, string]> = [
    ['report', 'Report'], ['overview', 'Overview'], ['timeline', 'Timeline'], ['failures', 'Failures'],
    ['delegation', 'Delegation'], ['tools', 'Tools'], ['validation', 'Validation & changes'], ['evidence', 'Evidence']
  ];
  let pack = $state<EvidencePack | null>(null);
  let error = $state('');
  let route = $state('overview');
  let evidenceId = $state('');

  function setRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    route = parts[0] || 'overview';
    evidenceId = route === 'evidence' ? decodeURIComponent(parts.slice(1).join('/')) : '';
  }
  onMount(() => {
    setRoute(); window.addEventListener('hashchange', setRoute);
    loadEvidence().then((value) => { pack = value; }).catch((cause: unknown) => { error = cause instanceof Error ? cause.message : 'Could not load evidence.'; });
    return () => window.removeEventListener('hashchange', setRoute);
  });
  const custom = $derived(customRoutes.find((item) => item.slug === route));
  const CustomComponent = $derived(custom?.component);
  const builtIn = $derived<PlatformRoute>(route === 'report' ? 'overview' : (nav.some(([slug]) => slug === route) ? route as PlatformRoute : 'overview'));
</script>

<header>
  <p class="eyebrow">Codex Reflect · human-facing evidence viewer</p>
  <h1>{pack ? `Mission ${pack.rootSessionId}` : 'Codex Reflect'}</h1>
  <p>Generated evidence is read-only. Editorial conclusions belong in the report route.</p>
</header>
<nav aria-label="Report navigation">
  {#each nav as [slug, label]}<a class:active={route === slug} href={`#/${slug}`}>{label}</a>{/each}
  {#each customRoutes as item}<a class:active={route === item.slug} href={`#/${item.slug}`}>{item.label}</a>{/each}
</nav>

{#if error}<main><p class="error">{error}</p></main>
{:else if !pack}<main><p>Loading report evidence…</p></main>
{:else if route === 'report'}<ReportLanding {pack} />
{:else if CustomComponent}<CustomComponent {pack} />
{:else}<PlatformPage {pack} kind={builtIn} {evidenceId} />{/if}
