import { combineJsonObjectSchemaEntries, combineJsonSchemasWithComposition } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";

import { fixtureCookieName, openApiVersion, restPrefix } from "../../features/api-docs/reference";
import { restErrorStatusMap, restRouter } from "./router";

const generator = new OpenAPIGenerator({ converters: [new ZodToJsonSchemaConverter({ unrepresentable: "throw" })] });
const maxDocumentBytes = 65536;
let documentJson: Promise<string> | undefined;

async function generateDocumentJson(): Promise<string> {
  const document = await generator.generate(restRouter, {
    version: openApiVersion,
    errorStatusMap: restErrorStatusMap,
    base: {
      info: {
        title: "Homarr Nitro fixture REST sample",
        version: "nitro-fixture-v1",
        description:
          "One executable board-read operation, served by direct oRPC REST independently of /rpc. Resolve the relative /api server against this document's configured loopback origin. Fixture-only, nonproduction HTTP access; do not publish this experiment publicly. Use the board page's fixture identity selector to choose owner or viewer. Session selection/logout remain typed RPC operations and are not part of this REST surface. Public documentation requires the same canonical local-request checks as board reads, but no login. All responses are no-store. No API key or bearer token authentication is implemented.",
      },
      servers: [{ url: restPrefix, description: "Same configured loopback origin as /openapi.json" }],
      components: {
        securitySchemes: {
          FixtureSession: {
            type: "apiKey",
            in: "cookie",
            name: fixtureCookieName,
            description:
              "Optional opaque fixture session cookie, issued by the local identity selector. Public reads need no cookie; private reads require the owner, not merely any session. HttpOnly, host-only, Path=/, SameSite=Strict, 15-minute absolute lifetime; invalid, duplicate, expired, evicted or logged-out cookies have no authority. Secure is intentionally absent for this loopback HTTP-only experiment. Sessions disappear on process restart. Exact URL/Host and any supplied Origin must match NITRO_FIXTURE_ORIGIN; foreign site metadata is denied. This annotation does not execute authorization. Cookie values never appear in this document.",
          },
        },
      },
    },
    customErrorResponseBodySchema: (definitions) =>
      combineJsonSchemasWithComposition(
        "oneOf",
        definitions.flatMap(({ code, dataJsonSchema }) => [
          {
            type: "object",
            properties: { code: { const: code } },
            required: ["code"],
            additionalProperties: false,
          },
          combineJsonObjectSchemaEntries([
            ["code", { const: code }, false],
            ["message", { type: "string" }, false],
            ["data", dataJsonSchema, false],
          ]),
        ]),
      ),
  });
  const json = JSON.stringify(document);
  if (new TextEncoder().encode(json).byteLength > maxDocumentBytes) {
    throw new Error("Fixture OpenAPI document exceeds its byte bound");
  }
  return json;
}

export function getOpenApiDocumentJson(): Promise<string> {
  documentJson ??= generateDocumentJson().catch((error: unknown) => {
    documentJson = undefined;
    throw error;
  });
  return documentJson;
}
