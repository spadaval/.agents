import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { ARTIFACT_ID_PATTERN, validateEntry } from "./manifest";

type RouteMatch = { id: string; relativePath: string };

export function matchArtifactRoute(pathname: string): RouteMatch | undefined {
  const match = pathname.match(/^\/artifacts\/([^/]+)(?:\/(.*))?$/);
  if (!match) return undefined;
  let id: string;
  let relativePath: string;
  try {
    id = decodeURIComponent(match[1]);
    relativePath = (match[2] ?? "")
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return undefined;
  }
  if (!ARTIFACT_ID_PATTERN.test(id)) return undefined;
  return { id, relativePath };
}

export function injectArtifactBase(html: string, id: string): string {
  const href = `/artifacts/${encodeURIComponent(id)}/`;
  if (/<base\s/i.test(html)) return html;
  return html.replace(
    /<head(\s[^>]*)?>/i,
    (head) => `${head}<base href="${href}">`,
  );
}

const artifactNavigationScript =
  '<script type="module" src="/src/artifact-hub/artifact-navigation.ts"></script>';

export function injectArtifactNavigation(html: string): string {
  if (html.includes(artifactNavigationScript)) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${artifactNavigationScript}</body>`);
  }
  return `${html}${artifactNavigationScript}`;
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export function artifactRoutes(artifactRoot: string): Plugin {
  const resolvedRoot = path.resolve(artifactRoot);
  return {
    name: "artifact-hub-clean-routes",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD")
          return next();
        if (!request.headers.accept?.includes("text/html")) return next();
        const url = new URL(request.url ?? "/", "http://artifact-hub.local");
        const route = matchArtifactRoute(url.pathname);
        if (!route) return next();

        const artifactDirectory = path.resolve(resolvedRoot, route.id);
        if (path.dirname(artifactDirectory) !== resolvedRoot) return next();
        const requestedPath = path.resolve(
          artifactDirectory,
          route.relativePath,
        );
        if (
          route.relativePath &&
          requestedPath.startsWith(`${artifactDirectory}${path.sep}`) &&
          (await isFile(requestedPath))
        ) {
          return next();
        }

        try {
          const manifest = JSON.parse(
            await fs.readFile(
              path.join(artifactDirectory, "manifest.json"),
              "utf8",
            ),
          ) as { entry?: unknown };
          if (typeof manifest.entry !== "string") return next();
          if (validateEntry(manifest.entry)) return next();
          const entryPath = path.resolve(artifactDirectory, manifest.entry);
          if (!entryPath.startsWith(`${artifactDirectory}${path.sep}`))
            return next();
          const source = await fs.readFile(entryPath, "utf8");
          const html = await server.transformIndexHtml(
            url.pathname,
            injectArtifactNavigation(injectArtifactBase(source, route.id)),
          );
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          if (request.method === "HEAD") return response.end();
          response.end(html);
        } catch {
          next();
        }
      });
    },
  };
}
