"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getDefaultZIndex, Modal } from "@mantine/core";
import { randomId, useIsomorphicEffect } from "@mantine/hooks";

import type { stringOrTranslation } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { ConfirmModalProps } from "./confirm-modal";
import { ConfirmModal } from "./confirm-modal";
import type { ModalsState, ModalStateWithReference } from "./reducer";
import { modalReducer } from "./reducer";
import type { inferInnerProps, ModalActions, ModalDefinition } from "./type";
import presentationClasses from "./modal-presentation.module.css";
import { getModalPresentationClassNames } from "./modal-presentation";

interface ModalContextProps {
  openModalInner: <TModal extends ModalDefinition>(props: {
    modal: TModal;
    innerProps: inferInnerProps<TModal>;
    options: OpenModalOptions;
  }) => void;
  closeModal: (id: string) => void;
  capturePresentationOwner: (id: string) => ReturnType<ModalActions["capturePresentationOwner"]>;
}

export const ModalContext = createContext<ModalContextProps | null>(null);

export const ModalProvider = ({ children }: PropsWithChildren) => {
  const owner = useRef<{
    state: ModalsState;
    activation: bigint;
    idSequence: bigint;
    active: boolean;
  }>({
    state: { modals: [], current: null },
    activation: 0n,
    idSequence: 0n,
    active: true,
  });
  const [state, setState] = useState<ModalsState>(owner.current.state);

  useIsomorphicEffect(() => {
    const current = owner.current;
    current.active = true;
    return () => {
      current.active = false;
      current.activation += 1n;
    };
  }, []);

  const dispatch = useCallback((action: Parameters<typeof modalReducer>[1]) => {
    const current = owner.current;
    if (!current.active) return;
    const previous = current.state;
    const next = modalReducer(previous, action);
    if (next === previous) return;
    const removed = previous.modals.filter((modal) => !next.modals.includes(modal)).toReversed();
    const previousLayer = previous.modals.find((modal) => modal === previous.current);
    const nextLayer = next.modals.find((modal) => modal === next.current);
    current.state = next;
    if (previousLayer !== nextLayer) current.activation += 1n;
    setState(next);

    const failures: unknown[] = [];
    for (const modal of removed) {
      try {
        modal.props.onClose?.();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) throw new AggregateError(failures, "Modal close callbacks failed");
  }, []);

  const capturePresentationOwner = useCallback<ModalContextProps["capturePresentationOwner"]>((id) => {
    const current = owner.current;
    const instance = current.state.modals.find((modal) => modal.id === id);
    const activation = current.activation;
    const wasCurrent = current.active && instance !== undefined && current.state.current === instance;
    return {
      isCurrent: () =>
        wasCurrent &&
        current.active &&
        current.activation === activation &&
        instance !== undefined &&
        current.state.current === instance &&
        current.state.modals.includes(instance),
    };
  }, []);

  const closeModal = useCallback(
    (id: string, canceled?: boolean) => {
      dispatch({ type: "CLOSE", modalId: id, canceled });
    },
    [dispatch],
  );

  const openModalInner: ModalContextProps["openModalInner"] = useCallback(
    ({ modal, innerProps, options }) => {
      owner.current.idSequence += 1n;
      const id = `${randomId()}-${owner.current.idSequence}`;
      const { title, ...rest } = options;
      dispatch({
        type: "OPEN",
        modal: {
          id,
          modal,
          props: {
            ...modal.options,
            ...rest,
            defaultTitle: title ?? modal.options.defaultTitle,
            innerProps,
          },
        },
      });
      return id;
    },
    [dispatch],
  );

  const handleCloseModal = useCallback(
    (modal: ModalStateWithReference) => {
      const captured = capturePresentationOwner(modal.id);
      if (!captured.isCurrent()) return;
      const canClose = modal.reference.onCloseRequest();
      if (canClose && captured.isCurrent()) closeModal(modal.id);
    },
    [capturePresentationOwner, closeModal],
  );

  const activeModals = state.modals.filter((modal) => modal.id === state.current?.id || modal.props.keepMounted);

  return (
    <ModalContext.Provider value={{ openModalInner, closeModal, capturePresentationOwner }}>
      {activeModals.map((modal) => (
        <ActiveModal key={modal.id} modal={modal} state={state} handleCloseModal={handleCloseModal} />
      ))}

      {children}
    </ModalContext.Provider>
  );
};

interface ActiveModalProps {
  modal: ModalStateWithReference;
  state: ModalsState;
  handleCloseModal: (modal: ModalStateWithReference) => void;
}

const ActiveModal = ({ modal, state, handleCloseModal }: ActiveModalProps) => {
  const t = useI18n();

  // The below code is used to animate the modal when it opens (using the transition)
  // It is necessary as transition is not working when the modal is directly mounted and run
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setOpened(true), 0);
    return () => clearTimeout(timeout);
  }, []);

  const { defaultTitle: _ignored, presentation, ...otherModalProps } = modal.reference.modalProps;
  const presentationClassNames = getModalPresentationClassNames(presentation, {
    inner: presentationClasses.inspectorInner,
    content: presentationClasses.inspectorContent,
  });

  const handleClose = useCallback(() => {
    handleCloseModal(modal);
  }, [handleCloseModal, modal]);

  return (
    <Modal
      key={modal.id}
      zIndex={getDefaultZIndex("modal") + 1}
      style={{
        userSelect: modal.id === state.current?.id ? undefined : "none",
      }}
      styles={{
        title: {
          fontSize: "1.25rem",
          fontWeight: 500,
        },
        inner: {
          display: modal.id === state.current?.id ? undefined : "none",
        },
      }}
      trapFocus={modal.id === state.current?.id}
      classNames={presentationClassNames}
      {...otherModalProps}
      title={translateIfNecessary(t, modal.props.defaultTitle)}
      opened={opened}
      onClose={handleClose}
    >
      {modal.reference.content}
    </Modal>
  );
};

interface OpenModalOptions {
  keepMounted?: boolean;
  onClose?: () => void;
  title?: stringOrTranslation;
}

export const useModalAction = <TModal extends ModalDefinition>(modal: TModal) => {
  const context = useContext(ModalContext);

  if (!context) throw new Error("ModalContext is not provided");

  return {
    openModal: (innerProps: inferInnerProps<TModal>, options: OpenModalOptions | void) => {
      // void actually is undefined
      context.openModalInner({ modal, innerProps, options: options ?? {} });
    },
  };
};

export const useConfirmModal = () => {
  const { openModal } = useModalAction(ConfirmModal);

  return {
    openConfirmModal: (props: ConfirmModalProps, options?: Pick<OpenModalOptions, "onClose">) =>
      openModal(props, { title: props.title, onClose: options?.onClose }),
  };
};
