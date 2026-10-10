import { createFileRoute } from "@tanstack/react-router";

import { AccessDeniedError } from "../../../app/router";

export const Route = createFileRoute("/(public)/_public/manage")({
  beforeLoad: async ({ context }) => {
    const decision = await context.authorize({ kind: "protected", action: "view", resource: "management" });
    if (decision.kind === "deny") throw new AccessDeniedError(decision.status);
    throw new Error("Management contribution is unavailable");
  },
});
