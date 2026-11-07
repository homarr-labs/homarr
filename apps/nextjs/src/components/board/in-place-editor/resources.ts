import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { WidgetKind } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import type { WidgetComponentProps, WidgetDefinition } from "@homarr/widgets/definition";
import { loadWidgetComponent, loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import type { WidgetEditModalState } from "@homarr/widgets/modals";
import type { IntegrationSelectOption } from "@homarr/widgets/widget-integration-select";

import { getTargetKind } from "./store";
import type { PickTarget } from "./types";

export interface TargetResources {
  status: "idle" | "loading" | "ready" | "error";
  kind: WidgetKind | null;
  definition: WidgetDefinition | null;
  Component: ComponentType<WidgetComponentProps<WidgetKind>> | null;
  baseValue: WidgetEditModalState | null;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
  missingIntegration: boolean;
  appId?: string;
}

const emptyResources: TargetResources = {
  status: "idle",
  kind: null,
  definition: null,
  Component: null,
  baseValue: null,
  integrationData: [],
  integrationSupport: false,
  missingIntegration: false,
};

interface LoadedModules {
  kind: WidgetKind;
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
}

export const useTargetResources = (target: PickTarget | undefined): TargetResources => {
  const settings = useSettings();
  const { data: integrations } = clientApi.integration.all.useQuery();
  const kind = target ? getTargetKind(target) : null;
  const [loaded, setLoaded] = useState<LoadedModules | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!kind) {
      setLoaded(null);
      return;
    }
    let cancelled = false;
    setFailed(false);
    Promise.all([loadWidgetDefinition(kind), loadWidgetComponent(kind)])
      .then(([definition, module]) => {
        if (cancelled) return;
        setLoaded({ kind, definition, Component: module.default as LoadedModules["Component"] });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return useMemo(() => {
    if (!target || !kind) return emptyResources;
    if (failed) return { ...emptyResources, kind, status: "error" };
    if (loaded?.kind !== kind) return { ...emptyResources, kind, status: "loading" };

    const { definition, Component } = loaded;
    const integrationSupport = "supportedIntegrations" in definition;
    const supported = integrationSupport ? (definition.supportedIntegrations ?? []) : [];
    const integrationData = (integrations ?? []).filter(
      (integration) => integration.permissions.hasUseAccess && supported.includes(integration.kind),
    );
    const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;
    const integrationsRequired =
      integrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);

    if (target.type === "existing") {
      return {
        status: "ready",
        kind,
        definition,
        Component,
        baseValue: {
          ...target.value,
          options: reduceWidgetOptionsWithDefinition(definition, settings, target.value.options),
        },
        integrationData,
        integrationSupport,
        missingIntegration: false,
        appId: target.appId,
      };
    }

    const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings);
    let options: Record<string, unknown> = defaultOptions;
    if (target.type === "custom") {
      options = {
        ...defaultOptions,
        definitionId: target.id,
        configuration: target.defaultOptions,
        configurationVersion: target.configurationVersion,
      };
    }
    if (target.type === "app") options = { ...defaultOptions, appId: target.appId };

    const integrationIds = integrationData.slice(0, maxIntegrations).map((integration) => integration.id);

    return {
      status: "ready",
      kind,
      definition,
      Component,
      baseValue: {
        advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
        options,
        integrationIds,
      },
      integrationData,
      integrationSupport,
      missingIntegration: integrationsRequired && integrationIds.length === 0,
    };
  }, [failed, integrations, kind, loaded, settings, target]);
};

export const getTargetKey = (target: PickTarget | undefined, editItemId?: string) => {
  if (!target) return "none";
  if (target.type === "widget") return `widget:${target.kind}`;
  if (target.type === "custom") return `custom:${target.id}`;
  if (target.type === "app") return `app:${target.appId}`;
  return `existing:${editItemId ?? target.kind}`;
};
