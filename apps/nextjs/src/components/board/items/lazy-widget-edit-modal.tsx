"use client";

import { Suspense, use } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";

import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeForm } from "@homarr/modals";
import { useModalAction } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";
import type * as WidgetModalsModule from "@homarr/widgets/modals";
import type { WidgetEditModalProps } from "@homarr/widgets/modals";

import type * as IntegrationEditModalModule from "~/components/integration/embedded-integration-edit-modal";
import type { EmbeddedIntegrationEditModalProps } from "~/components/integration/embedded-integration-edit-modal";

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

let integrationEditModalPromise: Promise<typeof IntegrationEditModalModule> | undefined;

const loadIntegrationEditModal = () => {
  if (integrationEditModalPromise) return integrationEditModalPromise;

  const currentPromise = import("~/components/integration/embedded-integration-edit-modal");
  integrationEditModalPromise = currentPromise;
  void currentPromise.catch(() => {
    if (integrationEditModalPromise === currentPromise) integrationEditModalPromise = undefined;
  });
  return currentPromise;
};

const LazyIntegrationEditModalContent = (props: {
  actions: { closeModal: () => void };
  innerProps: EmbeddedIntegrationEditModalProps;
}) => {
  const { EmbeddedIntegrationEditModal } = use(loadIntegrationEditModal());
  const Component = EmbeddedIntegrationEditModal.component;
  return <Component {...props} />;
};

const LazyIntegrationEditModal = createModal<EmbeddedIntegrationEditModalProps>((props) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <Center py="xl">
        <WidgetError
          error={error}
          resetErrorBoundary={() => {
            integrationEditModalPromise = undefined;
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
      <LazyIntegrationEditModalContent {...props} />
    </Suspense>
  </ErrorBoundary>
)).withOptions({
  defaultTitle: (t) => t("item.edit.tab.integration"),
  size: modalSizeForm,
  presentation: "inspector",
  closeOnClickOutside: true,
});

interface LazyWidgetEditModalContentProps {
  actions: { closeModal: () => void };
  innerProps: WidgetEditModalProps<WidgetKind>;
}

const LazyWidgetEditModalContent = (props: LazyWidgetEditModalContentProps) => {
  const { WidgetEditModal } = use(loadWidgetEditModal());
  const Component = WidgetEditModal.component;
  const { openModal: openIntegrationEditModal } = useModalAction(LazyIntegrationEditModal);
  return (
    <Component
      {...props}
      innerProps={{
        ...props.innerProps,
        onEditIntegration: (integrationId) =>
          openIntegrationEditModal({
            integrationId,
            onSuccess: props.innerProps.onIntegrationSaved,
          }),
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
  size: modalSizeForm,
  presentation: "inspector",
  closeOnClickOutside: false,
});
