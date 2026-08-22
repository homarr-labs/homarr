"use client";

import { Suspense, use, useCallback, useMemo, useState } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

import { clientApi } from "@homarr/api/client";
import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeForm, useModalAction } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";
import type * as WidgetModalsModule from "@homarr/widgets/modals";
import type { WidgetEditModalProps } from "@homarr/widgets/modals";
import type { IntegrationSelectOption } from "@homarr/widgets/widget-integration-select";

import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import type * as IntegrationEditFormModule from "~/components/integration/embedded-integration-edit-form";
import type { EmbeddedIntegrationEditFormProps } from "~/components/integration/embedded-integration-edit-form";

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

  return (
    <Component
      {...props}
      innerProps={{
        ...props.innerProps,
        integrationData: combinedIntegrationData,
        integrationEditForm: LazyIntegrationEditForm,
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
  presentation: "inspector",
  withOverlay: false,
  size: modalSizeForm,
  closeOnClickOutside: false,
});
