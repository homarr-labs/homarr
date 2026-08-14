"use client";

import { Suspense, use } from "react";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";

import { createModal, modalSizeForm } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";

import type { ItemMoveModalProps } from "./item-move-modal";

let itemMoveModalPromise: Promise<typeof import("./item-move-modal")> | undefined;

const loadItemMoveModal = () => {
  if (itemMoveModalPromise) return itemMoveModalPromise;

  const currentPromise = import("./item-move-modal");
  itemMoveModalPromise = currentPromise;
  void currentPromise.catch(() => {
    if (itemMoveModalPromise === currentPromise) itemMoveModalPromise = undefined;
  });
  return currentPromise;
};

export const preloadItemMoveModal = () => void loadItemMoveModal().catch(() => undefined);

interface LazyItemMoveModalContentProps {
  actions: { closeModal: () => void };
  innerProps: ItemMoveModalProps;
}

const LazyItemMoveModalContent = (props: LazyItemMoveModalContentProps) => {
  const { ItemMoveModal } = use(loadItemMoveModal());
  const Component = ItemMoveModal.component;
  return <Component {...props} />;
};

export const LazyItemMoveModal = createModal<ItemMoveModalProps>((props) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <Center py="xl">
        <WidgetError
          error={error}
          resetErrorBoundary={() => {
            itemMoveModalPromise = undefined;
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
      <LazyItemMoveModalContent {...props} />
    </Suspense>
  </ErrorBoundary>
)).withOptions({
  defaultTitle(t) {
    return t("item.moveResize.title");
  },
  size: modalSizeForm,
});
