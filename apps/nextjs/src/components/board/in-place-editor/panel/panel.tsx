"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { Box, FocusTrap, MantineThemeProvider, Paper, Portal, Transition } from "@mantine/core";

import type { InPlaceEditorPanelProps } from "./types";
import { ConfigureStep, CreateAppStep } from "./card-steps";
import classes from "./panel.module.css";
import { PickStep } from "./pick-step";
import { getPlacement } from "./placement";
import type { Placement, RectLike, ViewportSize } from "./placement";

const pickWidth = 360;
const cardWidth = 404;
const borderSize = 2;

const getViewport = (): ViewportSize => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
  top: window.visualViewport?.offsetTop ?? 0,
});

const useViewport = () => {
  const [viewport, setViewport] = useState(getViewport);

  useEffect(() => {
    const update = () => setViewport(getViewport());
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return viewport;
};

const useMeasuredHeight = () => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!element) return;
    setHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => {
      const next = element.offsetHeight;
      setHeight((previous) => (previous === next ? previous : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, height };
};

const useStableRect = (anchorRect: DOMRect | null, viewport: ViewportSize) => {
  const [rect, setRect] = useState<RectLike | null>(anchorRect);

  useLayoutEffect(() => {
    if (!rect && anchorRect) setRect(anchorRect);
  }, [anchorRect, rect]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const area = document.querySelector("[data-add-in-place-area]");
      if (area) setRect(area.getBoundingClientRect());
    });
    return () => cancelAnimationFrame(frame);
  }, [viewport.width, viewport.height, viewport.top]);

  return rect;
};

interface StepTransitionProps {
  mounted: boolean;
  children: ReactNode;
}

const StepTransition = ({ mounted, children }: StepTransitionProps) => (
  <Transition mounted={mounted} transition="fade" duration={220} exitDuration={0} timingFunction="ease">
    {(styles) => (
      <Box className={classes.step} style={styles}>
        {children}
      </Box>
    )}
  </Transition>
);

