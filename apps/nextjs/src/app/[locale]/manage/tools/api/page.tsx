import { getScopedI18n } from "@homarr/translation/server";

// workaround for CSS that cannot be processed by next.js, https://github.com/swagger-api/swagger-ui/issues/10045
import "./swagger-ui-dark.css";
import "./swagger-ui-overrides.css";
import "./swagger-ui.css";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SwaggerUI from "swagger-ui-react";

import { openApiDocument } from "@homarr/api";
import { auth } from "@homarr/auth/next";
import { extractBaseUrlFromHeaders } from "@homarr/common";

import { createMetaTitle } from "~/metadata";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function ApiPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    notFound();
  }
  const document = openApiDocument(extractBaseUrlFromHeaders(headers()));

  return <SwaggerUI spec={document} />;
}
