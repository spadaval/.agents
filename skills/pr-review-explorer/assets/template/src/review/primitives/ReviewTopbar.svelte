<script lang="ts">
  let {
    repository,
    pr,
  }: {
    repository?: string;
    pr: {
      number: number;
      title: string;
      url: string;
      baseRefName: string;
      headRefName: string;
      additions: number;
      deletions: number;
      changedFiles: number;
      comments?: number;
      reviewComments?: number;
      createdAt?: string;
      updatedAt?: string;
      author?: { login: string; name?: string };
      state?: string;
      isDraft?: boolean;
    };
  } = $props();

  const project = $derived(repository?.split("/").filter(Boolean).at(-1) ?? "Repository");
  const projectPath = $derived(repository?.replace(/^https?:\/\/[^/]+\/?/, "") ?? "");
  const host = $derived.by(() => {
    try {
      return new URL(pr.url).host;
    } catch {
      return "GitHub";
    }
  });
  const comments = $derived((pr.comments ?? 0) + (pr.reviewComments ?? 0));
  const relativeTime = (value: string | undefined, label: string) => {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    if (Number.isNaN(timestamp)) return `${label} unknown`;
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${label} now`;
    if (seconds < 3600) return `${label} ${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86_400) return `${label} ${Math.floor(seconds / 3600)}h ago`;
    return `${label} ${Math.floor(seconds / 86_400)}d ago`;
  };
</script>

<header class="topbar">
  <a
    class="avatar"
    href={pr.url}
    target="_blank"
    rel="noreferrer"
    aria-label="Open GitHub pull request"
  >{(pr.author?.login ?? project).slice(0, 1).toUpperCase()}</a>
  <div class="details">
    <div class="identity">
      <span class="project" title={`${host} / ${projectPath}`}>{projectPath || project}</span>
      <span class="arrow">→</span>
      <span class="branch">{pr.headRefName} <b>→</b> {pr.baseRefName}</span>
      <span class:open={pr.state === "OPEN" && !pr.isDraft} class="state"
        >{pr.isDraft ? "DRAFT" : pr.state || "PR"}</span
      >
      <a class="open-pr" href={pr.url} target="_blank" rel="noreferrer">GitHub ↗</a>
    </div>
    <div class="metadata">
      <strong>#{pr.number}</strong>
      <span class="title">{pr.title}</span>
      {#if pr.author?.login}<span>@{pr.author.login}</span>{/if}
      <span>{pr.changedFiles} files</span>
      <span class="add">+{pr.additions}</span><span class="del">−{pr.deletions}</span>
      <span>{comments} comments</span>
      <span title={pr.createdAt}>{relativeTime(pr.createdAt, "opened")}</span>
      <span title={pr.updatedAt}>{relativeTime(pr.updatedAt, "updated")}</span>
    </div>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 10;
    display: flex;
    gap: 10px;
    align-items: center;
    min-height: var(--topbar-height);
    padding: 8px 20px;
    color: #e6ebe4;
    background: #0b0e0c;
    border-bottom: 1px solid #29322b;
    box-shadow: 0 3px 16px #0004;
  }
  .avatar {
    display: grid;
    flex: 0 0 auto;
    width: 31px;
    height: 31px;
    color: #f4fff5;
    font: 700 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
    text-decoration: none;
    place-items: center;
    background: #13885a;
    border-radius: 999px;
  }
  .details { min-width: 0; }
  .identity, .metadata {
    display: flex;
    min-width: 0;
    align-items: center;
    white-space: nowrap;
  }
  .identity { gap: 7px; }
  .project, .branch {
    overflow: hidden;
    color: #d9e2da;
    font: 600 11px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
    text-overflow: ellipsis;
  }
  .project { max-width: min(28vw, 340px); padding: 4px 6px; background: #202720; border-radius: 3px; }
  .branch { max-width: min(29vw, 390px); padding: 4px 6px; color: #cad2cb; background: #202720; border-radius: 3px; }
  .arrow { color: #859286; font-size: 14px; }
  .branch b { color: #8d9d90; }
  .state { padding: 3px 5px; color: #dfba65; font: 700 10px/1 ui-monospace, monospace; letter-spacing: .04em; background: #332c1b; border-radius: 2px; }
  .state.open { color: #71d39a; }
  .open-pr { color: #b7d9ed; font: 600 10px Inter, ui-sans-serif, system-ui, sans-serif; text-decoration: none; }
  .open-pr:hover { color: #eff7f0; text-decoration: underline; }
  .metadata { gap: 6px; margin-top: 4px; overflow: hidden; color: #9eaa9f; font: 10px/1.2 ui-monospace, monospace; }
  .metadata span + span::before { margin-right: 6px; color: #596559; content: "·"; }
  .metadata strong { flex: 0 0 auto; color: #8bb8d6; font: 700 12px/1.2 ui-monospace, monospace; }
  .metadata .title { overflow: hidden; flex: 0 1 auto; color: #edf3ed; font: 600 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; text-overflow: ellipsis; }
  .metadata .add { color: #71d39a; }
  .metadata .del { color: #ff9a92; margin-left: -6px; }
  @media (max-width: 980px) {
    .metadata span:nth-last-child(-n + 4) { display: none; }
  }
  @media (max-width: 760px) {
    .topbar { min-height: 60px; padding: 7px 12px; }
    .project, .arrow, .branch { display: none; }
    .metadata span:nth-last-child(-n + 4) { display: none; }
  }
</style>
