import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import * as NextNavigation from "next/navigation";

type ProjectCfg = { id: string; token: string };
type PlasmicLoader = ReturnType<typeof initPlasmicLoader>;
type CachedLoader = { cfg: ProjectCfg; loader: PlasmicLoader };

const host = process.env.PLASMIC_HOST;
const loaderCache = new Map<string, CachedLoader>();

function readServerProjects(): Record<string, ProjectCfg> {
  if (typeof window !== "undefined") return {};
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getProjects } = require("@/lib/projects-store");
  return getProjects();
}

function legacyConfig(): ProjectCfg | null {
  const id = process.env.PLASMIC_PROJECT_ID;
  const token = process.env.PLASMIC_PROJECT_TOKEN;
  return id && token ? { id, token } : null;
}

export function getPlasmicLoader(slug: string): PlasmicLoader | null {
  const projects = readServerProjects();
  const cfg = projects[slug] ?? legacyConfig();

  // On the server, an unknown slug is a 404 signal to callers.
  if (typeof window === "undefined" && !cfg) return null;

  // On the client, env vars aren't visible; build a stub loader. The
  // PlasmicRootProvider hydrates from prefetchedData, so empty config is fine.
  const resolvedCfg = cfg ?? { id: "", token: "" };

  const cached = loaderCache.get(slug);
  if (
    cached &&
    cached.cfg.id === resolvedCfg.id &&
    cached.cfg.token === resolvedCfg.token
  ) {
    return cached.loader;
  }

  const loader = initPlasmicLoader({
    nextNavigation: NextNavigation,
    projects: [resolvedCfg],
    host,
    preview: process.env.PLASMIC_PREVIEW !== "false",
  });
  loaderCache.set(slug, { cfg: resolvedCfg, loader });
  return loader;
}

export function listProjectSlugs(): string[] {
  return Object.keys(readServerProjects());
}
