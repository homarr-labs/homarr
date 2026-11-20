"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useDemoReadOnly } from "@homarr/widgets/demo-read-only";

import { useOpenWhatsNew, whatsNewQueryOptions } from "./header/whats-new-modal";

const excludedRouteSegments = ["init", "auth", "widgets", "custom-widget-configuration"];

export const WhatsNewAutoOpen = () => {
  const session = useSession();
  const pathname = usePathname();
  const demoReadOnly = useDemoReadOnly();
  const openWhatsNew = useOpenWhatsNew();
  const hasOpenedRef = useRef(false);

  const isAdmin = session.status === "authenticated" && session.data.user.permissions.includes("admin");
  const routeSegment = pathname.split("/").find(Boolean) ?? "";
  const isExcludedRoute = excludedRouteSegments.includes(routeSegment);

  const { data } = clientApi.updateChecker.getWhatsNew.useQuery(
    { scope: "unseen" },
    { ...whatsNewQueryOptions, enabled: isAdmin && !isExcludedRoute && !demoReadOnly },
  );

  const hasUnseenReleases = (data?.releases.length ?? 0) > 0;

  useEffect(() => {
    if (!hasUnseenReleases || hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    openWhatsNew("unseen");
  }, [hasUnseenReleases, openWhatsNew]);

  return null;
};
