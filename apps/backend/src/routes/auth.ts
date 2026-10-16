import { Hono } from "hono";

import { handleAuthRequestAsync } from "@homarr/auth/http";

export const authRoutes = new Hono();
authRoutes.get("/*", (context) => handleAuthRequestAsync(context.req.raw));
authRoutes.post("/*", (context) => handleAuthRequestAsync(context.req.raw));
