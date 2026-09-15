import { loader } from "fumadocs-core/source";
import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
  input: {
    homarr: "./public/api/open-api-schema.json",
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
