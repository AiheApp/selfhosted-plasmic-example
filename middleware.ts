import { NextRequest, NextResponse } from "next/server";

const APEX_HOSTS = new Set(
  (process.env.PLASMIC_APEX_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

function extractSlug(host: string): string | null {
  const h = host.split(":")[0].toLowerCase();
  if (APEX_HOSTS.has(h)) return null;
  if (h === "localhost" || h === "127.0.0.1") {
    return process.env.PLASMIC_DEV_SLUG || null;
  }
  const parts = h.split(".");
  if (parts.length < 3) return null;
  return parts[0] || null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const slug = extractSlug(host);
  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set("x-plasmic-slug", slug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
