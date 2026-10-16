"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { WorkerBoardSettings, WorkerBoardsRoute } from "./boards";
import { WorkerAppsRoute, WorkerIntegrationsRoute, WorkerSearchEnginesRoute } from "./collections";
import { WorkerCustomWidgetsRoute, WorkerWorkshopRedirect } from "./custom-widgets";
import { WorkerMediaRoute } from "./media";
import { WorkerAssistantRoute, WorkerManagementHome, WorkerSettingsRoute } from "./settings";
import { WorkerToolsRoute } from "./tools";
import { WorkerUsersRoute } from "./users";

export function WorkerManagementRouter({
  pathname,
  searchParams: providedSearchParams,
}: {
  pathname: string;
  searchParams?: URLSearchParams;
}) {
  const currentSearchParams = useSearchParams();
  const searchParams = providedSearchParams ?? new URLSearchParams(currentSearchParams.toString());
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  if (parts[0] === "boards" && parts[1] && parts[2] === "settings") return <WorkerBoardSettings name={parts[1]} />;
  const segments = parts.slice(1);
  const props = { segments, searchParams };
  if (segments.length === 0) return <WorkerManagementHome />;
  switch (segments[0]) {
    case "boards":
      return <WorkerBoardsRoute />;
    case "apps":
      return <WorkerAppsRoute {...props} />;
    case "integrations":
      return <WorkerIntegrationsRoute {...props} />;
    case "search-engines":
      return <WorkerSearchEnginesRoute {...props} />;
    case "custom-widgets":
      return <WorkerCustomWidgetsRoute {...props} />;
    case "workshop":
      return <WorkerWorkshopRedirect />;
    case "medias":
      return <WorkerMediaRoute searchParams={searchParams} />;
    case "settings":
      return <WorkerSettingsRoute />;
    case "assistant":
      return <WorkerAssistantRoute />;
    case "users":
      return <WorkerUsersRoute {...props} />;
    case "about":
    case "tools":
      return <WorkerToolsRoute {...props} />;
    default:
      return <WorkerManagementNotFound />;
  }
}

function WorkerManagementNotFound() {
  const t = useI18n("common");
  return <Alert color="gray">{t("error")}</Alert>;
}
