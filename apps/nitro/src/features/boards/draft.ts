import type {
  Board,
  BoardContainer,
  BoardDomainResources,
  BoardItem,
  BoardLayout,
  GridPlacement,
  GridSnapshot,
} from "./contracts";

export function selectBoardLayout(board: Board, viewportWidth: number, overrideId: string | null = null) {
  const override = board.layouts.find(({ id }) => id === overrideId);
  if (override) return override;
  const width = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  const ordered = board.layouts.toSorted((a, b) => b.breakpoint - a.breakpoint);
  const layout = ordered.find(({ breakpoint }) => breakpoint <= width) ?? ordered.at(-1);
  if (!layout) throw new Error("Board layout repair is required before this dashboard can be opened.");
  return layout;
}

export function getGridColumns(board: Board, layoutId: string, sectionId: string, resources: BoardDomainResources) {
  const layout = board.layouts.find(({ id }) => id === layoutId);
  const section = board.sections.find(({ id }) => id === sectionId);
  if (!layout || !section) throw new Error("The requested board layout or section no longer exists.");
  if (section.kind === "empty")
    return resources.definitions.getBoardLaneColumnCount(
      layout,
      resources.definitions.getRootSectionLane(section.xOffset),
    );
  const placement = section.layouts.find((value) => value.layoutId === layoutId);
  if (!placement) throw new Error("Section placement repair is required.");
  return placement.width;
}

