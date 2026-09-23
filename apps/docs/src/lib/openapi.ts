import { loader } from "fumadocs-core/source";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { Document } from "fumadocs-openapi";

import schema from "../../public/api/open-api-schema.json";

export const openapi = createOpenAPI({
  input: {
    homarr: () => ({
      ...(schema as unknown as Document),
      servers: [
        {
          url: "{instanceUrl}",
          description: "Enter the full URL of your Homarr instance, including its scheme and reverse-proxy path.",
          variables: {
            instanceUrl: {
              default: "https://homarr.example.com",
              description: "The full URL where your Homarr instance is reachable, including any reverse-proxy path.",
            },
          },
        },
      ],
    }),
  },
});

export const apiSource = loader({
  baseUrl: "/api-reference",
  source: await openapi.staticSource({
    per: "operation",
    groupBy: "tag",
    meta: true,
  }),
});
