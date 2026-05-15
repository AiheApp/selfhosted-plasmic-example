import { setProject } from "@/lib/projects-store";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/i;

function readParam(req: NextRequest, key: string): string | null {
  return req.nextUrl.searchParams.get(key);
}

async function handle(req: NextRequest) {
  const secret =
    readParam(req, "secret") ?? req.headers.get("x-revalidate-secret");
  if (
    !process.env.REVALIDATE_SECRET ||
    secret !== process.env.REVALIDATE_SECRET
  ) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const slug = readParam(req, "slug");
  const id = readParam(req, "id");
  const token = readParam(req, "token");

  if (!slug || !id || !token) {
    return NextResponse.json(
      { ok: false, error: "missing required params: slug, id, token" },
      { status: 400 }
    );
  }

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      {
        ok: false,
        error: "slug must be alphanumeric with optional hyphens (1-63 chars)",
      },
      { status: 400 }
    );
  }

  try {
    setProject(slug, { id, token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({
    ok: true,
    slug,
    registeredAt: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
