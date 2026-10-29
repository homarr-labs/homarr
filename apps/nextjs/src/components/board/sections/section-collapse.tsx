"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";

import { AutoExpandWatcher } from "./auto-expand/auto-expand-watcher";
import { readSectionCollapsedFromStorage, writeSectionCollapsedToStorage } from "./section-collapse-storage";

interface SectionCollapseContextValue {
  collapsedSectionIds: ReadonlySet<string>;
  visuallyCollapsedSectionIds: ReadonlySet<string>;
  autoExpandedSectionIds: ReadonlySet<string>;
  autoExpandTargetSectionIds: ReadonlySet<string>;
  setCollapsed: (sectionId: string, collapsed: boolean) => void;
  expandForEditing: (sectionIds: ReadonlySet<string>) => void;
}

const SectionCollapseContext = createContext<SectionCollapseContextValue | null>(null);

export const BoardSectionCollapseProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const { status } = useSession();
  const { mutate } = clientApi.section.changeCollapsed.useMutation();
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      board.sections.filter((section) => section.kind !== "empty").map((section) => [section.id, section.collapsed]),
    ),
  );
  const collapsedByIdRef = useRef(collapsedById);
  const [temporarilyExpandedIds, setTemporarilyExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [activeBySectionId, setActiveBySectionId] = useState<Record<string, boolean>>({});
  collapsedByIdRef.current = collapsedById;

  const autoExpandTargets = useMemo(() => {
    const targets: {
      sectionId: string;
      itemId: string;
      kind: (typeof board.items)[number]["kind"];
      options: Record<string, unknown>;
      integrationIds: string[];
    }[] = [];
    for (const section of board.sections) {
      if (section.kind !== "container" || !section.options.autoExpand.enabled || !section.options.autoExpand.itemId) {
        continue;
      }
      const item = board.items.find((candidate) => candidate.id === section.options.autoExpand.itemId);
      if (!item) continue;
      targets.push({
        sectionId: section.id,
        itemId: item.id,
        kind: item.kind,
        options: item.options,
        integrationIds: item.integrationIds,
      });
    }
    return targets;
  }, [board.items, board.sections]);

  const handleActiveChange = useCallback((sectionId: string, active: boolean) => {
    setActiveBySectionId((previous) =>
      previous[sectionId] === active ? previous : { ...previous, [sectionId]: active },
    );
  }, []);

  useEffect(() => {
    if (!isEditMode) setTemporarilyExpandedIds((current) => (current.size === 0 ? current : new Set()));
  }, [isEditMode]);

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
      setTemporarilyExpandedIds((current) => {
        if (!current.has(sectionId)) return current;
        const next = new Set(current);
        next.delete(sectionId);
        return next;
      });

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

  const expandForEditing = useCallback(
    (sectionIds: ReadonlySet<string>) => {
      if (!isEditMode || sectionIds.size === 0) return;
      setTemporarilyExpandedIds((current) => {
        const next = new Set(current);
        for (const sectionId of sectionIds) next.add(sectionId);
        return next.size === current.size ? current : next;
      });
    },
    [isEditMode],
  );

  const value = useMemo<SectionCollapseContextValue>(() => {
    const collapsedSectionIds = new Set(
      Object.entries(collapsedById)
        .filter(([, collapsed]) => collapsed)
        .map(([sectionId]) => sectionId),
    );
    const autoExpandTargetSectionIds = new Set(autoExpandTargets.map((target) => target.sectionId));
    const autoExpandedSectionIds = new Set(
      Object.entries(activeBySectionId)
        .filter(([sectionId, active]) => active && autoExpandTargetSectionIds.has(sectionId))
        .map(([sectionId]) => sectionId),
    );
    return {
      collapsedSectionIds,
      visuallyCollapsedSectionIds: new Set(
        [...collapsedSectionIds].filter(
          (sectionId) =>
            (!isEditMode || !temporarilyExpandedIds.has(sectionId)) && !autoExpandedSectionIds.has(sectionId),
        ),
      ),
      autoExpandedSectionIds,
      autoExpandTargetSectionIds,
      setCollapsed,
      expandForEditing,
    };
  }, [
    activeBySectionId,
    autoExpandTargets,
    collapsedById,
    expandForEditing,
    isEditMode,
    setCollapsed,
    temporarilyExpandedIds,
  ]);

  return (
    <SectionCollapseContext.Provider value={value}>
      {autoExpandTargets.map((target) => (
        <AutoExpandWatcher
          key={target.sectionId}
          boardId={board.id}
          itemId={target.itemId}
          kind={target.kind}
          options={target.options}
          integrationIds={target.integrationIds}
          onActiveChange={(active) => handleActiveChange(target.sectionId, active)}
        />
      ))}
      {children}
    </SectionCollapseContext.Provider>
  );
};

export const useSectionCollapse = ({ sectionId, collapsible }: { sectionId: string; collapsible: boolean }) => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  const isCollapsed = collapsible && context.collapsedSectionIds.has(sectionId);
  const isVisuallyCollapsed = collapsible && context.visuallyCollapsedSectionIds.has(sectionId);
  return {
    isCollapsed,
    isVisuallyCollapsed,
    setCollapsed: (collapsed: boolean) => context.setCollapsed(sectionId, collapsed),
    toggle: () => context.setCollapsed(sectionId, !isVisuallyCollapsed),
  };
};

export const useCollapsedSectionIds = () => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.visuallyCollapsedSectionIds;
};

export const useExpandSectionsForEditing = () => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.expandForEditing;
};

export const useIsAutoExpanded = (sectionId: string) => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.autoExpandedSectionIds.has(sectionId);
};

export const useAutoExpandedSectionIds = () => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.autoExpandedSectionIds;
};

export const useAutoExpandTargetSectionIds = () => {
  const context = useContext(SectionCollapseContext);

  if (!context) {
    throw new Error("BoardSectionCollapseProvider is required");
  }

  return context.autoExpandTargetSectionIds;
};
