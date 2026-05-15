import fs from "fs";
import path from "path";

export type ProjectCfg = { id: string; token: string };
type ProjectsMap = Record<string, ProjectCfg>;

const PROJECTS_FILE = process.env.PROJECTS_FILE || "/data/projects.json";

let cache: ProjectsMap = {};
let cacheMtimeMs = -1;
let loadedOnce = false;

function readFromEnv(): ProjectsMap {
  const raw = process.env.PLASMIC_PROJECTS;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Invalid PLASMIC_PROJECTS JSON:", e);
    return {};
  }
}

function readFromFile(): { map: ProjectsMap; mtimeMs: number } | null {
  try {
    const stat = fs.statSync(PROJECTS_FILE);
    if (loadedOnce && stat.mtimeMs === cacheMtimeMs) {
      return { map: cache, mtimeMs: stat.mtimeMs };
    }
    const raw = fs.readFileSync(PROJECTS_FILE, "utf8");
    const map = JSON.parse(raw) as ProjectsMap;
    return { map, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

export function getProjects(): ProjectsMap {
  const fileRead = readFromFile();
  if (fileRead) {
    cache = fileRead.map;
    cacheMtimeMs = fileRead.mtimeMs;
    loadedOnce = true;
    return cache;
  }
  // First time and no file → seed from env, but don't write yet.
  if (!loadedOnce) {
    cache = readFromEnv();
    loadedOnce = true;
  }
  return cache;
}

export function setProject(slug: string, cfg: ProjectCfg): ProjectsMap {
  const current = getProjects();
  const next = { ...current, [slug]: cfg };
  writeAtomic(next);
  cache = next;
  return next;
}

export function deleteProject(slug: string): ProjectsMap {
  const current = getProjects();
  if (!(slug in current)) return current;
  const next = { ...current };
  delete next[slug];
  writeAtomic(next);
  cache = next;
  return next;
}

function writeAtomic(map: ProjectsMap) {
  const dir = path.dirname(PROJECTS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${PROJECTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2));
  fs.renameSync(tmp, PROJECTS_FILE);
  const stat = fs.statSync(PROJECTS_FILE);
  cacheMtimeMs = stat.mtimeMs;
}

export function projectsFilePath(): string {
  return PROJECTS_FILE;
}
