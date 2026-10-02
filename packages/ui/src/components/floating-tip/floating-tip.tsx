"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, createVarsResolver, factory, Portal, rem, Transition, useProps, useStyles } from "@mantine/core";
import type { AlertProps, BoxProps, ElementProps, Factory, MantineTransition, StylesApiProps } from "@mantine/core";

import classes from "./floating-tip.module.css";

export type FloatingTipStylesNames = "root" | "alert";
export type FloatingTipCssVariables = {
  root: "--floating-tip-bottom" | "--floating-tip-max-width" | "--floating-tip-z-index";
};

interface FloatingTipBaseProps
  extends BoxProps, StylesApiProps<FloatingTipFactory>, Omit<ElementProps<"div">, "title"> {
  /** Controls whether this tip cycle should run. */
  opened: boolean;
  /** Delay before the tip appears, in milliseconds. */
  showDelay?: number;
  /** Time the tip remains visible, in milliseconds. Set to `null` to keep it open. */
  dismissAfter?: number | null;
  /** Enter and exit animation duration, in milliseconds. */
  transitionDuration?: number;
  /** Mantine transition used to show and hide the tip. */
  transition?: MantineTransition;
  /** Distance from the bottom edge of the viewport. */
  bottomOffset?: number | string;
  /** Maximum width of the alert. */
  maxWidth?: number | string;
  /** Stack order of the floating tip. */
  zIndex?: number;
  /** Props forwarded to the underlying Mantine Alert. */
  alertProps?: Omit<
    AlertProps,
    "children" | "classNames" | "closeButtonLabel" | "onClose" | "styles" | "withCloseButton"
  >;
  /** Called when the user closes the tip. */
  onDismiss?: () => void;
}

type FloatingTipCloseProps =
  | { closable: true; closeButtonLabel: string }
  | { closable?: false; closeButtonLabel?: never };

type FloatingTipPersistenceProps =
  | { rememberDismissal: true; storageKey: string }
  | { rememberDismissal?: false; storageKey?: never };

export type FloatingTipProps = FloatingTipBaseProps & FloatingTipCloseProps & FloatingTipPersistenceProps;

export type FloatingTipFactory = Factory<{
  props: FloatingTipProps;
  ref: HTMLDivElement;
  stylesNames: FloatingTipStylesNames;
  vars: FloatingTipCssVariables;
}>;

const defaultProps = {
  showDelay: 0,
  dismissAfter: null,
  transitionDuration: 200,
  transition: "slide-up",
  bottomOffset: 24,
  maxWidth: 520,
  zIndex: 1000,
  closable: false,
  rememberDismissal: false,
} satisfies Partial<FloatingTipProps>;

const toCssSize = (value: number | string | undefined) => (typeof value === "number" ? rem(value) : value);

const varsResolver = createVarsResolver<FloatingTipFactory>((_theme, { bottomOffset, maxWidth, zIndex }) => ({
  root: {
    "--floating-tip-bottom": toCssSize(bottomOffset),
    "--floating-tip-max-width": toCssSize(maxWidth),
    "--floating-tip-z-index": zIndex?.toString(),
  },
}));

const getDismissalStorageKey = (storageKey: string) => `homarr:floating-tip:${storageKey}`;

export const FloatingTip = factory<FloatingTipFactory>((_props) => {
  const props = useProps("FloatingTip", defaultProps, _props);
  const {
    ref,
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    opened,
    showDelay,
    dismissAfter,
    transitionDuration,
    transition,
    bottomOffset: _bottomOffset,
    maxWidth: _maxWidth,
    zIndex: _zIndex,
    closable,
    closeButtonLabel,
    rememberDismissal,
    storageKey,
    alertProps,
    onDismiss,
    children,
    ...others
  } = props;
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    if (dismissTimerRef.current !== null) window.clearTimeout(dismissTimerRef.current);
    showTimerRef.current = null;
    dismissTimerRef.current = null;
  }, []);

  useEffect(() => {
    clearTimers();
    setVisible(false);

    if (!opened) return;

    if (rememberDismissal) {
      try {
        if (window.localStorage.getItem(getDismissalStorageKey(storageKey)) === "dismissed") return;
      } catch {
        // Storage can be unavailable in private browsing or hardened environments.
      }
    }

    showTimerRef.current = window.setTimeout(() => {
      setVisible(true);
      showTimerRef.current = null;

      if (dismissAfter !== null) {
        dismissTimerRef.current = window.setTimeout(() => {
          setVisible(false);
          dismissTimerRef.current = null;
        }, dismissAfter);
      }
    }, showDelay);

    return clearTimers;
  }, [clearTimers, dismissAfter, opened, rememberDismissal, showDelay, storageKey]);

  const handleDismiss = () => {
    clearTimers();
    setVisible(false);

    if (rememberDismissal) {
      try {
        window.localStorage.setItem(getDismissalStorageKey(storageKey), "dismissed");
      } catch {
        // The tip still closes for this render even when persistence is unavailable.
      }
    }

    onDismiss?.();
  };

  const getStyles = useStyles<FloatingTipFactory>({
    name: "FloatingTip",
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    attributes,
    varsResolver,
  });

  return (
    <Portal>
      <Transition mounted={visible} transition={transition} duration={transitionDuration} timingFunction="ease">
        {(transitionStyle) => {
          const rootStyles = getStyles("root");

          return (
            <Box ref={ref} {...others} {...rootStyles} style={[rootStyles.style, transitionStyle]}>
              <Alert
                {...alertProps}
                {...getStyles("alert")}
                withCloseButton={closable}
                closeButtonLabel={closeButtonLabel}
                onClose={handleDismiss}
              >
                {children}
              </Alert>
            </Box>
          );
        }}
      </Transition>
    </Portal>
  );
});

FloatingTip.displayName = "@homarr/ui/FloatingTip";
FloatingTip.classes = classes;
