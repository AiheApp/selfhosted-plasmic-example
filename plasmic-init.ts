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

export function getPlasmicLoader(slug: string): PlasmicLoader | null {
  const projects = readServerProjects();
  const cfg = projects[slug];

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
    preview: process.env.PLASMIC_PREVIEW === "true",
  });
  loaderCache.set(slug, { cfg: resolvedCfg, loader });
  return loader;
}

export function listProjectSlugs(): string[] {
  return Object.keys(readServerProjects());
}
