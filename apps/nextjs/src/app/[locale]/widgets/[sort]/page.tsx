import type { PropsWithChildren } from "react";
import { notFound } from "next/navigation";

import { db } from "@homarr/db";
import { Center } from "@homarr/ui";
import type { WidgetSort } from "@homarr/widgets";
import { widgetImports } from "@homarr/widgets";

import { WidgetPreviewPageContent } from "./_content";

type Props = PropsWithChildren<{ params: { sort: string } }>;

export default async function WidgetPreview(props: Props) {
  if (!(props.params.sort in widgetImports)) {
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

  const sort = props.params.sort as WidgetSort;

  return (
    <Center h="100vh">
      <WidgetPreviewPageContent sort={sort} integrationData={integrationData} />
    </Center>
  );
}
