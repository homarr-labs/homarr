import type { WidgetUiAuditFamily } from "../types";

export const toolsFamily = {
  id: "tools",
  name: "Dashboard tools",
  description: "App shortcuts, Custom Widgets, llama.cpp, container updates, and edge routing.",
  kinds: ["app", "customApi", "llamacpp", "wud", "traefik"],
} satisfies WidgetUiAuditFamily;
