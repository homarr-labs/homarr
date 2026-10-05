import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Center, Loader } from "@mantine/core";

import { getHomeBoardAsync } from "@homarr/api/board-server";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { BoardPreviewProvider } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { ModalProvider } from "@homarr/modals";
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
  const session = await auth();
  if (!session) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/widgets/${kind}`)}`);
  }

  const [integrations, board] = await Promise.all([getIntegrationsWithPermissionsAsync(session), getHomeBoardAsync()]);

  return (
    <IntegrationProvider integrations={integrations}>
      <BoardPreviewProvider board={board}>
        <ModalProvider>
          <Center h="100vh">
            <Suspense fallback={<Loader size="sm" />}>
              <WidgetPreviewPageContent key={kind} kind={kind as WidgetKind} />
            </Suspense>
          </Center>
        </ModalProvider>
      </BoardPreviewProvider>
    </IntegrationProvider>
  );
}
