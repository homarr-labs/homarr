"use client";

import type { CSSProperties, PropsWithChildren, Ref } from "react";
import { Modal, VisuallyHidden } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";

import classes from "./advanced-focus.module.css";
import type { FocusClosePosition, FocusRect } from "./geometry";

interface AdvancedFocusManualSurfaceProps extends PropsWithChildren {
  opened: boolean;
  phase: "visible" | "closing";
  id: string;
  label: string;
  closeLabel: string;
  rect: FocusRect;
  closePosition: FocusClosePosition;
  sourceRect: FocusRect;
  radius: string | number;
  contentRef: Ref<HTMLDivElement>;
  onClose: () => void;
}

export const AdvancedFocusManualSurface = ({
  opened,
  phase,
  id,
  label,
  closeLabel,
  rect,
  closePosition,
  sourceRect,
  radius,
  contentRef,
  onClose,
  children,
}: AdvancedFocusManualSurfaceProps) => {
  const reduceMotion = useReducedMotion();
  const transitionDuration = reduceMotion ? 0 : 180;
  const geometryStyle = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    "--focus-translate-x": `${sourceRect.left - rect.left}px`,
    "--focus-translate-y": `${sourceRect.top - rect.top}px`,
    "--focus-scale-x": rect.width > 0 ? sourceRect.width / rect.width : 1,
    "--focus-scale-y": rect.height > 0 ? sourceRect.height / rect.height : 1,
  } as CSSProperties;
  const relativeClosePosition = {
    left: closePosition.left - rect.left,
    top: closePosition.top - rect.top,
  };

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      radius={radius}
      padding={0}
      shadow="none"
      zIndex="var(--homarr-z-index-widget-focus)"
      closeOnEscape={false}
      closeOnClickOutside
      lockScroll
      trapFocus
      returnFocus
      removeScrollProps={{ allowPinchZoom: true }}
      transitionProps={{ duration: transitionDuration, transition: "fade" }}
    >
      <Modal.Overlay
        data-advanced-focus-overlay
        backgroundOpacity={0.38}
        blur={0}
        className={`${classes.backdrop} ${classes.manualBackdrop} ${
          phase === "closing" ? classes.backdropClosing : ""
        }`}
      />
      <Modal.Content
        ref={contentRef}
        id={id}
        data-advanced-focus-surface
        className={`${classes.manualSurface} ${phase === "closing" ? classes.surfaceClosing : ""}`}
        style={geometryStyle}
      >
        <Modal.Title>
          <VisuallyHidden>{label}</VisuallyHidden>
        </Modal.Title>
        <Modal.CloseButton
          className={classes.closeButton}
          variant="default"
          size={44}
          aria-label={closeLabel}
          aria-controls={id}
          style={relativeClosePosition}
        />
        {children}
      </Modal.Content>
    </Modal.Root>
  );
};
