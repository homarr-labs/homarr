import { generateOpenApiDocument } from "trpc-swagger";

import { appRouter } from "./root";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "tRPC OpenAPI",
  version: "1.0.0",
  baseUrl: "http://localhost:3000", // TODO: make this dynamic
  docsUrl: "https://homarr.dev",
});
