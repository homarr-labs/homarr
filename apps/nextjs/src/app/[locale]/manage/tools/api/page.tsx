import { getScopedI18n } from "@homarr/translation/server";

// workaround for CSS that cannot be processed by next.js, https://github.com/swagger-api/swagger-ui/issues/10045
import "./swagger-ui-dark.css";
import "./swagger-ui-overrides.css";
import "./swagger-ui.css";

import { headers } from "next/headers";
import SwaggerUI from "swagger-ui-react";

import { openApiDocument } from "@homarr/api";
import { extractBaseUrlFromHeaders } from "@homarr/common";

import { createMetaTitle } from "~/metadata";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default function ApiPage() {
  const document = openApiDocument(extractBaseUrlFromHeaders(headers()));

  return <SwaggerUI spec={document} />;
}