export const InPlaceEditorPanel = (props: InPlaceEditorPanelProps) => {
  const { step, session, anchorRect, presentation, actions, panelProps } = props;
  const isSheet = presentation === "sheet";
  const isPick = step === "pick";
  const rootRef = useRef<HTMLDialogElement>(null);
  const dropdownOpenRef = useRef(false);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const viewport = useViewport();
  const stableRect = useStableRect(anchorRect, viewport);
  const rect = isPick ? stableRect : anchorRect;
  const { ref: measureRef, height: contentHeight } = useMeasuredHeight();
  const pickPlacementRef = useRef<{ key: string; placement: Placement } | null>(null);

  useEffect(() => {
    const captureEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      dropdownOpenRef.current =
        !isPick &&
        ((target instanceof HTMLElement && Boolean(target.closest('[aria-expanded="true"], [data-expanded="true"]'))) ||
          Array.from(
            rootRef.current?.querySelectorAll(
              ".mantine-Combobox-dropdown, .mantine-Popover-dropdown, .mantine-ColorInput-dropdown",
            ) ?? [],
          ).some((element) => element.getClientRects().length > 0));
    };
    window.addEventListener("keydown", captureEscape, true);
    return () => window.removeEventListener("keydown", captureEscape, true);
  }, [isPick]);

  useLayoutEffect(() => {
    if (!isSheet) return;
    if (window.innerHeight - viewport.height - (viewport.top ?? 0) > 100) return;
    const frame = requestAnimationFrame(() => {
      const area = document.querySelector("[data-add-in-place-area]");
      if (area) window.scrollBy({ top: area.getBoundingClientRect().top - 76, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    isSheet,
    session.sectionId,
    session.editItemId,
    anchorRect?.width,
    anchorRect?.height,
    viewport.height,
    viewport.top,
  ]);

  useLayoutEffect(() => {
    if (!isSheet) return;
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      rootRef.current?.contains(focused) &&
      focused.matches("input, textarea, select, [contenteditable=true]")
    )
      focused.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [isSheet, viewport.height]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && step === "configure") {
      event.preventDefault();
      event.stopPropagation();
      document.getElementById(props.editorFormId)?.closest("form")?.requestSubmit();
      return;
    }
    if (event.defaultPrevented) return;
    if (event.key === "Enter" && step === "configure") {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('textarea, select, button, a, [role="button"], [role="option"]'))
      )
        return;
      if (
        target instanceof HTMLElement &&
        target.closest('[role="combobox"], [role="listbox"], [aria-haspopup="listbox"]')
      ) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      document.getElementById(props.editorFormId)?.closest("form")?.requestSubmit();
      return;
    }
    if (event.key === "Escape" && dropdownOpenRef.current) {
      event.stopPropagation();
      return;
    }
    props.onKeyDown(event);
  };

  let placement =
    rect &&
    getPlacement({
      rect,
      width: isPick ? pickWidth : cardWidth,
      contentHeight: contentHeight + borderSize,
      viewport,
      isPick,
    });

  if (isPick && placement && contentHeight > 0) {
    const key = `${viewport.width}:${viewport.height}:${viewport.top}:${rect?.left}:${rect?.top}:${rect?.width}:${rect?.height}`;
    if (pickPlacementRef.current?.key !== key) pickPlacementRef.current = { key, placement };
    placement = pickPlacementRef.current.placement;
  }

  if (!isSheet && (!rect || !placement)) return null;

  const content = (
    <>
      <StepTransition mounted={step === "pick"}>
        <PickStep
          useCatalog={props.useCatalog}
          canCreateApp={props.canCreateApp}
          actions={actions}
          AreaSizeInputs={props.AreaSizeInputs}
          onKeyDown={props.onKeyDown}
          flipped={!isSheet && (placement?.flipped ?? false)}
        />
      </StepTransition>
      <StepTransition mounted={step === "configure"}>
        <ConfigureStep
          session={session}
          actions={actions}
          useCatalog={props.useCatalog}
          BoundEditorForm={props.BoundEditorForm}
          AreaSizeInputs={props.AreaSizeInputs}
          editorFormId={props.editorFormId}
        />
      </StepTransition>
      <StepTransition mounted={step === "createApp"}>
        <CreateAppStep actions={actions} CreateAppForm={props.CreateAppForm} />
      </StepTransition>
    </>
  );

  const keyboardInset = Math.max(0, window.innerHeight - viewport.height - (viewport.top ?? 0));
  let sheetHeight = Math.min(viewport.height * 0.74, 640);
  if (isPick) sheetHeight = Math.min(viewport.height * 0.8, 640);
  if (keyboardInset > 100) sheetHeight = viewport.height - 12;
  const maxHeight = isSheet ? sheetHeight : placement?.maxHeight;
  const style: CSSProperties = isSheet
    ? { bottom: keyboardInset, maxHeight }
    : { left: placement?.left, top: placement?.top, width: isPick ? pickWidth : cardWidth, maxHeight };

  return (
    <>
      {isSheet && <Box h={sheetHeight} aria-hidden />}
      <FocusTrap innerRef={rootRef}>
        <Box
          component="dialog"
          open
          {...panelProps}
          tabIndex={-1}
          aria-modal="true"
          aria-label={isPick ? "Add widget" : "Widget editor"}
          className={isSheet ? classes.sheetRoot : classes.root}
          style={style}
          data-docked={placement?.side === "overlap" || undefined}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && step === "configure") {
              handleKeyDown(event);
              return;
            }
          }}
          onKeyDown={handleKeyDown}
        >
          {placement && (placement.side === "left" || placement.side === "right") && !isSheet && (
            <Box
              className={classes.notch}
              data-side={placement.side}
              style={{ top: Math.min(placement.notchY, Math.max(24, contentHeight - 24)) - 6 }}
            />
          )}
          <MantineThemeProvider
            theme={{ components: { Portal: Portal.extend({ defaultProps: { target: portalTarget ?? undefined } }) } }}
          >
            <Paper className={classes.surface} withBorder shadow="xl" radius="lg">
              <Box
                ref={measureRef}
                className={classes.measure}
                style={{ maxHeight: (maxHeight ?? viewport.height) - borderSize }}
              >
                {content}
              </Box>
            </Paper>
          </MantineThemeProvider>
          <div ref={setPortalTarget} />
        </Box>
      </FocusTrap>
    </>
  );
};
