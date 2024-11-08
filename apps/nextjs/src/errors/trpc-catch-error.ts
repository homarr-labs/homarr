import "server-only";

import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

export const catchTrpcNotFound = (err: unknown) => {
  if (err instanceof TRPCError && err.code === "NOT_FOUND") {
    notFound();
  }

  throw err;
};

export const catchTrpcUnauthorized = (err: unknown) => {
  if (err instanceof TRPCError && err.code === "UNAUTHORIZED") {
    redirect("/auth/login");
  }

  throw err;
};
