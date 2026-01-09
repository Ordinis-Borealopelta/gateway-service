import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { proxy } from "hono/proxy";

const app = new Hono();

const AUTH_SERVICE = Bun.env.AUTH_SERVICE_URL || "http://localhost:4000";
const ACADEMIC_SERVICE =
  Bun.env.ACADEMIC_SERVICE_URL || "http://localhost:4001";
const CERTIFICATION_SERVICE =
  Bun.env.CERTIFICATION_SERVICE_URL || "http://localhost:4002";

app.use(logger());
app.use(cors());

async function checkServiceHealth(
  url: string,
): Promise<{ status: "ok" | "error"; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    if (response.ok) {
      return { status: "ok", latency };
    }
    return { status: "error", latency, error: `HTTP ${response.status}` };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

app.get("/health", async (c) => {
  const [auth, academic, certification] = await Promise.all([
    checkServiceHealth(AUTH_SERVICE),
    checkServiceHealth(ACADEMIC_SERVICE),
    checkServiceHealth(CERTIFICATION_SERVICE),
  ]);

  const allHealthy =
    auth.status === "ok" &&
    academic.status === "ok" &&
    certification.status === "ok";

  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      services: { auth, academic, certification },
    },
    allHealthy ? 200 : 503,
  );
});

app.all("/api/auth/*", (c) => {
  return proxy(`${AUTH_SERVICE}${c.req.path}`, {
    ...c.req,
    headers: {
      ...c.req.header(),
      "X-Forwarded-For": c.req.header("x-forwarded-for") || "127.0.0.1",
      "X-Forwarded-Host": c.req.header("host") || "",
      "X-Forwarded-Proto": "http",
    },
  });
});

const port = Bun.env.PORT || 3000;

serve({
  fetch: app.fetch,
  port,
  error: (error) => {
    console.error("Gateway error:", error.message);
  },
});

console.log(`Gateway started at http://localhost:${port}`);
