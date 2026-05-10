import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import * as NextNavigation from "next/navigation";

type ProjectCfg = { id: string; token: string };
type PlasmicLoader = ReturnType<typeof initPlasmicLoader>;

function readProjectsMap(): Record<string, ProjectCfg> {
  const raw = process.env.PLASMIC_PROJECTS;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (typeof window === "undefined") {
      console.error("Invalid PLASMIC_PROJECTS JSON:", e);
    }
    return {};
  }
}

const PROJECTS = readProjectsMap();
const host = process.env.PLASMIC_HOST;
const loaderCache = new Map<string, PlasmicLoader>();

if (typeof window === "undefined" && Object.keys(PROJECTS).length === 0) {
  console.warn(
    "PLASMIC_PROJECTS is empty — set it to a JSON object mapping subdomain slugs to {id, token}."
  );
}

export function getPlasmicLoader(slug: string): PlasmicLoader | null {
  const cfg = PROJECTS[slug];
  if (!cfg) return null;
  let loader = loaderCache.get(slug);
  if (!loader) {
    loader = initPlasmicLoader({
      nextNavigation: NextNavigation,
      projects: [cfg],
      host,
      preview: process.env.PLASMIC_PREVIEW === "true",
    });
    loaderCache.set(slug, loader);
  }
  return loader;
}

export function listProjectSlugs(): string[] {
  return Object.keys(PROJECTS);
}
