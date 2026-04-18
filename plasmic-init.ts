import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import * as NextNavigation from "next/navigation";

const projectId = process.env.PLASMIC_PROJECT_ID;
const token = process.env.PLASMIC_PROJECT_TOKEN;
const host = process.env.PLASMIC_HOST;

if (!projectId || !token) {
  throw new Error(
    "Missing PLASMIC_PROJECT_ID or PLASMIC_PROJECT_TOKEN env vars. Set them in Coolify before building."
  );
}

export const PLASMIC = initPlasmicLoader({
  nextNavigation: NextNavigation,
  projects: [{ id: projectId, token }],
  host,
  preview: process.env.PLASMIC_PREVIEW === "true",
});
