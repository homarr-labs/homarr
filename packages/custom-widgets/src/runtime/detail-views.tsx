"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Box, Button, Drawer, Modal } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { WidgetOverlayProvider, WidgetStyleScopeContext } from "./overlay-scope";

const DetailContext = createContext<{
  stack: string[];
  closeLabel?: string;
  open(id: string): void;
  close(id: string): void;
} | null>(null);
export function WidgetDetailProvider({ children, closeLabel }: { children: ReactNode; closeLabel?: string }) {
  const [stack, setStack] = useState<string[]>([]);
  const open = useCallback((id: string) => setStack((current) => [...current.filter((entry) => entry !== id), id]), []);
  const close = useCallback((id: string) => setStack((current) => current.filter((entry) => entry !== id)), []);
  return <DetailContext.Provider value={{ stack, closeLabel, open, close }}>{children}</DetailContext.Provider>;
}

interface DetailViewProps {
  children?: ReactNode;
  "data-cw-source"?: string;
  title: string;
  triggerLabel: string;
  size?: string | number;
  position?: "left" | "right" | "top" | "bottom";
}

export function WidgetModal(props: DetailViewProps) {
  return <WidgetDetailView {...props} kind="modal" />;
}
export function WidgetDrawer(props: DetailViewProps) {
  return <WidgetDetailView {...props} kind="drawer" />;
}
function WidgetDetailView({
  children,
  title,
  triggerLabel,
  size,
  position,
  kind,
  "data-cw-source": source,
}: DetailViewProps & { kind: "modal" | "drawer" }) {
  const [opened, setOpened] = useState(false);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreStack = useRef<string[] | null>(null);
  const id = useId();
  const details = useContext(DetailContext);
  const currentStack = useRef(details?.stack ?? []);
  currentStack.current = details?.stack ?? [];
  const release = details?.close;
  useEffect(() => () => release?.(id), [id, release]);
  useEffect(() => {
    const expected = restoreStack.current;
    if (opened || !expected) return;
    restoreStack.current = null;
    // Run after the remaining dialog reactivates its trap. A direct ref also works inside preview shadow roots.
    const timeout = window.setTimeout(() => {
      if (
        expected.length !== currentStack.current.length ||
        expected.some((entry, index) => entry !== currentStack.current[index])
      )
        return;
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
    }, 10);
    return () => window.clearTimeout(timeout);
  }, [opened]);
  const top = !details || details.stack.at(-1) === id;
  const open = () => {
    restoreStack.current = null;
    details?.open(id);
    setOpened(true);
  };
  const close = useCallback(() => {
    if (top) restoreStack.current = details?.stack.filter((entry) => entry !== id) ?? [];
    release?.(id);
    setOpened(false);
  }, [top, details?.stack, id, release]);
  useEffect(() => {
    if (!opened || !top) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.defaultPrevented) return;
      // Shadow roots retarget event.target; consult the original path before dismissing a surrounding detail.
      if (
        event
          .composedPath()
          .some(
            (target) => target instanceof Element && target.getAttribute("data-mantine-stop-propagation") === "true",
          )
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [opened, top, close]);
  const scopeId = useContext(WidgetStyleScopeContext);
  const reducedMotion = useReducedMotion();
  const content = (
    <Box ref={setOverlayHost}>
      <WidgetOverlayProvider scopeId={scopeId ?? ""} parent={overlayHost}>
        <Box data-cw-scope={scopeId} style={{ contain: "layout paint style", isolation: "isolate", minHeight: 0 }}>
          {children}
        </Box>
      </WidgetOverlayProvider>
    </Box>
  );
  const common = {
    title,
    opened,
    onClose: close,
    size: size ?? "lg",
    returnFocus: false,
    trapFocus: top,
    closeOnEscape: false,
    closeOnClickOutside: top,
    zIndex: 200 + Math.max(0, details?.stack.indexOf(id) ?? 0),
    closeButtonProps: { "aria-label": details?.closeLabel ?? title },
    transitionProps: { duration: reducedMotion ? 0 : 180 },
  };
  return (
    <>
      <Button ref={triggerRef} data-cw-source={source} type="button" variant="light" onClick={open}>
        {triggerLabel}
      </Button>
      {kind === "modal" && (
        <Modal {...common} centered>
          {content}
        </Modal>
      )}
      {kind === "drawer" && (
        <Drawer {...common} position={position ?? "right"}>
          {content}
        </Drawer>
      )}
    </>
  );
}

interface AppEmbedProps {
  src: string;
  title: string;
  height?: number;
  allowForms?: boolean;
}
export function AppEmbed({ src, title, height, allowForms }: AppEmbedProps) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !title?.trim()) return null;
  let sandbox = "allow-scripts allow-popups";
  if (allowForms) sandbox += " allow-forms";
  const frameHeight = Math.min(2_000, Math.max(100, height ?? 400));
  return (
    <iframe
      src={url.href}
      title={title}
      sandbox={sandbox}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: frameHeight, border: 0, display: "block" }}
    />
  );
}
