import { Hono } from "hono";

import { POST } from "@homarr/api/http/assistant/route";

export const assistantRoutes = new Hono().post("/api/assistant/chat", (context) => POST(context.req.raw));
