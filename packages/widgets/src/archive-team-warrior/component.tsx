"use client";

import { clientApi } from "@homarr/api/client";
import { getIconUrl } from "@homarr/definitions";
import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { ArchiveTeamWarriorNativeView } from "./native-view";

export { getArchiveCompactLayout } from "./native-view";

export default function ArchiveTeamWarriorWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"archiveTeamWarrior">) {
  const integrationId = integrationIds[0];
  if (!integrationId) return null;
  return (
    <ArchiveTeamWarriorWidgetContent
      integrationId={integrationId}
      options={options}
      width={width}
      height={height}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

const ArchiveTeamWarriorWidgetContent = ({
  integrationId,
  options,
  width,
  height,
  isAdvanced,
}: {
  integrationId: string;
  options: WidgetComponentProps<"archiveTeamWarrior">["options"];
  width: number;
  height: number;
  isAdvanced: boolean;
}) => {
  const t = useI18n("widget.archiveTeamWarrior");
  const tWidgetCommon = useI18n("widget.common");
  const locale = useCurrentIntlLocale();
  const { formatBytes, formatByteRate } = useByteFormatter();
  const [data] = clientApi.widget.archiveTeamWarrior.getStatus.useSuspenseQuery({ integrationId });
  return (
    <ArchiveTeamWarriorNativeView
      status={data.status}
      options={options}
      width={width}
      height={height}
      isAdvanced={isAdvanced}
      locale={locale}
      iconUrl={getIconUrl("archiveTeamWarrior")}
      formatBytes={formatBytes}
      formatByteRate={formatByteRate}
      labels={{
        noProjectSelected: t("noProjectSelected"),
        status: (key) => t(`status.${key}`),
        metric: {
          running: t("metric.running"),
          completed: t("metric.completed"),
          failed: t("metric.failed"),
          canceled: t("metric.canceled"),
          download: t("metric.download"),
          upload: t("metric.upload"),
        },
        runnerStatus: (status) => t("runnerStatus", { status }),
        updatedAt: (date) => tWidgetCommon("updatedAt", { date }),
        projectId: (id) => t("projectId", { id }),
        sessionReceived: (value) => t("sessionReceived", { value }),
        sessionSent: (value) => t("sessionSent", { value }),
        sessionId: (id) => t("sessionId", { id }),
        emptyItems: t("emptyItems"),
        startedAt: (date) => t("startedAt", { date }),
      }}
    />
  );
};
