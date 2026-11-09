"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useModalAction } from "@homarr/modals";
import { useDemoReadOnly } from "@homarr/widgets/demo-read-only";

import { WhatsNewModal, whatsNewQueryOptions } from "./header/whats-new-modal";

const excludedRouteSegments = ["init", "auth", "widgets", "custom-widget-configuration"];

export const WhatsNewAutoOpen = () => {
  const session = useSession();
  const pathname = usePathname();
  const demoReadOnly = useDemoReadOnly();
  const { openModal } = useModalAction(WhatsNewModal);
  const hasOpenedRef = useRef(false);
  const hasMarkedSeenRef = useRef(false);

  const isAdmin = session.status === "authenticated" && session.data.user.permissions.includes("admin");
  const routeSegment = pathname.split("/").find(Boolean) ?? "";
  const isExcludedRoute = excludedRouteSegments.includes(routeSegment);

  const { data } = clientApi.updateChecker.getWhatsNew.useQuery(
    { scope: "unseen" },
    { ...whatsNewQueryOptions, enabled: isAdmin && !isExcludedRoute && !demoReadOnly },
  );
  const { mutate: markSeen } = clientApi.updateChecker.markWhatsNewSeen.useMutation();

  const hasUnseenReleases = (data?.releases.length ?? 0) > 0;

  useEffect(() => {
    if (!hasUnseenReleases || hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    openModal(
      { scope: "unseen" },
      {
        onClose: () => {
          if (hasMarkedSeenRef.current) return;
          hasMarkedSeenRef.current = true;
          markSeen();
        },
      },
    );
  }, [hasUnseenReleases, openModal, markSeen]);

  return null;
};
