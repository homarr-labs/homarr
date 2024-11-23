import { generateOpenApiDocument } from "trpc-to-openapi";

import { appRouter } from "./root";

export const openApiDocument = (base: string) =>
  generateOpenApiDocument(appRouter, {
    title: "Homarr API documentation",
    version: "1.0.0",
    baseUrl: base,
    docsUrl: "https://homarr.dev",
    securitySchemes: {
      apikey: {
        type: "apiKey",
        name: "ApiKey",
        description: "API key which can be obtained in the Homarr administration dashboard",
        in: "header",
      },
    },
  });
