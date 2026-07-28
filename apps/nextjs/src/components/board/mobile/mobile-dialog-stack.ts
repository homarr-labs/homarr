"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

const getDialogElement = (element: HTMLElement | null) => {
  if (!element) return null;
  if (element.matches('[role="dialog"]')) return element;
  return element.closest<HTMLElement>('[role="dialog"]') ?? element.querySelector<HTMLElement>('[role="dialog"]');
};

const isOpenDialog = (element: Element) =>
  element.getAttribute("aria-hidden") !== "true" &&
  element.getAttribute("data-hidden") !== "true" &&
  element.getAttribute("data-state") !== "closed" &&
  !element.hasAttribute("hidden");

export const hasOpenDialogOutside = (element: HTMLElement | null, root: ParentNode = document) => {
  const currentDialog = getDialogElement(element);

  return Array.from(root.querySelectorAll('[role="dialog"]')).some(
    (dialog) => dialog !== currentDialog && isOpenDialog(dialog),
  );
};

export const useHasNestedDialog = (opened: boolean, dialogRef: RefObject<HTMLDivElement | null>) => {
  const [hasNestedDialog, setHasNestedDialog] = useState(false);

  useEffect(() => {
    if (!opened || typeof MutationObserver === "undefined") return;

    const update = () => setHasNestedDialog(hasOpenDialogOutside(dialogRef.current));
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "data-hidden", "data-state", "hidden"],
    });

    return () => observer.disconnect();
  }, [dialogRef, opened]);

  return opened && hasNestedDialog;
};
