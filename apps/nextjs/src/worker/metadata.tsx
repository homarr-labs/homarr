"use client";

import { useEffect } from "react";

import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

import type { Board } from "~/app/[locale]/boards/_types";

import { useWorkerBootstrap } from "./context";

export function WorkerMetadata({ board }: { board?: Board }) {
  const { serverSettings } = useWorkerBootstrap();
  const branding = serverSettings.branding;
  const title = board?.metaTitle || board?.name || branding.appName;
  const image = useWorkerResourceUrl(
    board?.faviconImageUrl || branding.faviconImageUrl || branding.logoImageUrl || "/logo/logo.png",
  );
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
  useEffect(() => {
    if (!image) return;
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = image;
    icon.dataset.homarrWorkerIcon = "true";
    document.head.append(icon);
    return () => icon.remove();
  }, [image]);
  return null;
}
