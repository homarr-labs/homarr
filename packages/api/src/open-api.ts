import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";

import { appRouter } from "./router/app";
import { infoRouter } from "./router/info";
import { inviteRouter } from "./router/invite";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const openApiRouter = createTRPCRouter({
  appRouter,
  infoRouter,
  inviteRouter,
  userRouter,
});

export const openApiDocument = (base: string) =>
  generateOpenApiDocument(openApiRouter, {
    title: "Homarr API documentation",
    version: "1.0.0",
    baseUrl: base,
    docsUrl: "https://homarr.dev",
    securitySchemes: {
      apikey: {
        type: "apiKey",
        name: API_KEY_HEADER_NAME,
        description: "API key which can be obtained in the Homarr administration dashboard",
        in: "header",
      },
    },
  });
