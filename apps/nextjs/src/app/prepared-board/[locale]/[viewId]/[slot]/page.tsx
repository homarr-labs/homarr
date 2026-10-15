import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HydrationBoundary } from "@tanstack/react-query";

import { IntegrationProvider } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { isLocaleSupported } from "@homarr/translation";
import { getI18n } from "@homarr/translation/server";
import { getInitiallyVisibleWidgetKinds } from "@homarr/widgets/server-prefetch";

import { BoardLayoutView } from "~/app/[locale]/boards/_layout-creator";
import { createRootMetadataAsync } from "~/app/[locale]/_root-metadata";
import { ClientBoard } from "~/app/[locale]/boards/(content)/_client";
import { CachedWidgetRefresh } from "~/app/[locale]/boards/(content)/_cached-widget-refresh";
import { BoardContentEditAction, BoardContentSettingsAction } from "~/app/[locale]/boards/(content)/_header-actions";
import { WidgetResourcePreload } from "~/app/[locale]/boards/(content)/_widget-resource-preload";
import { readPreparedBoardAsync } from "~/board-preparation/store";
import { env } from "~/env";

interface Params {
  locale: string;
  viewId: string;
  slot: string;
}

export const generateMetadata = async ({ params }: { params: Promise<Params> }): Promise<Metadata> => {
  const { locale, viewId, slot } = await params;
  if (!isLocaleSupported(locale)) notFound();
  setRequestLocale(locale);
  const prepared = await readPreparedBoardAsync(viewId, slot);
  if (!prepared || prepared.context.locale !== locale) notFound();
  const { board, root } = prepared.context;
  const [t, metadata] = await Promise.all([getI18n("board"), createRootMetadataAsync(root)]);
  const branding = root.serverSettings.branding;
  const logo = branding.logoImageUrl ?? "/logo/logo.png";
  const favicon = board.faviconImageUrl?.trim() || branding.faviconImageUrl || logo;
  let title = board.metaTitle;
  if (!title) title = `${t("content.metaTitle", { boardName: board.name })} • ${branding.appName}`;
  return {
    ...metadata,
    title,
    icons: { icon: favicon, apple: favicon },
    appleWebApp: { capable: true, title: branding.appName, startupImage: { url: favicon } },
  };
};

export default async function Page({ params }: { params: Promise<Params> }) {
  const { locale, viewId, slot } = await params;
  if (!isLocaleSupported(locale)) notFound();
  setRequestLocale(locale);
  const prepared = await readPreparedBoardAsync(viewId, slot);
  if (!prepared || prepared.context.locale !== locale) notFound();
  const { board, root, viewportWidth, layoutId, integrations } = prepared.context;
  const { hasChangeAccess } = constructBoardPermissions(board, root.session);
  const demoReadOnly = env.DEMO_MODE && env.DEMO_READ_ONLY;
  return (
    <BoardLayoutView
      prepared
      initialBoard={board}
      initialLayoutId={layoutId}
      initialViewportWidth={viewportWidth}
      canModify={hasChangeAccess}
      colorScheme={root.colorScheme}
      shouldRunBoardTour={false}
      session={root.session}
      headerBoardEditAction={<BoardContentEditAction prepared demoReadOnly={demoReadOnly} />}
      headerBoardSettingsAction={<BoardContentSettingsAction demoReadOnly={demoReadOnly} />}
    >
      <WidgetResourcePreload kinds={getInitiallyVisibleWidgetKinds(board, layoutId)} />
      <HydrationBoundary state={prepared.queries}>
        <CachedWidgetRefresh queryHashes={prepared.queries.queries.map((query) => query.queryHash)} />
        <IntegrationProvider integrations={integrations}>
          <ClientBoard />
        </IntegrationProvider>
      </HydrationBoundary>
    </BoardLayoutView>
  );
}
