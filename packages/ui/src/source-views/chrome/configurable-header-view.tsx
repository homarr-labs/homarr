"use client";

import type { ReactNode } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { AppShellHeader, Group } from "@mantine/core";

import type { ConfigurableHeaderViewProps, HeaderDisplay } from "./contracts";
import classes from "./configurable-header.module.css";

const floatingControlsIntroDurationMs = 5_000;
const floatingControlsDismissDelayMs = 900;

export const ConfigurableHeaderView = <TItem,>({
  visible,
  zones,
  desktopDisplay,
  getItemKey,
  renderItem,
  hasNavigation,
  burger,
  floatingUser,
  spotlight,
  actions,
}: ConfigurableHeaderViewProps<TItem>) => {
  const renderItems = (items: TItem[], display: HeaderDisplay) =>
    items.map((item) => <Fragment key={getItemKey(item)}>{renderItem(item, display)}</Fragment>);

  const mobileDisplay: HeaderDisplay = { search: "icon", logo: "logo" };

  return (
    <>
      <AppShellHeader
        maw="100vw"
        zIndex="var(--homarr-z-index-board-header)"
        className={classes.header}
        data-visible={visible}
        data-advanced-focus-background
        data-app-shell-header
      >
        <div className={classes.desktopContent}>
          <div className={classes.content}>
            <div className={classes.zone} data-zone="left">
              {hasNavigation ? burger : null}
              {renderItems(zones.left, desktopDisplay)}
            </div>
            <div className={classes.zone} data-zone="center">
              {renderItems(zones.center, desktopDisplay)}
            </div>
            <div className={classes.zone} data-zone="right">
              {renderItems(zones.right, desktopDisplay)}
              {actions ? <Group className={classes.contextActions}>{actions}</Group> : null}
            </div>
          </div>
        </div>
        <div className={classes.mobileContent}>
          <Group className={classes.mobileZone} data-zone="left" gap="xs" wrap="nowrap">
            {hasNavigation ? burger : null}
            {renderItems(zones.left, mobileDisplay)}
          </Group>
          <Group className={classes.mobileZone} data-zone="right" gap="xs" wrap="nowrap">
            {renderItems(zones.center, mobileDisplay)}
            {renderItems(zones.right, mobileDisplay)}
            {actions ? <Group className={classes.contextActions}>{actions}</Group> : null}
          </Group>
        </div>
      </AppShellHeader>
      {!visible ? (
        <FloatingHeaderControls>
          {hasNavigation ? burger : null}
          {floatingUser}
        </FloatingHeaderControls>
      ) : null}
      {spotlight}
    </>
  );
};

const FloatingHeaderControls = ({ children }: { children: ReactNode }) => {
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const isInteractingRef = useRef(false);
  const dismissTimeoutRef = useRef<number | null>(null);

  const clearDismissTimeout = () => {
    if (dismissTimeoutRef.current === null) return;
    window.clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = null;
  };

  const dismissSoon = () => {
    if (!isIntroComplete) return;
    clearDismissTimeout();
    dismissTimeoutRef.current = window.setTimeout(() => {
      if (!isInteractingRef.current) setIsVisible(false);
    }, floatingControlsDismissDelayMs);
  };

  const revealFromCorner = () => {
    if (!isIntroComplete) return;
    clearDismissTimeout();
    setIsVisible(true);
  };

  const startInteraction = () => {
    isInteractingRef.current = true;
    clearDismissTimeout();
    setIsVisible(true);
  };

  const endInteraction = () => {
    isInteractingRef.current = false;
    dismissSoon();
  };

  useEffect(() => {
    const introTimeout = window.setTimeout(() => {
      setIsIntroComplete(true);
      if (!isInteractingRef.current) setIsVisible(false);
    }, floatingControlsIntroDurationMs);

    return () => {
      window.clearTimeout(introTimeout);
      if (dismissTimeoutRef.current !== null) window.clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        className={classes.floatingControlsCorner}
        data-active={isIntroComplete || undefined}
        aria-hidden
        onPointerEnter={revealFromCorner}
        onPointerMove={revealFromCorner}
        onPointerDown={revealFromCorner}
        onPointerLeave={dismissSoon}
      />
      <Group
        className={classes.floatingControls}
        data-visible={isVisible || undefined}
        gap={4}
        wrap="nowrap"
        onPointerEnter={startInteraction}
        onPointerLeave={endInteraction}
        onFocusCapture={startInteraction}
        onBlurCapture={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
          endInteraction();
        }}
      >
        {children}
      </Group>
    </>
  );
};
