import { generateOpenApiDocument } from "trpc-swagger";

import { appRouter } from "./root";

export const openApiDocument = (base: string) =>
  generateOpenApiDocument(appRouter, {
    title: "Homarr API documentation",
    version: "1.0.0",
    baseUrl: base,
    docsUrl: "https://homarr.dev",
  });
