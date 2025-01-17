import { notFound } from "next/navigation";
import { Center } from "@mantine/core";

import { db } from "@homarr/db";
import type { WidgetKind } from "@homarr/definitions";
import { widgetImports } from "@homarr/widgets";

import { env } from "~/env";
import { WidgetPreviewPageContent } from "./_content";

interface Props {
  params: Promise<{ kind: string }>;
}

export default async function WidgetPreview(props: Props) {
  if (!((await props.params).kind in widgetImports || env.NODE_ENV !== "development")) {
    notFound();
  }

  const integrationData = await db.query.integrations.findMany({
    columns: {
      id: true,
      name: true,
      url: true,
      kind: true,
    },
  });

  const sort = (await props.params).kind as WidgetKind;

  return (
    <Center h="100vh">
      <WidgetPreviewPageContent kind={sort} integrationData={integrationData} />
    </Center>
  );
}
