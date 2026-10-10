import "@vitejs/plugin-react/preamble";
import "@mantine/core/styles.css";

import { RouterProvider } from "@tanstack/react-router";
import { hydrate } from "@tanstack/react-router/ssr/client";
import { hydrateRoot } from "react-dom/client";

import { bootstrapElementId } from "./app/bootstrap";
import { createAppRouter } from "./app/router";
import { bootstrapSchema } from "./contracts/render";

async function hydrateApplication() {
  const element = document.getElementById(bootstrapElementId);
  if (!element?.textContent) throw new Error("Public bootstrap is missing");
  const bootstrap = bootstrapSchema.parse(JSON.parse(element.textContent));
  const router = createAppRouter({
    bootstrap,
    providers: {},
    authorize: async (requirement) =>
      requirement.kind === "public" ? { kind: "allow" } : { kind: "deny", status: 401 },
  });
  await hydrate(router);
  hydrateRoot(document, <RouterProvider router={router} />, {
    onRecoverableError(error) {
      document.documentElement.dataset.hydration = "mismatch";
      console.error("Homarr hydration mismatch", error);
    },
  });
}

void hydrateApplication();
