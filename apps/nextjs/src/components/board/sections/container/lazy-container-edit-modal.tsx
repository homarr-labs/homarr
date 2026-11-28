"use client";

import { createContext, useContext } from "react";
import type { ComponentProps, PropsWithChildren } from "react";
import type { FallbackProps } from "react-error-boundary";
import dynamic from "next/dynamic";
import { Button, Center, Group, Loader, Stack } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";

import { createModal, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { WidgetError } from "@homarr/widgets/errors";
import { widgetEditorModalStyles } from "@homarr/widgets/modals/styles";

import type { ContainerEditModal } from "./container-edit-modal";

type ModalProps = ComponentProps<typeof ContainerEditModal.component>;

const CloseContext = createContext<() => void>(() => undefined);

const Fallback = ({ children }: PropsWithChildren) => {
  const close = useContext(CloseContext);
  const t = useI18n("common.action");
  return (
    <Stack gap={0} mih={0} flex={1}>
      <Center mih={200} p="md">
        {children}
      </Center>
      <Group justify="flex-end" p="md">
        <Button variant="default" mih={44} onClick={close}>
          {t("cancel")}
        </Button>
      </Group>
    </Stack>
  );
};

const Editor = dynamic(() => import("./container-edit-modal").then((module) => module.ContainerEditModal.component), {
  ssr: false,
  loading: () => (
    <Fallback>
      <Loader />
    </Fallback>
  ),
});

const ContainerEditorError = ({ error, resetErrorBoundary }: FallbackProps) => (
  <Fallback>
    <WidgetError error={error} resetErrorBoundary={resetErrorBoundary} />
  </Fallback>
);

/** Keep the item picker and full settings forms out of the read-only board bundle. */
export const LazyContainerEditModal = createModal<ModalProps["innerProps"]>((props) => (
  <CloseContext.Provider value={props.actions.closeModal}>
    <ErrorBoundary FallbackComponent={ContainerEditorError}>
      <Editor {...props} />
    </ErrorBoundary>
  </CloseContext.Provider>
)).withOptions({
  defaultTitle: (t) => t("section.container.smart.edit"),
  size: "100rem",
  keepMounted: true,
  withCloseButton: false,
  styles: widgetEditorModalStyles,
  closeOnClickOutside: false,
});

export const useOpenContainerEditor = (section: { id: string; options: ModalProps["innerProps"]["value"] }) => {
  const { openModal } = useModalAction(LazyContainerEditModal);
  return (trigger: HTMLElement | null) => {
    openModal(
      { containerId: section.id, value: section.options },
      { onClose: () => requestAnimationFrame(() => trigger?.focus({ preventScroll: true })) },
    );
  };
};
