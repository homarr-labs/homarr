"use client";

import { Suspense, use } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";

import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeForm } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";
import type { WidgetEditModalProps } from "@homarr/widgets/modals";

let widgetEditModalPromise: Promise<typeof import("@homarr/widgets/modals")> | undefined;

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

interface LazyWidgetEditModalContentProps {
  actions: { closeModal: () => void };
  innerProps: WidgetEditModalProps<WidgetKind>;
}

const LazyWidgetEditModalContent = (props: LazyWidgetEditModalContentProps) => {
  const { WidgetEditModal } = use(loadWidgetEditModal());
  const Component = WidgetEditModal.component;
  return <Component {...props} />;
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
