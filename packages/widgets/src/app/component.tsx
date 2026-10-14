"use client";

import { Suspense } from "react";
import { IconMinus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeAppHref } from "../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { AppNativeView } from "./native-view";
import { PingDot } from "./ping/ping-dot";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({
  options,
  isEditMode,
  height,
  width,
  displayScale = 1,
}: WidgetComponentProps<"app">) {
  const tCommon = useI18n("common");
  const settings = useSettings();
  const board = useRequiredBoard();
  const appQuery = clientApi.app.byId.useQuery({ id: options.appId }, { enabled: Boolean(options.appId) });
  const app = getUsableWidgetQueryData(appQuery);
  const href = getSafeAppHref(app?.href);

  if (!options.appId) return <WidgetEmptyState />;
  if (isInitialWidgetQueryPending(appQuery)) return <WidgetQueryLoadingState />;
  if (!app) return <WidgetEmptyState />;

  return (
    <AppNativeView
      app={app}
      href={href}
      options={options}
      isEditMode={isEditMode}
      height={height}
      width={width}
      displayScale={displayScale}
      renderImage={(props) => <MaskedOrNormalImage {...props} hasColor={board.iconColor !== null} />}
      status={
        options.pingEnabled &&
        !settings.forceDisableStatus &&
        !board.disableStatus &&
        Boolean(app.pingUrl ?? app.href) ? (
          <Suspense fallback={<PingDot icon={IconMinus} color="gray" tooltip={`${tCommon("action.loading")}…`} />}>
            <PingIndicator appId={app.id} />
          </Suspense>
        ) : null
      }
    />
  );
}
