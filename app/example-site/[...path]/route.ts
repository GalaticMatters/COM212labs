import { readFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED: Record<string, string> = {
  "index.html": "text/html; charset=utf-8",
  "about.html": "text/html; charset=utf-8",
  "catalog.html": "text/html; charset=utf-8",
  "visit.html": "text/html; charset=utf-8",
  "404.html": "text/html; charset=utf-8",
  "health.txt": "text/plain; charset=utf-8",
  "css/site.css": "text/css; charset=utf-8",
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'self'",
  "img-src data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

function isSafeSegment(segment: string) {
  return (
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("\\") &&
    !segment.includes("\0") &&
    !segment.includes("/")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments.every(isSafeSegment)) {
    return new Response("Not found", { status: 404 });
  }

  const relative = segments.join("/");
  const contentType = ALLOWED[relative];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  const root = path.resolve(process.cwd(), "lab", "site");
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Security-Policy": CONTENT_SECURITY_POLICY,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
