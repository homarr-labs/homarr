import { Stack, Title } from "@mantine/core";

import { getScopedI18n } from "@homarr/translation/server";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css"

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default function ApiPage() {
  return (
    <Stack>
      <Title order={1}>API</Title>
      <SwaggerUI url="/api/openapi" />
    </Stack>
  );
}
