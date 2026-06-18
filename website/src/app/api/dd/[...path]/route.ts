import { NextResponse, type NextRequest } from "next/server";
import { DD_COOKIE, isUnlocked } from "@/lib/data-drops/gate";

/**
 * Same-origin proxy for the Data Drops AWS API.
 *
 * The browser calls `/api/dd/<path>` (same origin), and this handler forwards
 * the request server-side to the AWS backend. This removes CORS entirely (works
 * in production, on preview deploys, and on localhost) and keeps the AWS origin
 * off the client. The `dd_auth` cookie is required as defense-in-depth.
 */

const API_BASE = (
  process.env.DATA_DROPS_API_URL ?? "https://app-mckeesecurity.ca/api"
).replace(/\/+$/, "");

async function forward(request: NextRequest, path: string[]): Promise<Response> {
  if (!isUnlocked(request.cookies.get(DD_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = `${API_BASE}/${path.join("/")}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: { "Content-Type": "application/json" },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Upstream request failed." },
      { status: 502 },
    );
  }

  // Pass the upstream body and status straight through.
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

type Context = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
