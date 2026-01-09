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

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    services: {
      auth: AUTH_SERVICE,
      academic: ACADEMIC_SERVICE,
      certification: CERTIFICATION_SERVICE,
    },
  });
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
