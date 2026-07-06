import { fetchApi } from "@homarr/api/client";

type AppWithHref = {
  href: string | null;
};

type TranslationKey = "section.category.openAllInNewTabs.title" | "section.category.openAllInNewTabs.text";

interface OpenAppsInNewTabsOptions {
  t: (key: TranslationKey) => string;
  openConfirmModal: (options: { title: string; children: string }) => void;
  fetchAppsByIds?: (appIds: string[]) => Promise<AppWithHref[]>;
}

export const openAppsInNewTabs = async (
  appIds: string[],
  { t, openConfirmModal, fetchAppsByIds = fetchApi.app.byIds.query }: OpenAppsInNewTabsOptions,
) => {
  if (appIds.length === 0) return;

  const distinctAppIds = [...new Set(appIds)];
  const openedWindows = distinctAppIds.map(() => window.open("", "_blank", "noopener,noreferrer"));
  for (const openedWindow of openedWindows) {
    if (!openedWindow) continue;
    openedWindow.opener = null;
  }

  const apps = await fetchAppsByIds(distinctAppIds);
  const appsWithUrls = apps.filter((app) => app.href && app.href.length > 0);
  const tabsToClose = openedWindows.slice(appsWithUrls.length).filter((openedWindow): openedWindow is Window => Boolean(openedWindow));
  for (const tabToClose of tabsToClose) {
    tabToClose.close();
  }

  for (const [index, app] of appsWithUrls.entries()) {
    const openedWindow = openedWindows[index];
    if (openedWindow) {
      openedWindow.location.href = app.href;
      continue;
    }

    openConfirmModal({
      title: t("section.category.openAllInNewTabs.title"),
      children: t("section.category.openAllInNewTabs.text"),
    });
    break;
  }
};
