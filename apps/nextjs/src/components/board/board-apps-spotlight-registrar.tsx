"use client";

import { useEffect, useMemo, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { getSafeAppHref } from "@homarr/common";
import type { ContextSpecificItem } from "@homarr/spotlight";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { hasPendingSpotlightOpen, spotlightOpenEvent } from "@homarr/spotlight/open";

export const BoardAppsSpotlightRegistrar = () => {
  const board = useRequiredBoard();
  const [isSpotlightActivated, setIsSpotlightActivated] = useState(() => hasPendingSpotlightOpen());

  useEffect(() => {
    if (isSpotlightActivated) return;

    const activateSpotlightQueries = () => setIsSpotlightActivated(true);
    window.addEventListener(spotlightOpenEvent, activateSpotlightQueries);

    if (hasPendingSpotlightOpen()) activateSpotlightQueries();

    return () => window.removeEventListener(spotlightOpenEvent, activateSpotlightQueries);
  }, [isSpotlightActivated]);

  const openInNewTabByAppId = useMemo(() => {
    const result = new Map<string, boolean>();

    for (const item of board.items) {
      if (item.kind !== "app" || typeof item.options.appId !== "string" || item.options.appId.length === 0) continue;

      const existingOpenInNewTab = result.get(item.options.appId) ?? false;
      result.set(item.options.appId, existingOpenInNewTab || item.options.openInNewTab === true);
    }

    return result;
  }, [board.items]);
  const appIds = useMemo(() => Array.from(openInNewTabByAppId.keys()), [openInNewTabByAppId]);
  const activeAppIds = isSpotlightActivated ? appIds : [];
  const appQueries = clientApi.useQueries((trpc) => activeAppIds.map((id) => trpc.app.byId({ id })));
  const apps = appQueries.flatMap((query) => query.data ?? []);
  const spotlightItems = useMemo<ContextSpecificItem[]>(() => {
    return apps.flatMap((app) => {
      const href = getSafeAppHref(app.href);
      if (!href) return [];

      return [
        {
          id: app.id,
          dedupeKey: `app:${app.id}`,
          name: app.name,
          icon: app.iconUrl,
          interaction() {
            return {
              type: "link" as const,
              href,
              // Opening a new tab wins if any widget instance requests it.
              newTab: openInNewTabByAppId.get(app.id) ?? false,
            };
          },
        },
      ];
    });
  }, [apps, openInNewTabByAppId]);

  useRegisterSpotlightContextResults("board-apps", spotlightItems, [spotlightItems]);

  return null;
};
