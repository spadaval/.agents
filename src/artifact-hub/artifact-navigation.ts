const navigationMarker = "data-artifact-hub-navigation";

export function mountArtifactHubNavigation(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`[${navigationMarker}]`);
  if (existing) return existing;

  const host = document.createElement("div");
  host.setAttribute(navigationMarker, "");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        position: fixed;
        inset: 12px auto auto 12px;
        z-index: 2147483647;
        font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-sizing: border-box;
        min-height: 32px;
        padding: 8px 10px;
        border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
        border-radius: 999px;
        color: CanvasText;
        background: color-mix(in srgb, Canvas 88%, transparent);
        box-shadow: 0 4px 18px rgb(0 0 0 / 18%);
        text-decoration: none;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      a:hover {
        border-color: color-mix(in srgb, CanvasText 40%, transparent);
        background: Canvas;
      }

      a:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
      }
    </style>
    <a href="/" aria-label="Go to Artifact Hub" title="Go to Artifact Hub">
      <span aria-hidden="true">&#8592;</span>
      <span>Hub</span>
    </a>
  `;
  document.body.append(host);
  return host;
}

if (document.body) {
  mountArtifactHubNavigation();
} else {
  document.addEventListener("DOMContentLoaded", mountArtifactHubNavigation, {
    once: true,
  });
}
