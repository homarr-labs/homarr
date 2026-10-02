"use client";

import { createOpenAPIPage } from "fumadocs-openapi/ui";
import { withScalar } from "fumadocs-openapi/ui/scalar";

import { Carbon } from "@/components/carbon";

export const OpenAPIPage = createOpenAPIPage(
  withScalar({
    showResponseSchema: true,
    content: {
      renderAPIExampleLayout: ({ selector, usageTabs, responseTabs }) => (
        <div className="prose-no-margin">
          {selector}
          {usageTabs}
          {responseTabs}
          <Carbon />
        </div>
      ),
    },
  }),
);
