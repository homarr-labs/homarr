"use client";

import { useEffect, useRef } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";

import { useFormContext } from "../../_inputs/form";
import { formatLinkedDockerContainer, suggestDockerContainer } from "./container-option";

export const useDockerContainerOptions = (options: Record<string, unknown>) => {
  const t = useI18n("widget.app.option.dockerContainer");
  const form = useFormContext();
  const appId = typeof options.appId === "string" ? options.appId : "";
  const initialAppId = useRef(appId);
  const { data: app } = clientApi.app.byId.useQuery({ id: appId }, { enabled: appId !== "" });
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const { data, isLoading, error } = clientApi.docker.getContainers.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const hasManyEndpoints = (data?.endpoints.length ?? 0) > 1;
  const toOption = (container: { endpointId: string; endpointName: string; name: string }) => ({
    value: formatLinkedDockerContainer(container),
    label: hasManyEndpoints ? `${container.name} (${container.endpointName})` : container.name,
  });
  const suggestion = app && data ? suggestDockerContainer(app, data.containers) : null;
  const suggestedOption = suggestion ? toOption(suggestion.container) : null;
  const isCertain = suggestion?.isCertain ?? false;
  const isSettled = appId === "" || (app !== undefined && !isLoading);

  // A container belongs to its app, so picking another app in this dialog replaces the link instead of keeping the
  // previous one. A port match alone is too weak to link and only moves the container to the top of the list.
  useEffect(() => {
    if (appId === initialAppId.current || !isSettled) return;
    initialAppId.current = appId;
    form.setFieldValue("options.dockerContainer", isCertain ? suggestedOption : null);
  }, [appId, form, isCertain, isSettled, suggestedOption]);

  return {
    isPending: isLoading,
    error: error ? t(error.data?.code === "NOT_FOUND" ? "disabled" : "unavailable") : undefined,
    options: (data?.containers ?? [])
      .map(toOption)
      .toSorted(
        (first, second) =>
          Number(second.value === suggestedOption?.value) - Number(first.value === suggestedOption?.value) ||
          first.label.localeCompare(second.label),
      ),
  };
};
