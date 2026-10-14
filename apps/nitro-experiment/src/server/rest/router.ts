import { openapi } from "@orpc/openapi";
import type { OpenAPIV3_2 } from "@orpc/openapi";
import { os } from "@orpc/server";

import { apiErrors, boardReadInputSchema, boardReadOutputSchema, errorDataSchema } from "../../contracts/schemas";
import {
  boardReadPath,
  deniedBoardExample,
  privateBoardExample,
  publicBoardExample,
  publicOwnerExample,
} from "../../features/api-docs/reference";
import { readAuthorizedBoard } from "../api/board-read";
import type { RequestContext } from "../context/request";

export const restErrors = {
  BAD_REQUEST: apiErrors.BAD_REQUEST,
  FORBIDDEN: apiErrors.FORBIDDEN,
  NOT_FOUND: apiErrors.NOT_FOUND,
  INTERNAL_SERVER_ERROR: { message: "Fixture request failed", data: errorDataSchema },
};

export const restErrorStatusMap = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export function sanitizeRestError(code: string) {
  switch (code) {
    case "BAD_REQUEST":
      return { code, message: restErrors.BAD_REQUEST.message, data: { reason: "invalid-input" } };
    case "FORBIDDEN":
      return deniedBoardExample;
    case "NOT_FOUND":
      return { code, message: restErrors.NOT_FOUND.message, data: { reason: "missing-board-or-route" } };
    default:
      return {
        code: "INTERNAL_SERVER_ERROR",
        message: restErrors.INTERNAL_SERVER_ERROR.message,
        data: { reason: "fixture-request-failed" },
      };
  }
}

function describeBoardRead(operation: OpenAPIV3_2.OperationObject): OpenAPIV3_2.OperationObject {
  operation.security = [{}, { FixtureSession: [] }];
  const success = operation.responses?.["200"];
  if (success && !("$ref" in success)) {
    const media = success.content?.["application/json"];
    if (media && !("$ref" in media)) {
      media.examples = {
        publicReader: { summary: "Anonymous or viewer public read, initial fixture", value: publicBoardExample },
        publicOwner: { summary: "Owner public read, initial fixture", value: publicOwnerExample },
        privateOwner: { summary: "Active owner private read, initial fixture", value: privateBoardExample },
      };
    }
  }
  const denial = operation.responses?.["403"];
  if (denial && !("$ref" in denial)) {
    const media = denial.content?.["application/json"];
    if (media && !("$ref" in media)) {
      media.examples = {
        privateDenied: { summary: "Anonymous or viewer private read", value: deniedBoardExample },
        localRequestDenied: { summary: "Outer canonical local-request guard", value: { code: "FORBIDDEN" } },
      };
    }
  }
  return operation;
}

const boardRead = os
  .$context<RequestContext>()
  .errors(restErrors)
  .input(boardReadInputSchema)
  .output(boardReadOutputSchema)
  .meta(
    openapi({
      method: "GET",
      path: boardReadPath,
      operationId: "readFixtureBoard",
      summary: "Read an authorized fixture board",
      description:
        "GET /api/boards/{boardId}. Public boards allow anonymous, viewer and owner reads. Private boards require an active owner fixture session; anonymous and viewer requests receive 403. The live shared board guard checks the cookie store on every read, including expiry, logout and eviction. Missing public/private records return 404; any other boardId or unexpected input field returns 400. Only the sanitized board projection is returned, never an owner identity or session token. Examples show initial synthetic fixtures; saved labels and revisions may differ. Canonical loopback URL/Host and any supplied Origin must match NITRO_FIXTURE_ORIGIN. The outer request guard can return a code-only error. Security annotations describe the optional cookie, not permission enforcement. This operation cannot edit a board.",
      successDescription: "Authorized sanitized board projection",
      tags: ["Fixture boards"],
      inputStructure: "compact",
      outputStructure: "compact",
      spec: describeBoardRead,
    }),
  )
  .handler(({ context, input }) => readAuthorizedBoard(context, input.boardId));

export const restRouter = { board: { read: boardRead } };
