import { getDefaultZIndex, Modal } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import classes from "./global-tools.module.css";

export interface SourceModalFrame {
  readonly id: string;
  readonly title: string;
  readonly closeLabel: string;
  readonly content: ReactNode;
  readonly phase: "open" | "closing";
  readonly presentation?: "default" | "inspector";
  readonly options: Pick<
    ModalProps,
    | "size"
    | "fullScreen"
    | "centered"
    | "keepMounted"
    | "withCloseButton"
    | "scrollAreaComponent"
    | "yOffset"
    | "transitionProps"
    | "closeOnClickOutside"
    | "closeOnEscape"
  >;
  readonly onCloseRequest: () => boolean;
}

export interface SourceModalHostProps {
  readonly frames: readonly SourceModalFrame[];
  readonly currentId: string | null;
  readonly closeModal: (id: string) => void;
  readonly exitModal: (id: string) => void;
}

export function SourceModalHost({ frames, currentId, closeModal, exitModal }: SourceModalHostProps) {
  return frames
    .filter((frame) => frame.id === currentId || frame.options.keepMounted || frame.phase === "closing")
    .map((frame) => (
      <SourceModal
        key={frame.id}
        frame={frame}
        active={frame.id === currentId}
        closeModal={closeModal}
        exitModal={exitModal}
      />
    ));
}

function SourceModal({
  frame,
  active,
  closeModal,
  exitModal,
}: {
  readonly frame: SourceModalFrame;
  readonly active: boolean;
  readonly closeModal: SourceModalHostProps["closeModal"];
  readonly exitModal: SourceModalHostProps["exitModal"];
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(true);
  }, []);

  const opened = entered && active && frame.phase === "open";
  const onExitTransitionEnd = useModalExitCompletion({ id: frame.id, phase: frame.phase, opened, exitModal });

  const close = () => {
    if (active && frame.phase === "open" && frame.onCloseRequest()) closeModal(frame.id);
  };

  return (
    <Modal
      {...frame.options}
      opened={opened}
      onClose={close}
      onExitTransitionEnd={onExitTransitionEnd}
      title={frame.title}
      closeButtonProps={{ "aria-label": frame.closeLabel }}
      zIndex={getDefaultZIndex("modal") + 1}
      trapFocus={active}
      returnFocus={active}
      lockScroll={active}
      closeOnEscape={active && (frame.options.closeOnEscape ?? true)}
      closeOnClickOutside={active && (frame.options.closeOnClickOutside ?? true)}
      withOverlay={active}
      keepMountedMode="display-none"
      classNames={
        frame.presentation === "inspector"
          ? { inner: classes.inspectorInner, content: classes.inspectorContent }
          : undefined
      }
      styles={{ title: { fontSize: "1.25rem", fontWeight: 500 } }}
    >
      {frame.content}
    </Modal>
  );
}

interface ModalExitLifecycle {
  mounted: boolean;
  visibility: "visible" | "exiting" | "exited";
  finalized: boolean;
  id: string;
  phase: SourceModalFrame["phase"];
  exitModal: SourceModalHostProps["exitModal"];
}

function useModalExitCompletion({
  id,
  phase,
  opened,
  exitModal,
}: {
  readonly id: string;
  readonly phase: SourceModalFrame["phase"];
  readonly opened: boolean;
  readonly exitModal: SourceModalHostProps["exitModal"];
}) {
  const lifecycle = useRef<ModalExitLifecycle>({
    mounted: false,
    visibility: "exited",
    finalized: false,
    id,
    phase,
    exitModal,
  });

  const finalize = useCallback(() => {
    const current = lifecycle.current;
    if (!current.mounted || current.phase !== "closing" || current.visibility !== "exited" || current.finalized) return;
    current.finalized = true;
    current.exitModal(current.id);
  }, []);

  useIsomorphicEffect(() => {
    lifecycle.current.mounted = true;
    return () => {
      lifecycle.current.mounted = false;
    };
  }, []);

  useIsomorphicEffect(() => {
    const current = lifecycle.current;
    current.id = id;
    current.phase = phase;
    current.exitModal = exitModal;
    if (phase === "open") current.finalized = false;
    if (opened) current.visibility = "visible";
    else if (current.visibility === "visible") current.visibility = "exiting";
    finalize();
  }, [id, phase, opened, exitModal, finalize]);

  return useCallback(() => {
    const current = lifecycle.current;
    if (!current.mounted || current.visibility !== "exiting") return;
    current.visibility = "exited";
    finalize();
  }, [finalize]);
}
