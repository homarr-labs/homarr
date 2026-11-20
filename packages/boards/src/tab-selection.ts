import { getBoardTabSections } from "@homarr/definitions";

import type { Board, EmptySection } from "./layout-data";

export type BoardTab = EmptySection;

export const boardTabSearchParam = "tab";

export const getBoardTabs = (board: Pick<Board, "sections">): BoardTab[] =>
  getBoardTabSections(board.sections.filter((section): section is BoardTab => section.kind === "empty"));

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
  if (!isUnique || findBoardTab(tabs, name)?.id !== tab.id) return tab.id;
  return name;
};
