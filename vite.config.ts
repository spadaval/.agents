import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prReviewProxy } from "./src/artifact-hub/pr-review-proxy";
import { artifactApi } from "./src/artifact-hub/artifact-api";
import { artifactRoutes } from "./src/artifact-hub/artifact-routes";

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));

const protectedPrefixes = [
  "/.git",
  "/.skill-lock.json",
  "/bin",
  "/docs",
  "/package-lock.json",
  "/package.json",
  "/skills",
  "/tsconfig.json",
  "/vite.config.ts",
  "/vitest.config.ts",
];

function protectRepositoryFiles(): Plugin {
  return {
    name: "artifact-hub-protect-repository-files",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(
          request.url ?? "/",
          "http://artifact-hub.local",
        ).pathname;
        const protectedPath = protectedPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        );
        let protectedFsPath = false;
        if (pathname.startsWith("/@fs/")) {
          const requestedPath = path.resolve(
            "/",
            decodeURIComponent(pathname.slice("/@fs/".length)),
          );
          const allowedRoots = [
            path.join(repositoryRoot, "artifacts"),
            path.join(repositoryRoot, "node_modules"),
            path.join(repositoryRoot, "src/artifact-hub"),
          ];
          protectedFsPath =
            requestedPath.startsWith(`${repositoryRoot}${path.sep}`) &&
            !allowedRoots.some(
              (allowed) =>
                requestedPath === allowed ||
                requestedPath.startsWith(`${allowed}${path.sep}`),
            );
        }
        if (protectedPath || protectedFsPath) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    protectRepositoryFiles(),
    artifactApi(path.join(repositoryRoot, "artifacts")),
    prReviewProxy(path.join(repositoryRoot, "artifacts")),
    artifactRoutes(path.join(repositoryRoot, "artifacts")),
    svelte(),
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["ai-assistant-rtp-dev.cisco.com"],
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      deny: [
        ".env",
        ".env.*",
        "*.pem",
        "*.key",
        "**/.git/**",
        "**/.ssh/**",
        "**/.codex/**",
      ],
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
});
