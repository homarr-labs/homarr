"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { getBoardTabSections, getRootSectionLane } from "@homarr/definitions";

import { useOptionalBoard } from "./context";
import { getBoardLayoutData } from "./layout-data";

type Board = RouterOutputs["board"]["getBoardByName"];
type Section = Board["sections"][number];
export type BoardTab = Extract<Section, { kind: "empty" }>;

export const boardTabSearchParam = "tab";

export const getBoardTabs = (board: Pick<Board, "sections">): BoardTab[] =>
  getBoardTabSections(board.sections.filter((section): section is BoardTab => section.kind === "empty"));

export const getBoardTabForSection = (board: Board, layoutId: string, sectionId: string): BoardTab | undefined => {
  const { sectionsById } = getBoardLayoutData(board, layoutId);
  let section = sectionsById.get(sectionId);
  const visited = new Set<string>();
  while (section?.kind === "container") {
    if (visited.has(section.id)) return undefined;
    visited.add(section.id);
    const parentId = section.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId;
    if (!parentId) return undefined;
    section = sectionsById.get(parentId);
  }
  if (section?.kind === "empty" && getRootSectionLane(section.xOffset) === "main") return section;
  return undefined;
};

const normalizeTabKey = (value: string) => value.trim().toLowerCase();

export const findBoardTab = (tabs: readonly BoardTab[], key: string | null | undefined) => {
  if (!key) return undefined;
  const byId = tabs.find((tab) => tab.id === key);
  if (byId) return byId;
  const normalizedKey = normalizeTabKey(key);
  return tabs.find((tab) => tab.name && normalizeTabKey(tab.name) === normalizedKey);
};

export const getBoardTabKey = (tabs: readonly BoardTab[], tab: BoardTab) => {
  const name = tab.name?.trim();
  if (!name) return tab.id;
  const normalizedName = normalizeTabKey(name);
  const isUnique = tabs.every(
    (candidate) => candidate.id === tab.id || !candidate.name || normalizeTabKey(candidate.name) !== normalizedName,
  );
  if (!isUnique) return tab.id;
  return name;
};

const replaceTabSearchParam = (key: string | null) => {
  const url = new URL(window.location.href);
  if (url.searchParams.get(boardTabSearchParam) === key) return;
  if (key) url.searchParams.set(boardTabSearchParam, key);
  else url.searchParams.delete(boardTabSearchParam);
  window.history.replaceState(null, "", url);
};

interface BoardTabsContextValue {
  tabs: BoardTab[];
  activeTab: BoardTab | undefined;
  selectTab: (tabId: string) => void;
}

const BoardTabsContext = createContext<BoardTabsContextValue | null>(null);

export const BoardTabsProvider = ({ children, initialTabKey }: PropsWithChildren<{ initialTabKey: string | null }>) => {
  const board = useOptionalBoard();
  const sections = board?.sections;
  const tabs = useMemo(() => (sections ? getBoardTabs({ sections }) : []), [sections]);
  const [selection, setSelection] = useState(() => ({
    navigationKey: initialTabKey,
    tabId: findBoardTab(tabs, initialTabKey)?.id ?? null,
  }));
  if (selection.navigationKey !== initialTabKey) {
    setSelection({ navigationKey: initialTabKey, tabId: findBoardTab(tabs, initialTabKey)?.id ?? null });
  }
  const activeTab = tabs.find((tab) => tab.id === selection.tabId) ?? tabs[0];
  const selectTab = useCallback((tabId: string) => setSelection((previous) => ({ ...previous, tabId })), []);

  const value = useMemo(() => ({ tabs, activeTab, selectTab }), [activeTab, selectTab, tabs]);

  return <BoardTabsContext.Provider value={value}>{children}</BoardTabsContext.Provider>;
};

const noop = () => undefined;

export const useBoardTabs = (): BoardTabsContextValue => {
  const context = useContext(BoardTabsContext);
  const board = useOptionalBoard();
  const sections = board?.sections;
  const fallback = useMemo(() => {
    const tabs = sections ? getBoardTabs({ sections }) : [];
    return { tabs, activeTab: tabs[0], selectTab: noop };
  }, [sections]);

  return context ?? fallback;
};

export const useActiveBoardTabId = () => useBoardTabs().activeTab?.id;

export const useSyncBoardTabSearchParam = () => {
  const { tabs, activeTab } = useBoardTabs();
  let activeTabKey: string | null = null;
  if (activeTab && activeTab.id !== tabs[0]?.id) activeTabKey = getBoardTabKey(tabs, activeTab);

  useEffect(() => {
    replaceTabSearchParam(activeTabKey);
  }, [activeTabKey]);
};
