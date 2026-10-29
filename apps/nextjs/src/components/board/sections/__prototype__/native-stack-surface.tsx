"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp, IconPencil, IconStack2 } from "@tabler/icons-react";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { getLogicalGridSize } from "~/components/board/layout";
import { BoardCanvasScaleScope } from "~/components/board/layout/scaled-board-canvas";
import canvasClasses from "~/components/board/layout/scaled-board-canvas.module.css";
import type { AdaptiveContainerPrototypeContextValue, SmartPage, StackVariant } from "./adaptive-container-context";
import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import classes from "./native-stack-surface.module.css";

export function getNativeStackFrameInset(variant: StackVariant) {
  if (variant === "B") return 88;
  if (variant === "C") return 120;
  return 0;
}

interface SurfaceProps extends PropsWithChildren {
  section: ContainerSectionItem;
}

/** Each presentation wraps Homarr's actual container and native widget grid. */
export function NativeSmartStackSurface({ section, children }: SurfaceProps) {
  const prototype = useAdaptiveContainerPrototype();
  if (!prototype || prototype.sectionId !== section.id) return children;
  if (prototype.previewHost) {
    return (
      <>
        <div className={classes.editingPlaceholder}>
          <IconPencil size="calc(26px * var(--board-canvas-ui-scale, 1))" />
          <strong>Editing {prototype.settings.title}</strong>
          <span>The live stack is in the editor.</span>
        </div>
        {createPortal(
          <ModalStackCanvas section={section} prototype={prototype}>
            {children}
          </ModalStackCanvas>,
          prototype.previewHost,
        )}
      </>
    );
  }
  return <StackPresentation prototype={prototype}>{children}</StackPresentation>;
}

function ModalStackCanvas({
  section,
  prototype,
  children,
}: SurfaceProps & { prototype: AdaptiveContainerPrototypeContextValue }) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const logicalWidth = getLogicalGridSize(section.width);
  const logicalHeight = getLogicalGridSize(section.height);
  let scale = 0.35;
  const availableWidth = Math.max(1, width - 28);
  const availableHeight = Math.max(1, height - 28);
  if (width > 0 && height > 0) {
    scale = Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight);
    // Keep native navigation readable for a tall Mobile layout; let its preview scroll vertically.
    scale = Math.max(scale, Math.min(280, availableWidth) / logicalWidth);
  }
  const scrollPreview = height > 0 && logicalHeight * scale > availableHeight;
  const style = {
    width: logicalWidth,
    height: logicalHeight,
    zoom: scale,
    "--board-canvas-ui-scale": 1 / scale,
    "--board-canvas-inverse-scale": 1 / scale,
  } as CSSProperties;
  return (
    <div
      ref={ref}
      className={classes.modalCanvas}
      data-stack-native-preview
      data-scroll-preview={scrollPreview || undefined}
    >
      <div className={classes.modalSizer} style={{ width: logicalWidth * scale, height: logicalHeight * scale }}>
        <div className={canvasClasses.canvas} style={style} data-board-canvas-content>
          <BoardCanvasScaleScope scale={scale}>
            <StackPresentation prototype={prototype}>{children}</StackPresentation>
          </BoardCanvasScaleScope>
        </div>
      </div>
    </div>
  );
}

function getNeighbor(pages: SmartPage[], selectedId: string, direction: number) {
  const selected = pages.findIndex((page) => page.id === selectedId);
  const index = (selected + direction + pages.length) % pages.length;
  return pages[index] ?? pages[0];
}

