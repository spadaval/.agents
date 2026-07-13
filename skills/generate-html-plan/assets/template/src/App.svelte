<script lang="ts">
  import { onMount } from "svelte";
  import type { Impact } from "./lib/plan-model";
  import { plan } from "./plan/plan";

  type SectionId =
    | "overview"
    | "decisions"
    | "execution"
    | "scenarios"
    | "risks"
    | "documentation";

  const sections: Array<{ id: SectionId; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "decisions", label: "Decisions", count: plan.decisions.length },
    { id: "execution", label: "Execution", count: plan.phases.length },
    { id: "scenarios", label: "Scenarios", count: plan.scenarios.length },
    { id: "risks", label: "Risks", count: plan.risks.length },
    {
      id: "documentation",
      label: "Docs & deferred",
      count: plan.documentation.length + plan.deferred.length,
    },
  ];
  const reviewKeys = [
    ...plan.decisions.map((item) => `decision:${item.id}`),
    ...plan.phases.map((item) => `phase:${item.id}`),
  ];

  let active: SectionId = "overview";
  let railOpen = true;
  let query = "";
  let impact: "all" | Impact = "all";
  let reviewed = new Set<string>();

  const reviewStorageKey = `${window.location.pathname}:html-plan:reviewed`;

  $: normalizedQuery = query.trim().toLowerCase();
  $: decisions = plan.decisions.filter((decision) => {
    const impactMatches = impact === "all" || decision.impact === impact;
    const queryMatches =
      !normalizedQuery ||
      [
        decision.title,
        decision.question,
        decision.choice,
        decision.rationale,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return impactMatches && queryMatches;
  });
  $: risks = plan.risks.filter(
    (risk) =>
      !normalizedQuery ||
      [risk.title, risk.description, risk.mitigation, risk.trigger].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
  );
  $: progress = reviewKeys.length
    ? Math.round(
        (reviewKeys.filter((key) => reviewed.has(key)).length / reviewKeys.length) *
          100,
      )
    : 100;

  onMount(() => {
    try {
      reviewed = new Set(
        JSON.parse(localStorage.getItem(reviewStorageKey) ?? "[]"),
      );
    } catch {
      reviewed = new Set();
    }
    const closeRailAtNarrowWidth = () => {
      if (window.innerWidth < 780) railOpen = false;
    };
    closeRailAtNarrowWidth();
    window.addEventListener("resize", closeRailAtNarrowWidth);
    return () => window.removeEventListener("resize", closeRailAtNarrowWidth);
  });

  function toggleReviewed(key: string) {
    const next = new Set(reviewed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    reviewed = next;
    localStorage.setItem(reviewStorageKey, JSON.stringify([...next]));
  }

  function navigate(id: SectionId) {
    active = id;
    if (window.innerWidth < 760) railOpen = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const phaseTitle = (id: string) =>
    plan.phases.find((phase) => phase.id === id)?.title ?? id;
  const risk = (id: string) => plan.risks.find((item) => item.id === id);
</script>

<div class:rail-closed={!railOpen} class="shell">
  <aside>
    <button
      class="collapse"
      aria-label={railOpen ? "Collapse navigation" : "Expand navigation"}
      onclick={() => (railOpen = !railOpen)}>{railOpen ? "‹" : "›"}</button
    >
    <div class="brand">
      <span>HTML PLAN</span>
      <strong>{plan.title}</strong>
      <small class:ready={plan.status === "ready"}>{plan.status}</small>
    </div>
    <nav aria-label="Plan sections">
      {#each sections as section, index}
        <button
          class:chosen={active === section.id}
          onclick={() => navigate(section.id)}
        >
          <small>{String(index + 1).padStart(2, "0")}</small>
          <span>{section.label}</span>
          {#if section.count !== undefined}<b>{section.count}</b>{/if}
        </button>
      {/each}
    </nav>
    <div class="review-progress">
      <div><span>Review progress</span><b>{progress}%</b></div>
      <progress max="100" value={progress}>{progress}%</progress>
      <small>Decisions and phases are saved in this browser.</small>
    </div>
  </aside>

  <main>
    <button class="mobile-menu" onclick={() => (railOpen = !railOpen)}>☰</button>
    <header>
      <p class="eyebrow">{plan.repository} · {plan.status} plan</p>
      <h1>{plan.title}</h1>
      <p class="subtitle">{plan.subtitle}</p>
      <div class="header-metrics">
        <span><b>{plan.decisions.length}</b> decisions</span>
        <span><b>{plan.phases.length}</b> phases</span>
        <span><b>{plan.risks.length}</b> risks</span>
        <span><b>{plan.deferred.length}</b> deferred</span>
      </div>
    </header>

    {#if active === "overview"}
      <section class="hero-grid">
        <article class="objective">
          <p class="eyebrow">OBJECTIVE</p>
          <h2>{plan.objective}</h2>
        </article>
        <article class="outcome">
          <p class="eyebrow">TARGET OUTCOME</p>
          <p>{plan.outcome}</p>
        </article>
      </section>

      <section class="triptych">
        <article>
          <p class="eyebrow">IN SCOPE</p>
          <ul>{#each plan.scope as item}<li>{item}</li>{/each}</ul>
        </article>
        <article>
          <p class="eyebrow">NON-GOALS</p>
          <ul>{#each plan.nonGoals as item}<li>{item}</li>{/each}</ul>
        </article>
        <article>
          <p class="eyebrow">CONSTRAINTS</p>
          <ul>{#each plan.constraints as item}<li>{item}</li>{/each}</ul>
        </article>
      </section>

      <section>
        <div class="section-heading">
          <div><p class="eyebrow">SYSTEM SHAPE</p><h2>Change architecture</h2></div>
          <p>{plan.architecture.summary}</p>
        </div>
        <div class="architecture">
          <div class="nodes">
            {#each plan.architecture.nodes as node}
              <article class:change={node.kind === "change"} class:external={node.kind === "external"}>
                <span>{node.kind}</span><h3>{node.title}</h3><p>{node.description}</p>
              </article>
            {/each}
          </div>
          {#if plan.architecture.edges.length}
            <div class="edges">
              {#each plan.architecture.edges as edge}
                <span><b>{edge.from}</b><i>→</i><b>{edge.to}</b>{#if edge.label}<em>{edge.label}</em>{/if}</span>
              {/each}
            </div>
          {/if}
        </div>
      </section>

      <section class="overview-bottom">
        <article>
          <p class="eyebrow">SUCCESS SIGNALS</p>
          <ol>{#each plan.successSignals as item}<li>{item}</li>{/each}</ol>
        </article>
        <article>
          <p class="eyebrow">EXPLICIT ASSUMPTIONS</p>
          {#if plan.assumptions.length}<ul>{#each plan.assumptions as item}<li>{item}</li>{/each}</ul>{:else}<p class="empty">No assumptions recorded.</p>{/if}
        </article>
      </section>
    {:else if active === "decisions"}
      <section>
        <div class="section-heading">
          <div><p class="eyebrow">RESOLVED DESIGN</p><h2>Decision ledger</h2></div>
          <p>Choices are separated from their alternatives so tradeoffs remain visible during implementation.</p>
        </div>
        <div class="filters">
          <input bind:value={query} aria-label="Filter decisions" placeholder="Filter decisions" />
          <div class="segmented" aria-label="Filter by impact">
            {#each ["all", "S", "M", "L", "XL"] as value}
              <button class:chosen={impact === value} onclick={() => (impact = value as typeof impact)}>{value}</button>
            {/each}
          </div>
        </div>
        <div class="decision-list">
          {#each decisions as decision}
            {@const key = `decision:${decision.id}`}
            <article class:reviewed={reviewed.has(key)} class="decision-card">
              <div class="card-topline">
                <span class="impact impact-{decision.impact.toLowerCase()}">{decision.impact} impact</span>
                <span class="confidence">{decision.confidence} confidence</span>
                <label><input type="checkbox" checked={reviewed.has(key)} onchange={() => toggleReviewed(key)} /> reviewed</label>
              </div>
              <p class="question">{decision.question}</p>
              <h3>{decision.title}</h3>
              <p class="choice">{decision.choice}</p>
              <p>{decision.rationale}</p>
              <details>
                <summary>Alternatives considered <b>{decision.alternatives.length}</b></summary>
                {#each decision.alternatives as alternative}
                  <div class="alternative"><strong>{alternative.label}</strong><p>{alternative.tradeoff}</p><small>Not chosen: {alternative.rejectedBecause}</small></div>
                {/each}
              </details>
              {#if decision.sources?.length}
                <div class="sources">
                  {#each decision.sources as source}
                    <span><b>{source.label}</b><code>{source.path}</code>{#if source.detail}<small>{source.detail}</small>{/if}</span>
                  {/each}
                </div>
              {/if}
            </article>
          {:else}
            <p class="empty">No decisions match these filters.</p>
          {/each}
        </div>
      </section>
    {:else if active === "execution"}
      <section>
        <div class="section-heading">
          <div><p class="eyebrow">DEPENDENCY ORDER</p><h2>Execution phases</h2></div>
          <p>Each phase ends in an observable, verifiable state—not merely a list of files to edit.</p>
        </div>
        <div class="timeline">
          {#each plan.phases as phase, index}
            {@const key = `phase:${phase.id}`}
            <article class:reviewed={reviewed.has(key)} class="phase-card">
              <div class="phase-index">{String(index + 1).padStart(2, "0")}</div>
              <div class="phase-body">
                <div class="card-topline">
                  <span>{phase.dependsOn.length ? `after ${phase.dependsOn.map(phaseTitle).join(", ")}` : "starting phase"}</span>
                  <label><input type="checkbox" checked={reviewed.has(key)} onchange={() => toggleReviewed(key)} /> reviewed</label>
                </div>
                <h3>{phase.title}</h3>
                <p class="phase-outcome">{phase.outcome}</p>
                <p>{phase.description}</p>
                <div class="changes">
                  {#each phase.changes as change}
                    <div><strong>{change.title}</strong><p>{change.detail}</p>{#if change.paths?.length}<div class="path-list">{#each change.paths as path}<code>{path}</code>{/each}</div>{/if}</div>
                  {/each}
                </div>
                <div class="phase-footer">
                  <details><summary>Verification <b>{phase.verification.length}</b></summary><ul>{#each phase.verification as item}<li>{item}</li>{/each}</ul></details>
                  <details><summary>Complete when <b>{phase.completeWhen.length}</b></summary><ul>{#each phase.completeWhen as item}<li>{item}</li>{/each}</ul></details>
                </div>
                {#if phase.riskIds?.length}<div class="risk-links">Risks: {#each phase.riskIds as id}<button onclick={() => navigate("risks")}>{risk(id)?.title ?? id}</button>{/each}</div>{/if}
              </div>
            </article>
          {/each}
        </div>
      </section>
    {:else if active === "scenarios"}
      <section>
        <div class="section-heading">
          <div><p class="eyebrow">BEHAVIOR CHECK</p><h2>Concrete scenarios</h2></div>
          <p>Scenarios pin the plan to observable behavior across primary, edge, and failure paths.</p>
        </div>
        <div class="scenario-grid">
          {#each plan.scenarios as scenario}
            <article class="scenario {scenario.kind}">
              <span>{scenario.kind}</span><h3>{scenario.title}</h3>
              <dl><dt>Given</dt><dd>{scenario.given}</dd><dt>When</dt><dd>{scenario.when}</dd><dt>Then</dt><dd>{scenario.then}</dd></dl>
            </article>
          {/each}
        </div>
      </section>
    {:else if active === "risks"}
      <section>
        <div class="section-heading">
          <div><p class="eyebrow">PRE-MORTEM</p><h2>Risks and controls</h2></div>
          <p>Triggers make risks actionable: if the signal appears, apply the mitigation or revisit the decision.</p>
        </div>
        <div class="filters"><input bind:value={query} aria-label="Filter risks" placeholder="Filter risks" /></div>
        <div class="risk-grid">
          {#each risks as item}
            <article class="risk-card likelihood-{item.likelihood}">
              <div class="card-topline"><span>{item.likelihood} likelihood</span><span>{item.impact} impact</span></div>
              <h3>{item.title}</h3><p>{item.description}</p>
              <div><small>MITIGATION</small><p>{item.mitigation}</p></div>
              <div><small>TRIGGER</small><p>{item.trigger}</p></div>
            </article>
          {:else}<p class="empty">No risks match this filter.</p>{/each}
        </div>
      </section>
    {:else}
      <section>
        <div class="section-heading">
          <div><p class="eyebrow">KNOWLEDGE TRAIL</p><h2>Documentation and deferred work</h2></div>
          <p>Resolved knowledge is recorded near the system; intentionally delayed choices retain an owner and a revisit condition.</p>
        </div>
        <div class="docs-grid">
          <div>
            <h3>Documentation changes</h3>
            {#each plan.documentation as doc}
              <article class="doc-card"><span>{doc.action} · {doc.kind}</span><code>{doc.path}</code><p>{doc.summary}</p></article>
            {:else}<p class="empty">No documentation changes.</p>{/each}
          </div>
          <div>
            <h3>Intentionally deferred</h3>
            {#each plan.deferred as item}
              <article class="deferred-card"><h4>{item.title}</h4><p>{item.reason}</p><dl><dt>Owner</dt><dd>{item.owner}</dd><dt>Resolve when</dt><dd>{item.resolveWhen}</dd></dl></article>
            {:else}<p class="empty">Nothing intentionally deferred.</p>{/each}
          </div>
        </div>
      </section>
    {/if}
  </main>
</div>
