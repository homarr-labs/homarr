import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Center, Loader } from "@mantine/core";

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

  return (
    <Center h="100vh">
      <Suspense fallback={<Loader size="sm" />}>
        <WidgetPreviewPageContent key={kind} kind={kind as WidgetKind} />
      </Suspense>
    </Center>
  );
}