function StackPresentation({
  prototype,
  children,
}: PropsWithChildren<{ prototype: AdaptiveContainerPrototypeContextValue }>) {
  const surfaceRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const priorPage = useRef(prototype.selectedPageId);
  const touchStart = useRef<number | null>(null);
  const wheelAt = useRef(0);
  const variant = prototype.variant;
  const nextPage = prototype.nextPage;
  const pages = prototype.pages.filter((page) => prototype.settings.enabledPages.includes(page.id));
  const previous = getNeighbor(pages, prototype.selectedPageId, -1);
  const next = getNeighbor(pages, prototype.selectedPageId, 1);
  const selectedIndex = pages.findIndex((page) => page.id === prototype.selectedPageId);
  const editing = prototype.inlineEditing || prototype.editorOpened;

  useEffect(() => {
    if (priorPage.current === prototype.selectedPageId) return;
    const previousIndex = pages.findIndex((page) => page.id === priorPage.current);
    priorPage.current = prototype.selectedPageId;
    if (prototype.settings.transition === "instant" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const body = surfaceRef.current?.querySelector<HTMLElement>("[data-board-container-body]");
    if (!body) return;
    let offset = "12%";
    if (selectedIndex < previousIndex) offset = "-12%";
    const animation = body.animate(
      [
        { opacity: 0, transform: `translateY(${offset})` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => animation.cancel();
  }, [prototype.selectedPageId, pages, prototype.settings.transition, selectedIndex]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() - wheelAt.current < 500 || Math.abs(event.deltaY) < 12) return;
      wheelAt.current = Date.now();
      nextPage(Math.sign(event.deltaY));
    };
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, [variant, nextPage]);

  const selectNeighbor = (direction: number) => prototype.nextPage(direction);
  const accent = `var(--mantine-color-${prototype.settings.accent}-6)`;
  const style = {
    "--stack-accent": accent,
    "--stack-frame-inset": `calc(${getNativeStackFrameInset(variant)}px * var(--board-canvas-ui-scale, 1))`,
  } as CSSProperties;

  return (
    <Box
      component="section"
      ref={surfaceRef}
      className={classes.stage}
      style={style}
      data-stack-variant={variant}
      data-stack-editing={editing || undefined}
      data-stack-selected-page={prototype.selectedPageId}
      aria-roledescription="carousel"
      aria-label={prototype.settings.title}
      onMouseEnter={() => prototype.setHovered(true)}
      onMouseLeave={() => prototype.setHovered(false)}
    >
      {variant === "A" && (
        <>
          <div className={classes.backSheet} data-layer="back" aria-hidden="true" />
          <div className={classes.backSheet} data-layer="front" aria-hidden="true" />
        </>
      )}
      {variant === "B" && previous && (
        <button
          className={classes.peek}
          data-direction="previous"
          onClick={() => selectNeighbor(-1)}
          aria-label={`Previous state: ${previous.label}`}
        >
          <IconChevronUp />
          <span>{previous.label}</span>
          <span className={classes.peekDetail}>{previous.description}</span>
        </button>
      )}
      <div className={classes.cardViewport}>
        {children}
        {variant === "A" && (
          <div
            ref={railRef}
            className={classes.verticalRail}
            aria-label="Stack states; swipe up or down"
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const last = event.changedTouches[0]?.clientY;
              if (touchStart.current === null || last === undefined) return;
              const distance = touchStart.current - last;
              touchStart.current = null;
              if (Math.abs(distance) > 32) selectNeighbor(Math.sign(distance));
            }}
          >
            <button aria-label="Previous stack state" onClick={() => selectNeighbor(-1)}>
              <IconChevronUp />
            </button>
            {pages.map((page, index) => (
              <button
                key={page.id}
                className={classes.dot}
                data-active={page.id === prototype.selectedPageId || undefined}
                aria-label={`${page.label}, state ${index + 1} of ${pages.length}`}
                aria-current={page.id === prototype.selectedPageId || undefined}
                onClick={() => prototype.manualSelectPage(page.id)}
              >
                <span />
              </button>
            ))}
            <button aria-label="Next stack state" onClick={() => selectNeighbor(1)}>
              <IconChevronDown />
            </button>
          </div>
        )}
      </div>
      {variant === "B" && next && (
        <button
          className={classes.peek}
          data-direction="next"
          onClick={() => selectNeighbor(1)}
          aria-label={`Next state: ${next.label}`}
        >
          <IconChevronDown />
          <span>{next.label}</span>
          <span className={classes.peekDetail}>{next.description}</span>
        </button>
      )}
      {variant === "C" && (
        <div className={classes.inspectorTray} aria-label="Configured stack states">
          {pages.map((page, index) => (
            <button
              key={page.id}
              className={classes.inspectorState}
              data-active={page.id === prototype.selectedPageId || undefined}
              onClick={() => prototype.manualSelectPage(page.id)}
              aria-pressed={page.id === prototype.selectedPageId}
            >
              <span className={classes.stateNumber}>{index + 1}</span>
              <span className={classes.stateDetails}>
                <strong>{page.label}</strong>
                <small>{page.description}</small>
                <small>
                  {page.score} relevance · {page.active ? "Active" : "Quiet"}
                </small>
              </span>
              <IconStack2 className={classes.stateIcon} />
            </button>
          ))}
        </div>
      )}
    </Box>
  );
}
