import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Center, Loader } from "@mantine/core";

import { db } from "@homarr/db";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds } from "@homarr/widgets/manifest";

import { WidgetPreviewPageContent } from "./_content";

interface Props {
  params: Promise<{ kind: string }>;
}

export default async function WidgetPreview(props: Props) {
  const { kind } = await props.params;
  if (!widgetKinds.includes(kind as WidgetKind)) {
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

  return (
    <Center h="100vh">
      <Suspense fallback={<Loader size="sm" />}>
        <WidgetPreviewPageContent kind={kind as WidgetKind} integrationData={integrationData} />
      </Suspense>
    </Center>
  );
}
