import "server-only";

import { notFound, redirect } from "next/navigation";
import { ORPCError } from "@orpc/client";

import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "trpcCatchError" });

export const catchRpcNotFound = (err: unknown) => {
  if (err instanceof ORPCError && err.code === "NOT_FOUND") {
    notFound();
  }

  throw err;
};

export const catchRpcUnauthorized = (err: unknown) => {
  if (err instanceof ORPCError && err.code === "UNAUTHORIZED") {
    logger.info("Somebody tried to access a protected route without being authenticated, redirecting to login page");
    redirect("/auth/login");
  }

  throw err;
};
