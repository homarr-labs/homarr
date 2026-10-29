"use client";

import type { ComponentProps } from "react";
import type { FallbackProps } from "react-error-boundary";
import dynamic from "next/dynamic";
import { Center, Loader } from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";

import { createModal } from "@homarr/modals";
import { WidgetError } from "@homarr/widgets/errors";

import type { ContainerEditModal } from "./container-edit-modal";

type ModalProps = ComponentProps<typeof ContainerEditModal.component>;

const Editor = dynamic(() => import("./container-edit-modal").then((module) => module.ContainerEditModal.component), {
  ssr: false,
  loading: () => (
    <Center mih={200}>
      <Loader />
    </Center>
  ),
});

const ContainerEditorError = ({ error, resetErrorBoundary }: FallbackProps) => (
  <WidgetError error={error} resetErrorBoundary={resetErrorBoundary} />
);

/** Keep the item picker and full settings forms out of the read-only board bundle. */
export const LazyContainerEditModal = createModal<ModalProps["innerProps"]>((props) => (
  <ErrorBoundary FallbackComponent={ContainerEditorError}>
    <Editor {...props} />
  </ErrorBoundary>
)).withOptions({
  defaultTitle: (t) => t("section.container.smart.edit"),
  size: "100rem",
  keepMounted: true,
  closeOnClickOutside: false,
});
