"use client";

import type { PropsWithChildren } from "react";
import { Suspense, use, useCallback, useMemo, useState } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

import { clientApi } from "@homarr/api/client";
import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";
import { createModal, useModalAction } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";
import type * as WidgetModalsModule from "@homarr/widgets/modals";
import type { WidgetEditModalProps, WidgetEditModalSize } from "@homarr/widgets/modals";
import { loadWidgetComponent } from "@homarr/widgets/manifest";
import type { IntegrationSelectOption } from "@homarr/widgets/widget-integration-select";

import { AssistantContext, useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";
import { getLogicalTrackSize } from "~/components/board/layout";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import type * as IntegrationEditFormModule from "~/components/integration/embedded-integration-edit-form";
import type { EmbeddedIntegrationEditFormProps } from "~/components/integration/embedded-integration-edit-form";

const defaultWidgetSize = { width: 1, height: 1 };
const ignoreAssistantAction = () => undefined;
const ignoreAssistantPrompt = () => false;
const ignoreAssistantRefresh = () => Promise.resolve();
const getPreviewDimensions = (size: WidgetEditModalSize) => ({
  width: getLogicalTrackSize(size.width),
  height: getLogicalTrackSize(size.height),
});

const PreviewRuntimeWrapper = ({ children }: PropsWithChildren) => {
  const assistant = useOptionalHomarrAssistant();
  const previewAssistant = useMemo(() => {
    if (!assistant) return null;
    return {
      ...assistant,
      open: ignoreAssistantAction,
      close: ignoreAssistantAction,
      toggle: ignoreAssistantAction,
      sendPrompt: ignoreAssistantPrompt,
      refreshCurrentView: ignoreAssistantRefresh,
      setWidgetVisible: ignoreAssistantAction,
      activateWidget: ignoreAssistantAction,
    };
  }, [assistant]);

  if (!previewAssistant) return children;
  return <AssistantContext.Provider value={previewAssistant}>{children}</AssistantContext.Provider>;
};

let widgetEditModalPromise: Promise<typeof WidgetModalsModule> | undefined;

export const loadWidgetEditModal = () => {
  if (widgetEditModalPromise) return widgetEditModalPromise;

  const currentPromise = import("@homarr/widgets/modals");
  widgetEditModalPromise = currentPromise;
  void currentPromise.catch(() => {
    if (widgetEditModalPromise === currentPromise) widgetEditModalPromise = undefined;
  });
  return currentPromise;
};

export const preloadWidgetEditModal = () => void loadWidgetEditModal().catch(() => undefined);

let integrationEditFormPromise: Promise<typeof IntegrationEditFormModule> | undefined;

const loadIntegrationEditForm = () => {
  if (integrationEditFormPromise) return integrationEditFormPromise;

  const currentPromise = import("~/components/integration/embedded-integration-edit-form");
  integrationEditFormPromise = currentPromise;
  void currentPromise.catch(() => {
    if (integrationEditFormPromise === currentPromise) integrationEditFormPromise = undefined;
  });
  return currentPromise;
};

const LazyIntegrationEditFormContent = (props: EmbeddedIntegrationEditFormProps) => {
  const { EmbeddedIntegrationEditForm } = use(loadIntegrationEditForm());
  return <EmbeddedIntegrationEditForm {...props} />;
};

const IntegrationEditErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <Center py="xl">
    <WidgetError
      error={error}
      resetErrorBoundary={() => {
        integrationEditFormPromise = undefined;
        resetErrorBoundary();
      }}
    />
  </Center>
);

const LazyIntegrationEditForm = (props: EmbeddedIntegrationEditFormProps) => (
  <ErrorBoundary FallbackComponent={IntegrationEditErrorFallback}>
    <Suspense
      fallback={
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      }
    >
      <LazyIntegrationEditFormContent {...props} />
    </Suspense>
  </ErrorBoundary>
);

interface LazyWidgetEditModalContentProps {
  actions: { closeModal: () => void };
  innerProps: WidgetEditModalProps<WidgetKind>;
}

const LazyWidgetEditModalContent = (props: LazyWidgetEditModalContentProps) => {
  const { WidgetEditModal } = use(loadWidgetEditModal());
  const { default: PreviewComponent } = use(loadWidgetComponent(props.innerProps.kind));
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const Component = WidgetEditModal.component;
  const utils = clientApi.useUtils();
  const [createdIntegrations, setCreatedIntegrations] = useState<IntegrationSelectOption[]>([]);

  const supportedKinds = useMemo(() => {
    if (!("supportedIntegrations" in props.innerProps.definition)) return [];
    return (props.innerProps.definition.supportedIntegrations ?? []).filter((k) => k !== "mock");
  }, [props.innerProps.definition]);

  const handleOpenNewIntegration = useCallback(
    (onCreated?: (id: string) => void) => {
      openIntegrationModal({
        allowedKinds: supportedKinds,
        onSuccess: (result) => {
          if (result?.integration) {
            setCreatedIntegrations((prev) => [...prev, result.integration]);
            void utils.integration.all.invalidate();
            onCreated?.(result.integration.id);
          }
        },
      });
    },
    [openIntegrationModal, supportedKinds, utils],
  );

  const combinedIntegrationData = useMemo(() => {
    const existing = props.innerProps.integrationData;
    const additional = createdIntegrations.filter((c) => !existing.some((e) => e.id === c.id));
    return [...existing, ...additional];
  }, [props.innerProps.integrationData, createdIntegrations]);
  const previewDimensions = useMemo(() => {
    if (props.innerProps.previewDimensions) return props.innerProps.previewDimensions;
    const size = widgetDefaultSizes[props.innerProps.kind] ?? defaultWidgetSize;
    return {
      width: getLogicalTrackSize(size.width),
      height: getLogicalTrackSize(size.height),
    };
  }, [props.innerProps.kind, props.innerProps.previewDimensions]);
  let previewResize = props.innerProps.previewResize;
  if (previewResize) {
    previewResize = { ...previewResize, getDimensions: getPreviewDimensions };
  }

  return (
    <Component
      {...props}
      innerProps={{
        ...props.innerProps,
        integrationData: combinedIntegrationData,
        integrationEditForm: LazyIntegrationEditForm,
        previewComponent: PreviewComponent,
        previewDimensions,
        previewResize,
        previewWrapper: PreviewRuntimeWrapper,
        onOpenNewIntegration: supportedKinds.length > 0 ? handleOpenNewIntegration : undefined,
      }}
    />
  );
};

export const LazyWidgetEditModal = createModal<WidgetEditModalProps<WidgetKind>>((props) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <Center py="xl">
        <WidgetError
          error={error}
          resetErrorBoundary={() => {
            widgetEditModalPromise = undefined;
            resetErrorBoundary();
          }}
        />
      </Center>
    )}
  >
    <Suspense
      fallback={
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      }
    >
      <LazyWidgetEditModalContent {...props} />
    </Suspense>
  </ErrorBoundary>
)).withOptions({
  keepMounted: true,
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: "100rem",
  transitionProps: {
    transition: "pop",
    duration: 180,
  },
  closeOnClickOutside: false,
});
