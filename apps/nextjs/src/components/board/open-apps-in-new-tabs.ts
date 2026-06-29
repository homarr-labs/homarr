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
  const apps = await fetchAppsByIds(distinctAppIds);
  const appsWithUrls = apps.filter((app) => app.href && app.href.length > 0);

  for (const app of appsWithUrls) {
    const openedWindow = window.open(app.href ?? undefined, "_blank", "noopener,noreferrer");
    if (openedWindow) {
      openedWindow.opener = null;
      continue;
    }

    openConfirmModal({
      title: t("section.category.openAllInNewTabs.title"),
      children: t("section.category.openAllInNewTabs.text"),
    });
    break;
  }
};