export function getGridPlacements(board: Board, layoutId: string, sectionId: string): GridPlacement[] {
  return [
    ...board.items.flatMap((item): GridPlacement[] => {
      const value = item.layouts.find((layout) => layout.layoutId === layoutId && layout.sectionId === sectionId);
      return value
        ? [{ id: item.id, type: "item", x: value.xOffset, y: value.yOffset, w: value.width, h: value.height }]
        : [];
    }),
    ...board.sections.flatMap((section): GridPlacement[] => {
      if (section.kind !== "container") return [];
      const value = section.layouts.find(
        (layout) => layout.layoutId === layoutId && layout.parentSectionId === sectionId,
      );
      return value
        ? [{ id: section.id, type: "section", x: value.xOffset, y: value.yOffset, w: value.width, h: value.height }]
        : [];
    }),
  ].toSorted((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
}

export function getContainerMinimum(
  board: Board,
  sectionId: string,
  layoutId: string,
  ancestors: ReadonlySet<string> = new Set(),
): { width: number; height: number } {
  if (ancestors.has(sectionId)) throw new Error("Section hierarchy contains a cycle.");
  const nextAncestors = new Set(ancestors).add(sectionId);
  const section = board.sections.find(({ id }) => id === sectionId);
  const children = getGridPlacements(board, layoutId, sectionId).map((placement) => {
    if (placement.type !== "section") return placement;
    const minimum = getContainerMinimum(board, placement.id, layoutId, nextAncestors);
    return { ...placement, w: Math.max(placement.w, minimum.width), h: Math.max(placement.h, minimum.height) };
  });
  return {
    width: Math.max(1, ...children.map(({ x, w }) => x + w)),
    height:
      section?.kind === "container" && section.options.scrollable
        ? 1
        : Math.max(1, ...children.map(({ y, h }) => y + h)),
  };
}

export function assertNoSectionCycle(board: Board, sectionId: string, parentId: string, layoutId: string) {
  const visited = new Set([sectionId]);
  let current = parentId;
  for (;;) {
    if (visited.has(current)) throw new Error("A section cannot be moved inside itself or one of its children.");
    visited.add(current);
    const section = board.sections.find(({ id }) => id === current);
    if (!section) throw new Error("Destination section not found.");
    if (section.kind === "empty") return;
    const placement = section.layouts.find((layout) => layout.layoutId === layoutId);
    if (!placement) throw new Error("Destination section placement is missing.");
    current = placement.parentSectionId;
  }
}

export function validateBoardDraft(board: Board, resources: BoardDomainResources): Board {
  resources.schemas.boardSaveSchema.parse({ id: board.id, sections: board.sections, items: board.items });
  resources.schemas.boardSaveLayoutsSchema.parse({ id: board.id, layouts: board.layouts });
  const ids = [...board.items, ...board.sections].map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error("Board item and section IDs must be unique.");
  for (const lane of ["left", "main", "right"] as const) {
    const roots = board.sections.filter(
      (section) => section.kind === "empty" && resources.definitions.getRootSectionLane(section.xOffset) === lane,
    );
    if (
      roots.length > 1 ||
      ((lane === "main" ||
        board.layouts.some((layout) => resources.definitions.getBoardLaneColumnCount(layout, lane) > 0)) &&
        roots.length !== 1)
    )
      throw new Error(`The ${lane} canvas requires server-side layout repair.`);
  }
  for (const element of [...board.items, ...board.sections.filter((section) => section.kind === "container")]) {
    if (
      element.layouts.length !== board.layouts.length ||
      new Set(element.layouts.map(({ layoutId }) => layoutId)).size !== element.layouts.length
    )
      throw new Error(`Placement repair is required for ${element.id}.`);
    for (const placement of element.layouts) {
      const parentId = "parentSectionId" in placement ? placement.parentSectionId : placement.sectionId;
      const columns = getGridColumns(board, placement.layoutId, parentId, resources);
      if (columns < 1 || placement.xOffset + placement.width > columns)
        throw new Error(`Placement ${element.id} is outside its destination canvas.`);
      if ("parentSectionId" in placement)
        assertNoSectionCycle(board, element.id, placement.parentSectionId, placement.layoutId);
    }
  }
  return board;
}

export function commitGridSnapshots(board: Board, snapshots: readonly GridSnapshot[], resources: BoardDomainResources) {
  const updates = new Map<string, { sectionId: string; placement: GridPlacement }>();
  for (const snapshot of snapshots) {
    const columns = getGridColumns(board, snapshot.layoutId, snapshot.sectionId, resources);
    for (const placement of snapshot.placements) {
      const key = `${snapshot.layoutId}:${placement.id}`;
      if (updates.has(key)) throw new Error("A grid transaction contains duplicate placements.");
      if (
        ![placement.x, placement.y, placement.w, placement.h].every(Number.isInteger) ||
        placement.x < 0 ||
        placement.y < 0 ||
        placement.w < 1 ||
        placement.h < 1 ||
        placement.x + placement.w > columns
      )
        throw new Error("Grid placement is outside the destination canvas.");
      if (placement.type === "section")
        assertNoSectionCycle(board, placement.id, snapshot.sectionId, snapshot.layoutId);
      updates.set(key, { sectionId: snapshot.sectionId, placement });
    }
  }
  const next = {
    ...board,
    items: board.items.map((item) => ({
      ...item,
      layouts: item.layouts.map((layout) => {
        const update = updates.get(`${layout.layoutId}:${item.id}`);
        return update?.placement.type === "item"
          ? {
              ...layout,
              sectionId: update.sectionId,
              xOffset: update.placement.x,
              yOffset: update.placement.y,
              width: update.placement.w,
              height: update.placement.h,
            }
          : layout;
      }),
    })),
    sections: board.sections.map((section) =>
      section.kind === "empty"
        ? section
        : {
            ...section,
            layouts: section.layouts.map((layout) => {
              const update = updates.get(`${layout.layoutId}:${section.id}`);
              return update?.placement.type === "section"
                ? {
                    ...layout,
                    parentSectionId: update.sectionId,
                    xOffset: update.placement.x,
                    yOffset: update.placement.y,
                    width: update.placement.w,
                    height: update.placement.h,
                  }
                : layout;
            }),
          },
    ),
  };
  return validateBoardDraft(next, resources);
}

export function placeBoardElement(
  board: Board,
  layoutId: string,
  destinationId: string,
  placement: GridPlacement,
  resources: BoardDomainResources,
) {
  const original = [...board.items, ...board.sections.filter((section) => section.kind === "container")].find(
    ({ id }) => id === placement.id,
  );
  const previous = original?.layouts.find((layout) => layout.layoutId === layoutId);
  if (!previous) throw new Error("The item no longer exists in this layout.");
  const sourceId = "parentSectionId" in previous ? previous.parentSectionId : previous.sectionId;
  if (placement.type === "section") assertNoSectionCycle(board, placement.id, destinationId, layoutId);
  const columns = getGridColumns(board, layoutId, destinationId, resources);
  const minimum =
    placement.type === "section" ? getContainerMinimum(board, placement.id, layoutId) : { width: 1, height: 1 };
  if (columns < minimum.width) throw new Error("This container's children do not fit in the destination section.");
  const siblings = getGridPlacements(board, layoutId, destinationId).filter(({ id }) => id !== placement.id);
  const pinned = {
    ...placement,
    w: Math.max(minimum.width, Math.min(columns, placement.w)),
    h: Math.max(minimum.height, placement.h),
    x: Math.max(0, Math.min(placement.x, columns - Math.max(minimum.width, Math.min(columns, placement.w)))),
  };
  const resolved = resources.resolvePinnedGridCollisions([...siblings, pinned], pinned, columns);
  const snapshots: GridSnapshot[] = [{ layoutId, sectionId: destinationId, placements: resolved }];
  if (sourceId !== destinationId)
    snapshots.push({
      layoutId,
      sectionId: sourceId,
      placements: getGridPlacements(board, layoutId, sourceId).filter(({ id }) => id !== placement.id),
    });
  return commitGridSnapshots(board, snapshots, resources);
}

export function addBoardContainer(board: Board, resources: BoardDomainResources, id: string) {
  const root = board.sections.find(
    (section) => section.kind === "empty" && resources.definitions.getRootSectionLane(section.xOffset) === "main",
  );
  if (!root) throw new Error("The main canvas requires layout repair.");
  const section: BoardContainer = {
    id,
    kind: "container",
    collapsed: false,
    options: resources.schemas.containerSectionOptionsSchema.parse(undefined),
    layouts: board.layouts.map((layout) => {
      const columns = getGridColumns(board, layout.id, root.id, resources);
      const width = Math.min(4, columns);
      const placements = getGridPlacements(board, layout.id, root.id);
      for (let y = 0; y < 9999; y++) {
        for (let x = 0; x + width <= columns; x++) {
          if (
            placements.some(
              (placement) =>
                placement.x < x + width &&
                placement.x + placement.w > x &&
                placement.y < y + 3 &&
                placement.y + placement.h > y,
            )
          )
            continue;
          return { layoutId: layout.id, parentSectionId: root.id, xOffset: x, yOffset: y, width, height: 3 };
        }
      }
      throw new Error("Your board is full.");
    }),
  };
  return validateBoardDraft({ ...board, sections: [...board.sections, section] }, resources);
}

export function removeBoardContainer(board: Board, sectionId: string, resources: BoardDomainResources) {
  const removed = board.sections.find((section) => section.id === sectionId && section.kind === "container");
  if (!removed || removed.kind !== "container") throw new Error("Container not found.");
  for (const placement of removed.layouts)
    assertNoSectionCycle(board, removed.id, placement.parentSectionId, placement.layoutId);
  const next = {
    ...board,
    sections: board.sections
      .filter(({ id }) => id !== sectionId)
      .map((section) =>
        section.kind === "empty"
          ? section
          : {
              ...section,
              layouts: section.layouts.map((layout) => {
                if (layout.parentSectionId !== sectionId) return layout;
                const parent = removed.layouts.find((value) => value.layoutId === layout.layoutId);
                if (!parent) throw new Error("Container removal requires complete layout placements.");
                return {
                  ...layout,
                  parentSectionId: parent.parentSectionId,
                  xOffset: layout.xOffset + parent.xOffset,
                  yOffset: layout.yOffset + parent.yOffset,
                };
              }),
            },
      ),
    items: board.items.map((item) => ({
      ...item,
      layouts: item.layouts.map((layout) => {
        if (layout.sectionId !== sectionId) return layout;
        const parent = removed.layouts.find((value) => value.layoutId === layout.layoutId);
        if (!parent) throw new Error("Container removal requires complete layout placements.");
        return {
          ...layout,
          sectionId: parent.parentSectionId,
          xOffset: layout.xOffset + parent.xOffset,
          yOffset: layout.yOffset + parent.yOffset,
        };
      }),
    })),
  };
  const snapshots = removed.layouts.map((layout): GridSnapshot => {
    const placements = getGridPlacements(next, layout.layoutId, layout.parentSectionId);
    const moved = placements.find((placement) => {
      const original = getGridPlacements(board, layout.layoutId, sectionId);
      return original.some(({ id }) => id === placement.id);
    });
    return {
      layoutId: layout.layoutId,
      sectionId: layout.parentSectionId,
      placements: moved
        ? resources.resolvePinnedGridCollisions(
            placements,
            moved,
            getGridColumns(next, layout.layoutId, layout.parentSectionId, resources),
          )
        : placements,
    };
  });
  return commitGridSnapshots(next, snapshots, resources);
}

export function applyBoardItem(board: Board, item: BoardItem, resources: BoardDomainResources) {
  const exists = board.items.some(({ id }) => id === item.id);
  return validateBoardDraft(
    {
      ...board,
      items: exists
        ? board.items.map((previous) => (previous.id === item.id ? item : previous))
        : [...board.items, item],
    },
    resources,
  );
}

function layoutElements(board: Board, layoutId: string) {
  return board.sections.flatMap((section) =>
    getGridPlacements(board, layoutId, section.id).map((placement) => ({
      id: placement.id,
      type: placement.type,
      sectionId: section.id,
      xOffset: placement.x,
      yOffset: placement.y,
      width: placement.w,
      height: placement.h,
    })),
  );
}

export function projectDraftLayout(
  board: Board,
  source: BoardLayout,
  target: BoardLayout,
  resources: BoardDomainResources,
) {
  const projected = resources.projectBoardLayout(board, source, target);
  const before = layoutElements(board, source.id);
  const resizeSource =
    source.id === target.id
      ? resources.common.serializeLayoutResizeSource(
          resources.common.getLayoutResizeSource(source, before, source.resizeSource),
          target,
          projected,
        )
      : null;
  const byId = new Map(projected.map((placement) => [placement.id, placement]));
  const next = {
    ...board,
    layouts: [...board.layouts.filter(({ id }) => id !== target.id), { ...target, resizeSource }].toSorted(
      (a, b) => a.breakpoint - b.breakpoint,
    ),
    items: board.items.map((item) => {
      const placement = byId.get(item.id);
      if (!placement || placement.type !== "item") throw new Error(`Responsive projection lost item ${item.id}.`);
      const nextLayout = {
        layoutId: target.id,
        sectionId: placement.sectionId,
        xOffset: placement.xOffset,
        yOffset: placement.yOffset,
        width: placement.width,
        height: placement.height,
      };
      return { ...item, layouts: [...item.layouts.filter(({ layoutId }) => layoutId !== target.id), nextLayout] };
    }),
    sections: board.sections.map((section) => {
      if (section.kind === "empty") return section;
      const placement = byId.get(section.id);
      if (!placement || placement.type !== "section")
        throw new Error(`Responsive projection lost section ${section.id}.`);
      const nextLayout = {
        layoutId: target.id,
        parentSectionId: placement.sectionId,
        xOffset: placement.xOffset,
        yOffset: placement.yOffset,
        width: placement.width,
        height: placement.height,
      };
      return { ...section, layouts: [...section.layouts.filter(({ layoutId }) => layoutId !== target.id), nextLayout] };
    }),
  };
  return validateBoardDraft(next, resources);
}

export interface BoardDraftState {
  initial: Board;
  board: Board;
  past: readonly Board[];
  future: readonly Board[];
  error: Error | null;
}

export type BoardDraftAction =
  | { type: "apply"; update: (board: Board) => Board }
  | { type: "reload"; board: Board }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "discard" }
  | { type: "error"; error: Error };

export function createBoardDraft(board: Board): BoardDraftState {
  return { initial: board, board, past: [], future: [], error: null };
}

export function boardDraftReducer(state: BoardDraftState, action: BoardDraftAction): BoardDraftState {
  if (action.type === "reload") return createBoardDraft(action.board);
  if (action.type === "error") return { ...state, error: action.error };
  if (action.type === "discard") return createBoardDraft(state.initial);
  if (action.type === "undo") {
    const board = state.past.at(-1);
    return board
      ? { ...state, board, past: state.past.slice(0, -1), future: [state.board, ...state.future], error: null }
      : state;
  }
  if (action.type === "redo") {
    const board = state.future.at(0);
    return board
      ? { ...state, board, past: [...state.past, state.board], future: state.future.slice(1), error: null }
      : state;
  }
  try {
    const board = action.update(state.board);
    return board === state.board
      ? state
      : { ...state, board, past: [...state.past.slice(-49), state.board], future: [], error: null };
  } catch (error) {
    return { ...state, error: error instanceof Error ? error : new Error("The draft change could not be applied.") };
  }
}
