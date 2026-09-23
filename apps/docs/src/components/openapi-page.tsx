"use client";

import { createOpenAPIPage } from "fumadocs-openapi/ui";
import { withScalar } from "fumadocs-openapi/ui/scalar";

export const OpenAPIPage = createOpenAPIPage(
  withScalar({
    showResponseSchema: true,
  }),
);
