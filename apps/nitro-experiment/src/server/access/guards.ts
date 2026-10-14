import { ORPCError } from "@orpc/server";

import type { AccessCapabilities, BoardRecord } from "../../contracts/schemas";
import type { RequestContext } from "../context/request";
import { liveSession } from "../session/service";
import { assertLocalOrigin, assertMutationOrigin } from "./local-request";

export function assertLocalRequest(context: RequestContext): void {
  assertLocalOrigin(context.request, context.config);
}

export function assertMutationRequest(context: RequestContext): void {
  assertMutationOrigin(context.request, context.config);
}

export function authorizeBoardRead(context: RequestContext, board: BoardRecord): AccessCapabilities {
  assertLocalRequest(context);
  const session = liveSession(context);
  if (session?.identity.id === "owner" && board.ownerId === "owner") {
    return { canEdit: true, variant: "owner" };
  }
  if (board.visibility === "public") return { canEdit: false, variant: "public-reader" };
  throw new ORPCError("FORBIDDEN", { data: { reason: "private-board" } });
}

export function authorizeBoardWrite(context: RequestContext, board: BoardRecord): void {
  assertMutationRequest(context);
  const session = liveSession(context);
  if (session?.identity.id !== "owner" || board.ownerId !== "owner") {
    throw new ORPCError("FORBIDDEN", { data: { reason: "board-owner-required" } });
  }
}

export function authorizeSourceControl(context: RequestContext): void {
  assertMutationRequest(context);
  if (liveSession(context)?.identity.id !== "owner") {
    throw new ORPCError("FORBIDDEN", { data: { reason: "source-owner-required" } });
  }
}
