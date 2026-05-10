import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-revalidate-secret");

  if (
    !process.env.REVALIDATE_SECRET ||
    secret !== process.env.REVALIDATE_SECRET
  ) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, {
      status: 401,
    });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (path) {
    revalidatePath(path);
  } else {
    revalidatePath("/", "layout");
  }
  return NextResponse.json({ ok: true, path: path ?? "*", revalidatedAt: Date.now() });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
