"use client";

import { Suspense, use } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeForm } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";
import type * as WidgetModalsModule from "@homarr/widgets/modals";
import type { WidgetEditModalProps } from "@homarr/widgets/modals";

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
  const Component = WidgetEditModal.component;
  return (
    <Component
      {...props}
      innerProps={{
        ...props.innerProps,
        integrationEditForm: LazyIntegrationEditForm,
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
  closeOnClickOutside: false,
});
