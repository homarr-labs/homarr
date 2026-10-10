import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/_public/management")({
  beforeLoad: () => {
    throw redirect({ to: "/manage", statusCode: 302 });
  },
});
