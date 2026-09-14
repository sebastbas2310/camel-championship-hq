import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin proxy to the course's Spring Boot backend.
 * The browser cannot call https://camelvsdwarf.onrender.com directly (CORS),
 * so every request is forwarded from the server with the caller's bearer token.
 */
const UPSTREAM = "https://camelvsdwarf.onrender.com/api/v1";

async function forward({ request, params }: { request: Request; params: Record<string, string> }) {
  const splat = params["_splat"] ?? "";
  const url = new URL(request.url);
  const target = `${UPSTREAM}/${splat}${url.search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.text() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return new Response(JSON.stringify({ message: "Upstream unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const text = await upstream.text();
  return new Response(text || null, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const Route = createFileRoute("/api/proxy/$")({
  server: {
    handlers: {
      GET: forward,
      POST: forward,
      PUT: forward,
      PATCH: forward,
      DELETE: forward,
    },
  },
});
