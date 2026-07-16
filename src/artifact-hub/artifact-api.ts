import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  type InvalidArtifact,
  type ParsedArtifact,
  parseArtifactManifest,
  validateArtifactId,
} from "./manifest";

export type ArtifactModuleRegistry = {
  artifactId: string;
  modules: {
    layers: string[];
    stories: string[];
    findings: string[];
  };
};

const moduleDirectories = {
  layers: { directory: "layers", extension: ".svelte" },
  stories: { directory: "stories", extension: ".svelte" },
  findings: { directory: "findings", extension: ".ts" },
} as const;

const artifactManifestPath = (id: string) =>
  `/artifacts/${id}/manifest.json`;

const invalidArtifact = (id: string, error: unknown): InvalidArtifact => ({
  valid: false,
  manifestPath: artifactManifestPath(id),
  directoryName: id,
  error: error instanceof Error ? error.message : String(error),
});

export async function scanArtifactCatalog(
  artifactRoot: string,
): Promise<ParsedArtifact[]> {
  const entries = await fs.readdir(artifactRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    directories.map(async (id) => {
      const manifestPath = artifactManifestPath(id);
      try {
        const raw = await fs.readFile(
          path.join(artifactRoot, id, "manifest.json"),
          "utf8",
        );
        return parseArtifactManifest(raw, manifestPath);
      } catch (error) {
        return invalidArtifact(id, error);
      }
    }),
  );
}

const encodeModuleUrl = (
  artifactId: string,
  directory: string,
  filename: string,
) =>
  `/artifacts/${encodeURIComponent(artifactId)}/src/review/${encodeURIComponent(directory)}/${encodeURIComponent(filename)}`;

async function scanModuleDirectory(
  artifactDirectory: string,
  artifactId: string,
  directory: string,
  extension: string,
): Promise<string[]> {
  const moduleDirectory = path.join(
    artifactDirectory,
    "src",
    "review",
    directory,
  );
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(moduleDirectory, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.isSymbolicLink() &&
        entry.name.endsWith(extension),
    )
    .map((entry) => encodeModuleUrl(artifactId, directory, entry.name))
    .sort();
}

export async function scanArtifactModules(
  artifactRoot: string,
  artifactId: string,
): Promise<ArtifactModuleRegistry> {
  const idError = validateArtifactId(artifactId);
  if (idError) throw new Error(idError);
  const resolvedRoot = path.resolve(artifactRoot);
  const artifactDirectory = path.resolve(resolvedRoot, artifactId);
  if (path.dirname(artifactDirectory) !== resolvedRoot) {
    throw new Error("artifact path must stay within the artifact root");
  }
  const manifest = await fs.stat(path.join(artifactDirectory, "manifest.json"));
  if (!manifest.isFile()) throw new Error("artifact manifest is not a file");

  const [layers, stories, findings] = await Promise.all(
    Object.values(moduleDirectories).map(({ directory, extension }) =>
      scanModuleDirectory(
        artifactDirectory,
        artifactId,
        directory,
        extension,
      ),
    ),
  );
  return { artifactId, modules: { layers, stories, findings } };
}

const sendJson = (
  requestMethod: string | undefined,
  response: import("node:http").ServerResponse,
  status: number,
  payload: unknown,
) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (requestMethod === "HEAD") return response.end();
  response.end(JSON.stringify(payload));
};

export function artifactApi(artifactRoot: string): Plugin {
  const resolvedRoot = path.resolve(artifactRoot);
  return {
    name: "artifact-hub-runtime-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const pathname = new URL(
          request.url ?? "/",
          "http://artifact-hub.local",
        ).pathname;
        try {
          if (pathname === "/api/artifacts" || pathname === "/api/artifacts/") {
            const artifacts = await scanArtifactCatalog(resolvedRoot);
            return sendJson(request.method, response, 200, { artifacts });
          }
          const match = pathname.match(/^\/api\/artifacts\/([^/]+)\/modules\/?$/);
          if (!match) return next();
          let artifactId: string;
          try {
            artifactId = decodeURIComponent(match[1]);
          } catch {
            return sendJson(request.method, response, 400, {
              error: "artifact id is not valid URL encoding",
            });
          }
          const registry = await scanArtifactModules(resolvedRoot, artifactId);
          return sendJson(request.method, response, 200, registry);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          return sendJson(request.method, response, code === "ENOENT" ? 404 : 400, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    },
  };
}
