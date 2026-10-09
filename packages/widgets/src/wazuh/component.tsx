"use client";

import { useCallback, useRef } from "react";
import { Box, Tabs, Tooltip } from "@mantine/core";
import {
  IconChartAreaLine,
  IconDevicesPc,
  IconFileAlert,
  IconListNumbers,
  IconLockExclamation,
  IconShieldHalfFilled,
  IconBug,
  IconShieldBolt,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import type { WazuhView } from "./views";
import { getVisibleWazuhViews, resolveWazuhView } from "./views";
import { WazuhAgentsView } from "./views/agents";
import { WazuhAlertsView } from "./views/alerts";
import { WazuhAuthFailuresView } from "./views/auth-failures";
import { WazuhFimView } from "./views/fim";
import { WazuhOverviewView } from "./views/overview";
import { WazuhTimelineView } from "./views/timeline";
import { WazuhTopView } from "./views/top";
import { WazuhVulnerabilitiesView } from "./views/vulnerabilities";
import type { WazuhViewProps } from "./view-props";

const viewIcons: Record<WazuhView, TablerIcon> = {
  overview: IconShieldHalfFilled,
  alerts: IconShieldBolt,
  timeline: IconChartAreaLine,
  top: IconListNumbers,
  agents: IconDevicesPc,
  vulnerabilities: IconBug,
  fim: IconFileAlert,
  authFailures: IconLockExclamation,
};

const viewComponents: Record<WazuhView, (props: WazuhViewProps) => React.ReactNode> = {
  overview: WazuhOverviewView,
  alerts: WazuhAlertsView,
  timeline: WazuhTimelineView,
  top: WazuhTopView,
  agents: WazuhAgentsView,
  vulnerabilities: WazuhVulnerabilitiesView,
  fim: WazuhFimView,
  authFailures: WazuhAuthFailuresView,
};

export default function WazuhWidget(props: WidgetComponentProps<"wazuh">) {
  const { options, setOptions, boardId, itemId } = props;
  const t = useI18n("widget.wazuh");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const savePendingRef = useRef(false);
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    onError: () => showErrorNotification({ title: t("error.viewSaveTitle"), message: t("error.viewSaveMessage") }),
  });

  const visibleViews = getVisibleWazuhViews(options.visibleViews);
  const view = resolveWazuhView(options.view, visibleViews);

  // Same flow as the Beszel system switcher: update locally first, then persist the invisible option.
  const handleViewChange = useCallback(
    (value: string | null) => {
      if (!value || value === options.view || savePendingRef.current) return;
      const previousValue = options.view;
      const newView = value as WazuhView;
      setOptions({ newOptions: { view: newView } });
      if (!hasChangeAccess || !boardId || !itemId) return;
      savePendingRef.current = true;
      saveItemOptions(
        { boardId, itemId, newOptions: { view: newView } },
        {
          onError: () => setOptions({ newOptions: { view: previousValue } }),
          onSettled: () => {
            savePendingRef.current = false;
          },
        },
      );
    },
    [boardId, hasChangeAccess, itemId, options.view, saveItemOptions, setOptions],
  );

  const View = viewComponents[view];

  return (
    <Box className={classes.root} data-view={view}>
      {visibleViews.length > 1 && (
        <Tabs value={view} onChange={handleViewChange} variant="pills" radius="sm" className={classes.tabs}>
          <Tabs.List style={{ flexWrap: "nowrap" }}>
            {visibleViews.map((value) => {
              const Icon = viewIcons[value];
              return (
                <Tooltip key={value} label={t(`view.${value}`)} withArrow openDelay={200}>
                  <Tabs.Tab value={value} px={8} py={4} aria-label={t(`view.${value}`)}>
                    <Icon size={16} stroke={1.8} />
                  </Tabs.Tab>
                </Tooltip>
              );
            })}
          </Tabs.List>
        </Tabs>
      )}
      <View {...props} />
    </Box>
  );
}
