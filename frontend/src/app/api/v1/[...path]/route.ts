import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PRODUCTION_BACKEND = "https://schoolmanagmentsystem-production.up.railway.app";

function normalizeApiTarget(raw?: string) {
  const fallbackTarget =
    process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND : "http://localhost:8000";
  let target = (raw || fallbackTarget).trim();

  if (target.includes("=") && !target.startsWith("http")) {
    target = target.slice(target.indexOf("=") + 1).trim();
  }
  target = target.replace(/^['"]|['"]$/g, "");

  if (target.startsWith("http://") && !target.includes("localhost") && !target.includes("127.0.0.1")) {
    target = `https://${target.slice("http://".length)}`;
  }
  if (target.endsWith("/")) target = target.slice(0, -1);
  if (target.endsWith("/api/v1")) target = target.slice(0, -"/api/v1".length);
  return target;
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "origin",
  "referer",
]);

function forwardedHeaders(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  const authorization = request.headers.get("authorization");
  const accessToken = request.cookies.get("access_token")?.value;

  if (authorization) {
    headers.set("authorization", authorization);
  } else if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }
  headers.set("x-forwarded-host", request.headers.get("host") || "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  return headers;
}

async function proxy(request: NextRequest, context: { params: { path?: string[] } }) {
  const path = context.params.path?.join("/") || "";
  const target = normalizeApiTarget(process.env.API_PROXY_TARGET);
  const url = new URL(request.url);
  let upstream = `${target}/api/v1/${path}${url.search}`;
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const headers = forwardedHeaders(request);

  let response: Response;
  try {
    let redirectCount = 0;
    while (true) {
      response = await fetch(upstream, {
        method,
        headers,
        body,
        cache: "no-store",
        redirect: "manual",
      });

      // FastAPI commonly issues 307/308 trailing-slash redirects for collection
      // routes. Replaying the redirected request manually keeps the auth header
      // attached instead of relying on cross-origin redirect behavior.
      if (![301, 302, 307, 308].includes(response.status) || redirectCount >= 3) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) break;

      upstream = new URL(location, upstream).toString();
      redirectCount += 1;
    }
  } catch {
    return NextResponse.json(
      { status: "error", message: "Backend API is unavailable", data: null },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
