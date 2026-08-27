"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Button, Menu } from "@mantine/core";
import type { ActionIconProps, ButtonProps, ElementProps, MenuItemProps } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

const confirmationTimeout = 4_000;

const visuallyHidden = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  whiteSpace: "nowrap" as const,
  width: 1,
};

interface InlineConfirmActionOptions {
  confirmLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  timeout?: number;
}

const useInlineConfirmAction = ({
  confirmLabel,
  onConfirm,
  disabled = false,
  pending = false,
  timeout = confirmationTimeout,
}: InlineConfirmActionOptions) => {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setConfirming(false);
  }, []);

  useEffect(() => {
    if (!confirming) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionRef.current?.contains(event.target)) reset();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") reset();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    timeoutRef.current = setTimeout(reset, timeout);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [confirming, reset, timeout]);

  useEffect(() => {
    if (disabled || pending) reset();
  }, [disabled, pending, reset]);

  const handleClick = useCallback(async () => {
    if (disabled || pending || submitting) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
      reset();
    }
  }, [confirming, disabled, onConfirm, pending, reset, submitting]);

  const handleBlur = useCallback(() => reset(), [reset]);

  return {
    actionRef,
    confirming,
    confirmLabel,
    handleBlur,
    handleClick,
    reset,
    submitting,
  };
};

type InlineConfirmButtonProps = Omit<ButtonProps, "children" | "disabled" | "loading" | "onClick"> &
  ElementProps<"button", "color" | "disabled" | "onClick"> &
  InlineConfirmActionOptions & {
    children: ReactNode;
    loading?: boolean;
  };

export const InlineConfirmButton = ({
  children,
  confirmLabel,
  onConfirm,
  disabled,
  pending,
  loading,
  timeout,
  variant,
  ...props
}: InlineConfirmButtonProps) => {
  const action = useInlineConfirmAction({ confirmLabel, onConfirm, disabled, pending: pending || loading, timeout });
  const label = action.confirming ? confirmLabel : children;
  let nextVariant = variant;
  if (action.confirming) nextVariant = "filled";

  return (
    <>
      <Button
        {...props}
        ref={action.actionRef}
        variant={nextVariant}
        disabled={disabled || pending || action.submitting}
        loading={loading || action.submitting}
        onClick={() => void action.handleClick().catch(() => undefined)}
        onBlur={action.handleBlur}
        aria-label={typeof label === "string" ? label : undefined}
        data-confirming={action.confirming || undefined}
      >
        {label}
      </Button>
      <span aria-live="polite" style={visuallyHidden}>
        {action.confirming ? confirmLabel : null}
      </span>
    </>
  );
};

type InlineConfirmActionIconProps = Omit<ActionIconProps, "children" | "disabled" | "loading" | "onClick"> &
  InlineConfirmActionOptions & {
    "aria-label"?: string;
    children: ReactNode;
    confirmationAriaLabel?: string;
    confirmationChildren?: ReactNode;
    loading?: boolean;
    title?: string;
  };

export const InlineConfirmActionIcon = ({
  children,
  confirmLabel,
  confirmationAriaLabel,
  confirmationChildren,
  onConfirm,
  disabled,
  pending,
  loading,
  timeout,
  variant,
  "aria-label": ariaLabel,
  ...props
}: InlineConfirmActionIconProps) => {
  const action = useInlineConfirmAction({ confirmLabel, onConfirm, disabled, pending: pending || loading, timeout });
  const nextAriaLabel = action.confirming
    ? (confirmationAriaLabel ?? (typeof confirmLabel === "string" ? confirmLabel : ariaLabel))
    : ariaLabel;
  let nextVariant = variant;
  if (action.confirming) nextVariant = "filled";
  let nextChildren = children;
  if (action.confirming) nextChildren = confirmationChildren ?? <IconCheck size="1rem" />;

  return (
    <>
      <ActionIcon
        {...props}
        ref={action.actionRef}
        variant={nextVariant}
        disabled={disabled || pending || action.submitting}
        loading={loading || action.submitting}
        onClick={() => void action.handleClick().catch(() => undefined)}
        onBlur={action.handleBlur}
        aria-label={nextAriaLabel}
        data-confirming={action.confirming || undefined}
      >
        {nextChildren}
      </ActionIcon>
      <span aria-live="polite" style={visuallyHidden}>
        {action.confirming ? confirmLabel : null}
      </span>
    </>
  );
};

type InlineConfirmMenuItemProps = Omit<MenuItemProps, "children" | "closeMenuOnClick" | "disabled" | "onClick"> &
  InlineConfirmActionOptions & {
    children: ReactNode;
  };

export const InlineConfirmMenuItem = ({
  children,
  confirmLabel,
  onConfirm,
  disabled,
  pending,
  timeout,
  ...props
}: InlineConfirmMenuItemProps) => {
  const action = useInlineConfirmAction({ confirmLabel, onConfirm, disabled, pending, timeout });
  const label = action.confirming ? confirmLabel : children;

  return (
    <>
      <Menu.Item
        {...props}
        ref={action.actionRef}
        disabled={disabled || pending || action.submitting}
        closeMenuOnClick={action.confirming}
        onClick={() => void action.handleClick().catch(() => undefined)}
        aria-label={typeof label === "string" ? label : undefined}
        data-confirming={action.confirming || undefined}
      >
        {label}
      </Menu.Item>
      <span aria-live="polite" style={visuallyHidden}>
        {action.confirming ? confirmLabel : null}
      </span>
    </>
  );
};
