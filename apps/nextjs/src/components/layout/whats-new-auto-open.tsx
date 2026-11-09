"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useModalAction } from "@homarr/modals";
import { supportedLanguages } from "@homarr/translation/languages";

import { WhatsNewModal, whatsNewQueryOptions } from "./header/whats-new-modal";

const excludedRouteSegments = ["init", "auth", "widgets", "custom-widget-configuration"];

const getRouteSegment = (pathname: string) => {
  const [first, second] = pathname.split("/").filter(Boolean);
  return supportedLanguages.some((language) => language === first) ? second : first;
};

export const WhatsNewAutoOpen = () => {
  const session = useSession();
  const pathname = usePathname();
  const utils = clientApi.useUtils();
  const { openModal } = useModalAction(WhatsNewModal);
  const hasOpenedRef = useRef(false);
  const hasMarkedSeenRef = useRef(false);

  const isAdmin = session.status === "authenticated" && session.data.user.permissions.includes("admin");
  const isExcludedRoute = excludedRouteSegments.includes(getRouteSegment(pathname) ?? "");

  const { data } = clientApi.updateChecker.getWhatsNew.useQuery(
    { scope: "unseen" },
    { ...whatsNewQueryOptions, enabled: isAdmin && !isExcludedRoute },
  );
  const { mutate: markSeen } = clientApi.updateChecker.markWhatsNewSeen.useMutation({
    onSuccess: () => utils.updateChecker.getWhatsNew.invalidate({ scope: "unseen" }),
  });

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
