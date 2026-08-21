"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";

import { readSectionCollapsedFromStorage, writeSectionCollapsedToStorage } from "./section-collapse-storage";

interface SectionCollapseContextValue {
  collapsedSectionIds: ReadonlySet<string>;
  setCollapsed: (sectionId: string, collapsed: boolean) => void;
}

const SectionCollapseContext = createContext<SectionCollapseContextValue | null>(null);

export const BoardSectionCollapseProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const { status } = useSession();
  const { mutate } = clientApi.section.changeCollapsed.useMutation();
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      board.sections.filter((section) => section.kind !== "empty").map((section) => [section.id, section.collapsed]),
    ),
  );
  const collapsedByIdRef = useRef(collapsedById);
  collapsedByIdRef.current = collapsedById;

  useEffect(() => {
    setCollapsedById((previous) => {
      const next = { ...previous };
      for (const section of board.sections) {
        if (section.kind === "empty" || section.id in next) continue;
        next[section.id] = section.collapsed;
      }
      return next;
    });
  }, [board.sections]);

  useEffect(() => {
    if (status !== "unauthenticated") return;

    setCollapsedById((previous) => {
      const next = { ...previous };
      for (const sectionId of Object.keys(next)) {
        next[sectionId] = readSectionCollapsedFromStorage(window.localStorage, sectionId, next[sectionId] ?? false);
      }
      return next;
    });
  }, [status]);

  const setCollapsed = useCallback(
    (sectionId: string, collapsed: boolean) => {
      const previousCollapsed = collapsedByIdRef.current[sectionId] ?? false;
      collapsedByIdRef.current = { ...collapsedByIdRef.current, [sectionId]: collapsed };
      setCollapsedById((previous) => ({ ...previous, [sectionId]: collapsed }));

      if (status === "authenticated") {
        mutate(
          { sectionId, collapsed },
          {
            onError: () => {
              if (collapsedByIdRef.current[sectionId] !== collapsed) return;
              collapsedByIdRef.current = { ...collapsedByIdRef.current, [sectionId]: previousCollapsed };
              setCollapsedById((previous) => ({ ...previous, [sectionId]: previousCollapsed }));
            },
          },
        );
      } else if (status === "unauthenticated") {
        writeSectionCollapsedToStorage(window.localStorage, sectionId, collapsed);
      }
    },
    [mutate, status],
  );

  const value = useMemo<SectionCollapseContextValue>(
    () => ({
      collapsedSectionIds: new Set(
        Object.entries(collapsedById)
          .filter(([, collapsed]) => collapsed)
          .map(([sectionId]) => sectionId),
      ),
      setCollapsed,
    }),
    [collapsedById, setCollapsed],
  );

  return <SectionCollapseContext.Provider value={value}>{children}</SectionCollapseContext.Provider>;
};

export const useSectionCollapse = ({ sectionId, collapsible }: { sectionId: string; collapsible: boolean }) => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  const isCollapsed = collapsible && context.collapsedSectionIds.has(sectionId);
  return {
    isCollapsed,
    isVisuallyCollapsed: isCollapsed,
    setCollapsed: (collapsed: boolean) => context.setCollapsed(sectionId, collapsed),
    toggle: () => context.setCollapsed(sectionId, !isCollapsed),
  };
};

export const useCollapsedSectionIds = () => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.collapsedSectionIds;
};
