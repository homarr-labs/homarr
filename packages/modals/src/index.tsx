"use client";

import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from "react";
import { randomId } from "@mantine/hooks";

import type { stringOrTranslation } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { getDefaultZIndex, Modal } from "@homarr/ui";

import type { ConfirmModalProps } from "./confirm-modal";
import { ConfirmModal } from "./confirm-modal";
import { modalReducer } from "./reducer";
import type { inferInnerProps, ModalDefinition } from "./type";

interface ModalContextProps {
  openModalInner: <TModal extends ModalDefinition>(props: {
    modal: TModal;
    innerProps: inferInnerProps<TModal>;
    options: OpenModalOptions;
  }) => void;
  closeModal: (id: string) => void;
}

export const ModalContext = createContext<ModalContextProps | null>(null);

export const ModalProvider = ({ children }: PropsWithChildren) => {
  const t = useI18n();
  const [state, dispatch] = useReducer(modalReducer, {
    modals: [],
    current: null,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const closeModal = useCallback(
    (id: string, canceled?: boolean) => {
      dispatch({ type: "CLOSE", modalId: id, canceled });
    },
    [stateRef, dispatch],
  );

  const openModalInner: ModalContextProps["openModalInner"] = useCallback(
    ({ modal, innerProps, options }) => {
      const id = randomId();
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

  const activeModals = state.modals.filter(
    (modal) => modal.id === state.current?.id || modal.props.keepMounted,
  );

  return (
    <ModalContext.Provider value={{ openModalInner, closeModal }}>
      {activeModals.map((modal) => (
        <Modal
          key={modal.id}
          zIndex={getDefaultZIndex("modal") + 1}
          display={modal.id === state.current?.id ? undefined : "none"}
          style={{
            userSelect: modal.id === state.current?.id ? undefined : "none",
          }}
          styles={{
            title: {
              fontSize: "1.25rem",
              fontWeight: 500,
            },
          }}
          trapFocus={modal.id === state.current?.id}
          {...modal.reference.modalProps}
          title={translateIfNecessary(t, modal.props.defaultTitle)}
          opened={state.modals.length > 0}
          onClose={() => closeModal(state.current!.id)}
        >
          {modal.reference.content}
        </Modal>
      ))}

      {children}
    </ModalContext.Provider>
  );
};

interface OpenModalOptions {
  keepMounted?: boolean;
  title?: stringOrTranslation;
}

export const useModalAction = <TModal extends ModalDefinition>(
  modal: TModal,
) => {
  const context = useContext(ModalContext);

  if (!context) throw new Error("ModalContext is not provided");

  return {
    openModal: (
      innerProps: inferInnerProps<TModal>,
      options: OpenModalOptions | void,
    ) => {
      context.openModalInner({ modal, innerProps, options: options ?? {} });
    },
  };
};

export const useConfirmModal = () => {
  const { openModal } = useModalAction(ConfirmModal);

  return {
    openConfirmModal: (props: ConfirmModalProps) =>
      openModal(props, { title: props.title }),
  };
};
