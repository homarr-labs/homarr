import "server-only";

import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

export const catchTrpcNotFound = (err: unknown) => {
  if (err instanceof TRPCError && err.code === "NOT_FOUND") {
    notFound();
  }

  throw err;
};
