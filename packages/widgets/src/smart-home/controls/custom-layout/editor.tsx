"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent, KeyboardSensorOptions } from "@dnd-kit/core";
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useElementSize, useHotkeys, useMergedRef } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCheck,
  IconCopy,
  IconDownload,
  IconGripHorizontal,
  IconPlus,
  IconShare,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";

import {
  beginGridTransaction,
  findFreeGridSlot,
  previewGridMove,
  previewGridResize,
  resolvePinnedGridCollisions,
  validateGridState,
} from "@homarr/boards/grid";
import type { GridMoveGuard } from "@homarr/boards/grid";
import type { GridPlacement, GridTransaction, TransactionalGridState } from "@homarr/boards/grid";
import { useOptionalBoard } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { useSmartHomeCatalog } from "../../_inputs";
import { createEntityBlockId } from "../configuration";
import controlClasses from "../control-center/styles.module.css";
import { SmartHomeLiveProvider } from "../live";
import { SmartHomeInteractionProvider } from "../store";
import {
  elementsFitCard,
  fitElementsIntoCard,
  getCardInnerRows,
  getCardMinSize,
  getCardTitleRows,
  getElementMinRows,
  getElementPlacements,
  getCardScaledMinSize,
  getInnerGridId,
  placeNewElement,
  resizeCardWithElements,
  scaleElementPlacements,
} from "./card-grid";
import type { SmartHomeLayoutEditorProps } from "./editor-modal";
import classes from "./editor.module.css";
import { CardInspector, ElementInspector, INSERT_DRAG_PREFIX, InsertBar } from "./inspector";
import layoutClasses from "./layout.module.css";
import { buildPresetElements, createCard, getDefaultView, smartHomeLayoutPresets } from "./presets";
import type { SmartHomeLayoutPreset } from "./presets";
import { findFreeSlot, getMinimumRowHeight, LAYOUT_GAP } from "./responsive";
import { viewIcons } from "./view-icons";
import {
  getLayoutEntityIds,
  getLayoutGraphEntityIds,
  smartHomeLayoutSchema,
  SMART_HOME_CARD_MIN,
  SMART_HOME_LAYOUT_COLUMNS,
  SMART_HOME_LAYOUT_MAX_CARDS,
  SMART_HOME_LAYOUT_MAX_ELEMENTS,
  SMART_HOME_LAYOUT_MAX_TEMPLATES,
  SMART_HOME_LAYOUT_ROWS,
  SMART_HOME_LAYOUT_VERSION,
  staticElementViews,
} from "./schema";
import type {
  SmartHomeElementView,
  SmartHomeLayout,
  SmartHomeLayoutCard,
  SmartHomeLayoutElement,
  SmartHomeLayoutTemplate,
} from "./schema";
import { cardFromTemplate, cardToTemplate, duplicateCard } from "./templates";
import { useUndoable } from "./use-undoable";
import {
  CardColors,
  cardBodyStyle,
  CardTint,
  getCardPalette,
  getCardSurface,
  LayoutElement,
  placementStyle,
} from "./view";

const GRID_ID = "smart-home-layout";
// Drags that bring a new element from the insert bar, not move a card or an element.
const isInsert = (id: string) => id.startsWith(INSERT_DRAG_PREFIX);
// Used when the widget's size is unknown (e.g. a widget not yet placed on the board).
const FALLBACK_CANVAS_HEIGHT = 420;
const CANVAS_PADDING = 8;
/** What the editor changes, with undo: the cards and the saved templates. */
interface EditorDraft {
  cards: SmartHomeLayoutCard[];
  templates: SmartHomeLayoutTemplate[] | undefined;
}

/** Elements of an imported layout show this widget's integration, whatever integration they were made with. */
const withSource = (cards: readonly SmartHomeLayoutCard[], source: string) =>
  cards.map((card) => ({
    ...card,
    elements: card.elements.map((element) => ({ ...element, source: element.entityId ? source : "" })),
  }));

/**
 * Card gestures use only the widget grid, so cards push each other like before. Element gestures add every card's
 * own grid, nested under its card, so an element can move within a card or over to another one.
 */
const toGridState = (
  cards: readonly SmartHomeLayoutCard[],
  withCardGrids: boolean,
  rowCount: number,
): TransactionalGridState => ({
  grids: [
    {
      id: GRID_ID,
      columnCount: SMART_HOME_LAYOUT_COLUMNS,
      // The widget is the frame: cards cannot be moved or resized below its bottom edge.
      maxRowCount: rowCount,
      placements: cards.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    },
    ...(withCardGrids
      ? cards.map((card) => ({
          id: getInnerGridId(card.id),
          columnCount: card.w,
          maxRowCount: getCardInnerRows(card),
          parentGridId: GRID_ID,
          ownerPlacementId: card.id,
          placements: getElementPlacements(card),
        }))
      : []),
  ],
});

const isValidArrangement = (cards: readonly SmartHomeLayoutCard[]) => {
  try {
    validateGridState(toGridState(cards, true, SMART_HOME_LAYOUT_ROWS));
    return true;
  } catch {
    return false;
  }
};

const findGrid = (state: TransactionalGridState | null, id: string) => state?.grids.find((grid) => grid.id === id);

/** Writes a finished gesture back: card positions, and element positions including moves between cards. */
const applyGridState = (cards: readonly SmartHomeLayoutCard[], state: TransactionalGridState) => {
  const outer = new Map(findGrid(state, GRID_ID)?.placements.map((placement) => [placement.id, placement]));
  const owners = new Map<string, { cardId: string; placement: GridPlacement }>();
  for (const grid of state.grids) {
    if (!grid.ownerPlacementId) continue;
    for (const placement of grid.placements) owners.set(placement.id, { cardId: grid.ownerPlacementId, placement });
  }
  const elements = new Map(cards.flatMap((card) => card.elements.map((element) => [element.id, element] as const)));

  return cards.map((card): SmartHomeLayoutCard => {
    const position = outer.get(card.id);
    const moved = position ? { ...card, x: position.x, y: position.y, w: position.w, h: position.h } : card;
    if (owners.size === 0) return moved;
    const kept = card.elements.filter((element) => owners.get(element.id)?.cardId === card.id);
    const arrived = [...owners.entries()]
      .filter(([id, owner]) => owner.cardId === card.id && !card.elements.some((element) => element.id === id))
      .flatMap(([id]) => elements.get(id) ?? []);
    return {
      ...moved,
      elements: [...kept, ...arrived].map((element) => {
        const placement = owners.get(element.id)?.placement;
        return placement ? { ...element, x: placement.x, y: placement.y, w: placement.w, h: placement.h } : element;
      }),
    };
  });
};

const stateKey = (state: TransactionalGridState) =>
  state.grids.map((grid) => grid.placements.map(({ id, x, y, w, h }) => `${id}${x},${y},${w},${h}`).join()).join("|");

/** The size of one cell of a card's grid on screen. */
// An element moved in from another card counts against the target's limit; moves within a card do not.
const elementLimitGuard: GridMoveGuard = ({ sourceGrid, targetGrid }) =>
  sourceGrid.id === targetGrid.id || targetGrid.placements.length < SMART_HOME_LAYOUT_MAX_ELEMENTS;

const orderFreeKey = (state: TransactionalGridState) =>
  JSON.stringify(
    state.grids
      .map((grid) => [grid.id, grid.placements.map(({ id, x, y, w, h }) => `${id}:${x},${y},${w},${h}`).toSorted()])
      .toSorted(),
  );

/** Whether two grid states place everything alike, whatever the order. */
const sameGridState = (first: TransactionalGridState, second: TransactionalGridState) =>
  orderFreeKey(first) === orderFreeKey(second);

const cardCellSize = (body: Element, card: SmartHomeLayoutCard) => {
  const rect = body.getBoundingClientRect();
  const { columnGap, rowGap } = getComputedStyle(body);
  return {
    rect,
    width: (rect.width + parseFloat(columnGap)) / card.w,
    height: (rect.height + parseFloat(rowGap)) / getCardInnerRows(card),
  };
};

type ResizeEvent = ReactPointerEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>;

interface CanvasElementProps {
  element: SmartHomeLayoutElement;
  placement: GridPlacement;
  source: string;
  selected: boolean;
  onSelect: () => void;
  onResizeStart: (id: string, event: ResizeEvent) => void;
}

function CanvasElement({ element, placement, source, selected, onSelect, onResizeStart }: CanvasElementProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: element.id });
  const name = element.label || element.entityId || t(`views.${element.view}`);
  return (
    <div
      ref={setNodeRef}
      data-element-id={element.id}
      className={`${layoutClasses.elementCell} ${classes.canvasElement}`}
      data-dragging={isDragging}
      data-selected={selected}
      style={placementStyle(placement)}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={classes.elementHandle}
        aria-label={t("moveElement", { name })}
        aria-pressed={selected}
        onClick={onSelect}
        onFocus={onSelect}
      />
      {/* The real element, inert: nothing in it can reach a device while editing. */}
      <div className={classes.elementPreview} inert>
        <LayoutElement element={element} source={source} />
      </div>
      <button
        type="button"
        className={classes.elementResize}
        aria-label={t("resizeElement", { name })}
        onPointerDown={(event) => onResizeStart(element.id, event)}
        onKeyDown={(event) => onResizeStart(element.id, event)}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      />
    </div>
  );
}

interface CanvasCardProps {
  card: SmartHomeLayoutCard;
  placement: GridPlacement;
  elementPlacements: readonly GridPlacement[];
  elements: ReadonlyMap<string, SmartHomeLayoutElement>;
  source: string;
  selected: boolean;
  selectedElementId: string | null;
  /** An element type from the insert bar is being dragged over this card. */
  dropTarget: boolean;
  onSelect: (id: string) => void;
  onSelectElement: (id: string) => void;
  onResizeStart: (id: string, event: ResizeEvent) => void;
  onElementResizeStart: (id: string, event: ResizeEvent) => void;
}

function CanvasCard({
  card,
  placement,
  elementPlacements,
  elements,
  source,
  selected,
  selectedElementId,
  dropTarget,
  onSelect,
  onSelectElement,
  onResizeStart,
  onElementResizeStart,
}: CanvasCardProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const tLayout = useI18n("widget.smartHome-controls.layout");
  // Only the grip moves the card, so pressing an element inside it moves the element instead.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      className={classes.canvasCard}
      onPointerDown={() => onSelect(card.id)}
      data-selected={selected && selectedElementId === null}
      data-drop-target={dropTarget}
      data-dragging={isDragging}
      style={placementStyle(placement)}
    >
      <section className={layoutClasses.card} data-palette={getCardPalette(card)} {...getCardSurface(card)}>
        <CardColors card={card}>
          {card.colors === "state" ? <CardTint card={card} source={source} /> : null}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className={classes.cardHandle}
            aria-label={t("moveCard", { name: card.title ?? t("untitledCard") })}
            onFocus={() => onSelect(card.id)}
          >
            <IconGripHorizontal size={14} aria-hidden />
          </div>
          {card.title ? <h4 className={layoutClasses.cardTitle}>{card.title}</h4> : null}
          <div
            className={layoutClasses.cardBody}
            data-card-body={card.id}
            style={cardBodyStyle(placement.w, Math.max(1, placement.h - getCardTitleRows(card)))}
          >
            {elementPlacements.map((elementPlacement) => {
              const element = elements.get(elementPlacement.id);
              return element ? (
                <CanvasElement
                  key={element.id}
                  element={element}
                  placement={elementPlacement}
                  source={source}
                  selected={element.id === selectedElementId}
                  onSelect={() => onSelectElement(element.id)}
                  onResizeStart={onElementResizeStart}
                />
              ) : null;
            })}
            {elementPlacements.length === 0 && <span className={layoutClasses.emptyCard}>{tLayout("emptyCard")}</span>}
          </div>
        </CardColors>
      </section>
      <button
        type="button"
        className={classes.resizeHandle}
        aria-label={t("resize", { name: card.title || t("untitledCard") })}
        onPointerDown={(event) => onResizeStart(card.id, event)}
        onKeyDown={(event) => onResizeStart(card.id, event)}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      />
    </div>
  );
}

interface EditorProps extends SmartHomeLayoutEditorProps {
  onClose: () => void;
}

export default function SmartHomeLayoutEditor({ integrationId, layout, onSave, onClose, previewSize }: EditorProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const tCommon = useI18n();
  const board = useOptionalBoard();
  const catalog = useSmartHomeCatalog(integrationId);
  // Elements stored outside their card (old or hand-written layouts) move back into free space.
  const history = useUndoable<EditorDraft>(() => ({
    cards: layout.cards.map((card) => fitElementsIntoCard(card) ?? card),
    templates: layout.templates,
  }));
  const { update: updateDraft } = history;
  const cards = history.value.cards;
  const setCards = useCallback(
    (next: SmartHomeLayoutCard[] | ((current: SmartHomeLayoutCard[]) => SmartHomeLayoutCard[])) =>
      updateDraft((draft) => {
        const value = typeof next === "function" ? next(draft.cards) : next;
        return value === draft.cards ? draft : { ...draft, cards: value };
      }),
    [updateDraft],
  );
  // No undo while a drag or resize is running: the gesture would end on the old arrangement and undo the undo.
  const undo = () => {
    if (!transaction.current) history.undo();
  };
  const redo = () => {
    if (!transaction.current) history.redo();
  };
  useHotkeys([
    ["mod+Z", undo],
    ["mod+shift+Z", redo],
    ["mod+Y", redo],
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(cards[0]?.id ?? null);
  // An element of the selected card shown in the panel instead of the card.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  // An element just added without an entity: its picker opens right away.
  const [pickEntityId, setPickEntityId] = useState<string | null>(null);
  // An element type dragged from the insert bar, and the card and cell under the pointer.
  const [insertDrag, setInsertDrag] = useState<{
    view: SmartHomeElementView;
    target: { cardId: string; x: number; y: number } | null;
  } | null>(null);
  const selectCard = (id: string | null) => {
    setSelectedId(id);
    setSelectedElementId(null);
  };
  const [shareOpened, setShareOpened] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(false);
  const shownSize = previewSize;
  const [templateDevice, setTemplateDevice] = useState<string | null>(null);
  const [templateOpened, setTemplateOpened] = useState(false);
  // Positions while dragging or resizing; the cards themselves change once, when the gesture ends.
  const [preview, setPreview] = useState<TransactionalGridState | null>(null);
  const transaction = useRef<GridTransaction | null>(null);
  const { ref: sizeRef, width: canvasWidth } = useElementSize<HTMLDivElement>();
  const canvasNode = useRef<HTMLDivElement | null>(null);
  const canvasRef = useMergedRef(sizeRef, canvasNode);
  const pitchX = (canvasWidth + LAYOUT_GAP) / SMART_HOME_LAYOUT_COLUMNS;
  // The canvas is exactly the widget: its height is split into the layout's rows, like on the board.
  const layoutRows = SMART_HOME_LAYOUT_ROWS;
  const gridCells = useMemo(
    () =>
      Array.from({ length: SMART_HOME_LAYOUT_COLUMNS * layoutRows }, (_, index) => ({
        key: index,
        column: (index % SMART_HOME_LAYOUT_COLUMNS) + 1,
        row: Math.floor(index / SMART_HOME_LAYOUT_COLUMNS) + 1,
      })),
    [layoutRows],
  );
  const canvasHeight = shownSize?.height ?? FALLBACK_CANVAS_HEIGHT;
  const rowHeight = Math.max(getMinimumRowHeight(cards), (canvasHeight + LAYOUT_GAP) / layoutRows - LAYOUT_GAP);
  const gridHeight = rowHeight * layoutRows + LAYOUT_GAP * (layoutRows - 1);
  const pitchY = rowHeight + LAYOUT_GAP;

  const draft = useMemo(
    (): SmartHomeLayout => ({
      version: SMART_HOME_LAYOUT_VERSION,
      cards: history.value.cards,
      ...(history.value.templates?.length ? { templates: history.value.templates } : {}),
    }),
    [history.value],
  );
  const templates = history.value.templates ?? [];
  const blockIds = useMemo(
    () => getLayoutEntityIds(draft, integrationId).map((entityId) => createEntityBlockId(entityId, integrationId)),
    [draft, integrationId],
  );
  const graphIds = useMemo(() => getLayoutGraphEntityIds(draft, integrationId), [draft, integrationId]);
  const elements = useMemo(
    () => new Map(cards.flatMap((card) => card.elements.map((element) => [element.id, element] as const))),
    [cards],
  );
  const cardPlacement = (card: SmartHomeLayoutCard): GridPlacement =>
    findGrid(preview, GRID_ID)?.placements.find((placement) => placement.id === card.id) ?? card;
  const elementPlacements = (card: SmartHomeLayoutCard) => {
    const inner = findGrid(preview, getInnerGridId(card.id))?.placements;
    if (inner) return inner;
    // While a card is resized, its elements scale with it.
    const shown = cardPlacement(card);
    const scaled = shown.w !== card.w || shown.h !== card.h ? scaleElementPlacements(card, shown.w, shown.h) : null;
    return scaled ?? getElementPlacements(card);
  };
  const cardOptions = cards.map((card, position) => ({
    value: card.id,
    label: card.title || t("numberedCard", { number: position + 1 }),
  }));
  const selected = cards.find((card) => card.id === selectedId) ?? null;
  const selectedElement = selected?.elements.find((element) => element.id === selectedElementId) ?? null;
  const ownerOf = (elementId: string) =>
    cards.find((card) => card.elements.some((element) => element.id === elementId));
  const selectElement = (elementId: string) => {
    const owner = ownerOf(elementId);
    if (!owner) return;
    setSelectedId(owner.id);
    setSelectedElementId(elementId);
  };
  const index = catalog.status === "ready" ? catalog.index : null;
  const deviceOptions = useMemo(
    () => (index?.catalog.devices ?? []).map((device) => ({ value: device.id, label: device.name })),
    [index],
  );

  const gestureCleanup = useRef<() => void>(() => {});
  useEffect(() => () => gestureCleanup.current(), []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor<KeyboardSensorOptions>(KeyboardSensor, {
      coordinateGetter(event, { active, currentCoordinates }) {
        const dx = Number(event.code === "ArrowRight") - Number(event.code === "ArrowLeft");
        const dy = Number(event.code === "ArrowDown") - Number(event.code === "ArrowUp");
        if (!dx && !dy) return;
        const node = canvasNode.current?.querySelector(`[data-element-id="${CSS.escape(String(active))}"]`);
        const body = node?.closest<HTMLElement>("[data-card-body]");
        const owner = body && cards.find((card) => card.id === body.dataset.cardBody);
        const cell = body && owner ? cardCellSize(body, owner) : { width: pitchX, height: pitchY };
        return { x: currentCoordinates.x + dx * cell.width, y: currentCoordinates.y + dy * cell.height };
      },
    }),
  );

  const showPreview = (next: GridTransaction) => {
    transaction.current = next;
    setPreview((current) => (current && stateKey(current) === stateKey(next.preview) ? current : next.preview));
  };

  const finish = () => {
    const current = transaction.current;
    transaction.current = null;
    setPreview(null);
    // Pressing a handle without moving it changes nothing, so it is no edit (and keeps Redo).
    if (current && !sameGridState(current.snapshot, current.preview)) {
      setCards((existing) => {
        const next = applyGridState(existing, current.preview);
        // An element gesture places the elements itself; a card that changed size scales its elements with it.
        if (current.snapshot.grids.length > 1) return next;
        return next.map((card) => {
          const before = existing.find((candidate) => candidate.id === card.id);
          if (!before || (before.w === card.w && before.h === card.h)) return card;
          return { ...resizeCardWithElements(before, card.w, card.h), x: card.x, y: card.y };
        });
      });
    }
  };

  // The pointer as the browser reports it; dnd-kit's own delta comes from React state and can trail a quick drop.
  const pointer = useRef<{ origin: { x: number; y: number }; last: { x: number; y: number } } | null>(null);
  // Where inside the dragged element it was grabbed, in cells, so it does not jump to the pointer.
  const grab = useRef<{ column: number; row: number; sourceCardId: string } | null>(null);
  const trackPointer = (event: PointerEvent) => {
    if (pointer.current) pointer.current.last = { x: event.clientX, y: event.clientY };
  };
  const stopTracking = () => {
    window.removeEventListener("pointermove", trackPointer, { capture: true });
    window.removeEventListener("pointerup", trackPointer, { capture: true });
    pointer.current = null;
    grab.current = null;
  };

  const cancel = () => {
    stopTracking();
    transaction.current = null;
    setPreview(null);
    setInsertDrag(null);
  };

  const isCard = (id: string) => cards.some((card) => card.id === id);

  const previewCardMove = (activeId: string, deltaX: number, deltaY: number) => {
    const current = transaction.current;
    const start = findGrid(current?.snapshot ?? null, GRID_ID)?.placements.find(
      (placement) => placement.id === activeId,
    );
    if (!current || !start || pitchX <= 0) return;
    const result = previewGridMove(current, {
      targetGridId: GRID_ID,
      x: start.x + Math.round(deltaX / pitchX),
      y: start.y + Math.round(deltaY / pitchY),
    });
    if (result.accepted) showPreview(result.transaction);
  };

  const cardBodies = () => [...(canvasNode.current?.querySelectorAll<HTMLElement>("[data-card-body]") ?? [])];

  /** The card under a point on screen and the cell of its grid there. */
  const cellAt = (point: { x: number; y: number }) => {
    const body = cardBodies().find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    });
    const card = cards.find((candidate) => candidate.id === body?.dataset.cardBody);
    if (!body || !card) return null;
    const cell = cardCellSize(body, card);
    return {
      cardId: card.id,
      x: Math.floor((point.x - cell.rect.left) / cell.width),
      y: Math.floor((point.y - cell.rect.top) / cell.height),
    };
  };

  /** Moves the element to the card under the pointer, keeping the spot where it was grabbed under the pointer. */
  const previewElementMove = (point: { x: number; y: number }) => {
    const current = transaction.current;
    const grabbed = grab.current;
    if (!current || !grabbed) return;
    const bodies = cardBodies();
    const target =
      bodies.find((body) => {
        const rect = body.getBoundingClientRect();
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
      }) ?? bodies.find((body) => body.dataset.cardBody === grabbed.sourceCardId);
    const card = cards.find((candidate) => candidate.id === target?.dataset.cardBody);
    if (!target || !card) return;
    const cell = cardCellSize(target, card);
    const result = previewGridMove(
      current,
      {
        targetGridId: getInnerGridId(card.id),
        x: Math.floor((point.x - cell.rect.left) / cell.width) - grabbed.column,
        y: Math.floor((point.y - cell.rect.top) / cell.height) - grabbed.row,
      },
      { guards: [elementLimitGuard] },
    );
    if (result.accepted) showPreview(result.transaction);
  };

  /** Arrow keys move an element within its own card, one cell per step. */
  const previewElementKeyboardMove = (id: string, delta: { x: number; y: number }) => {
    const current = transaction.current;
    const owner = cards.find((card) => card.elements.some((element) => element.id === id));
    if (!current || !owner) return;
    const body = canvasNode.current?.querySelector(`[data-card-body="${CSS.escape(owner.id)}"]`);
    const gridId = getInnerGridId(owner.id);
    const start = findGrid(current.snapshot, gridId)?.placements.find((placement) => placement.id === id);
    if (!body || !start) return;
    const cell = cardCellSize(body, owner);
    const result = previewGridMove(current, {
      targetGridId: gridId,
      x: start.x + Math.round(delta.x / cell.width),
      y: start.y + Math.round(delta.y / cell.height),
    });
    if (result.accepted) showPreview(result.transaction);
  };

  const beginGesture = (id: string, withCardGrids: boolean) => {
    try {
      return beginGridTransaction(toGridState(cards, withCardGrids, layoutRows), { activeId: id });
    } catch {
      notApplied(t("invalidPlacement"));
      return null;
    }
  };

  const moveElementToCard = (element: SmartHomeLayoutElement, targetId: string) => {
    const target = cards.find((card) => card.id === targetId);
    const start = beginGesture(element.id, true);
    if (!target || !selected || !start) return;
    const placement = getElementPlacements(selected).find((item) => item.id === element.id);
    if (!placement) return;
    const slot = findFreeGridSlot(
      getElementPlacements(target),
      { columns: target.w, rows: getCardInnerRows(target) },
      placement,
    );
    if (!slot) return notApplied(t("noRoom"));
    const result = previewGridMove(
      start,
      { targetGridId: getInnerGridId(targetId), x: slot.x, y: slot.y },
      { guards: [elementLimitGuard] },
    );
    if (!result.accepted) return notApplied(t("noRoom"));
    transaction.current = result.transaction;
    finish();
    setSelectedId(targetId);
    setSelectedElementId(element.id);
  };

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const id = String(active.id);
    if (isInsert(id)) {
      // A new element: no grid gesture, only where the pointer goes.
      if (!(activatorEvent instanceof PointerEvent)) return;
      const last = { x: activatorEvent.clientX, y: activatorEvent.clientY };
      pointer.current = { origin: last, last };
      gestureCleanup.current = stopTracking;
      window.addEventListener("pointermove", trackPointer, { capture: true, passive: true });
      window.addEventListener("pointerup", trackPointer, { capture: true, passive: true });
      setInsertDrag({ view: id.slice(INSERT_DRAG_PREFIX.length) as SmartHomeElementView, target: null });
      return;
    }
    const card = isCard(id);
    transaction.current = beginGesture(id, !card);
    if (!transaction.current) return;
    if (!(activatorEvent instanceof PointerEvent)) return;
    const rect = canvasNode.current?.getBoundingClientRect();
    if (!rect) return;
    const last = { x: activatorEvent.clientX, y: activatorEvent.clientY };
    pointer.current = { origin: { x: last.x - rect.left, y: last.y - rect.top }, last };
    gestureCleanup.current = stopTracking;
    // Capturing on window runs before dnd-kit sees the release, so the drop uses the true final position.
    window.addEventListener("pointermove", trackPointer, { capture: true, passive: true });
    window.addEventListener("pointerup", trackPointer, { capture: true, passive: true });
    if (card) {
      selectCard(id);
      return;
    }
    const owner = cards.find((candidate) => candidate.elements.some((element) => element.id === id));
    const node = canvasNode.current?.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
    const body = node?.parentElement;
    if (!owner || !node || !body) return;
    selectElement(id);
    const cell = cardCellSize(body, owner);
    const elementRect = node.getBoundingClientRect();
    grab.current = {
      column: Math.floor((last.x - elementRect.left) / cell.width),
      row: Math.floor((last.y - elementRect.top) / cell.height),
      sourceCardId: owner.id,
    };
  };

  const settle = (id: string, delta: { x: number; y: number }) => {
    const tracked = pointer.current;
    if (isCard(id)) {
      const rect = canvasNode.current?.getBoundingClientRect();
      previewCardMove(
        id,
        tracked && rect ? tracked.last.x - rect.left - tracked.origin.x : delta.x,
        tracked && rect ? tracked.last.y - rect.top - tracked.origin.y : delta.y,
      );
    } else if (tracked) {
      previewElementMove(tracked.last);
    } else {
      previewElementKeyboardMove(id, delta);
    }
  };

  const onDragMove = ({ active, delta }: DragMoveEvent) => {
    const id = String(active.id);
    if (!isInsert(id)) return settle(id, delta);
    const target = pointer.current ? cellAt(pointer.current.last) : null;
    setInsertDrag((current) =>
      current &&
      (current.target?.cardId !== target?.cardId || current.target?.x !== target?.x || current.target?.y !== target?.y)
        ? { ...current, target }
        : current,
    );
  };

  const onDragEnd = ({ active, delta }: DragEndEvent) => {
    const id = String(active.id);
    if (isInsert(id)) {
      const target = pointer.current ? cellAt(pointer.current.last) : null;
      stopTracking();
      setInsertDrag(null);
      if (target) addElement(id.slice(INSERT_DRAG_PREFIX.length) as SmartHomeElementView, target.cardId, target);
      return;
    }
    if (pointer.current) settle(id, delta);
    // An element dropped on another card selects that card, so its settings show the element.
    const owner = transaction.current?.preview.grids.find(
      (grid) => grid.ownerPlacementId && grid.placements.some((placement) => placement.id === id),
    )?.ownerPlacementId;
    stopTracking();
    finish();
    if (owner) {
      setSelectedId(owner);
      setSelectedElementId(id);
    }
  };

  /** Corner resize for cards (cells of the widget grid) and elements (cells of their card's grid). */
  const startResize = (
    id: string,
    event: ResizeEvent,
    options: { withCardGrids: boolean; cell: { width: number; height: number }; minWidth: number; minHeight: number },
  ) => {
    if ("pointerId" in event && (!event.isPrimary || event.button !== 0)) return;
    if ("key" in event && !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.stopPropagation();
    event.preventDefault();
    // One gesture at a time: a second finger on another handle waits until the first one is done.
    if (transaction.current) return;
    const start = beginGesture(id, options.withCardGrids);
    if (!start) return;
    if ("key" in event) {
      const result = previewGridResize(start, {
        direction: "se",
        deltaColumns: Number(event.key === "ArrowRight") - Number(event.key === "ArrowLeft"),
        deltaRows: Number(event.key === "ArrowDown") - Number(event.key === "ArrowUp"),
        minWidth: options.minWidth,
        minHeight: options.minHeight,
      });
      if (result.accepted) {
        transaction.current = result.transaction;
        finish();
      }
      return;
    }
    transaction.current = start;
    const origin = { x: event.clientX, y: event.clientY };
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    const pointerId = event.pointerId;
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const result = previewGridResize(start, {
        direction: "se",
        deltaColumns: Math.round((moveEvent.clientX - origin.x) / options.cell.width),
        deltaRows: Math.round((moveEvent.clientY - origin.y) / options.cell.height),
        minWidth: options.minWidth,
        minHeight: options.minHeight,
      });
      if (result.accepted) showPreview(result.transaction);
    };
    const cleanup = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onLost);
      handle.removeEventListener("lostpointercapture", onLost);
      window.removeEventListener("keydown", onEscape, true);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      gestureCleanup.current = () => {};
    };
    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      onMove(upEvent);
      cleanup();
      finish();
    };
    const onCancel = () => {
      cleanup();
      cancel();
    };
    const onEscape = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== "Escape") return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      onCancel();
    };
    const onLost = (lostEvent: PointerEvent) => {
      if (lostEvent.pointerId === pointerId) onCancel();
    };
    gestureCleanup.current = cleanup;
    window.addEventListener("keydown", onEscape, true);
    handle.addEventListener("lostpointercapture", onLost);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onLost);
  };

  const onCardResizeStart = (cardId: string, event: ResizeEvent) => {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (!card) return;
    setSelectedId(cardId);
    // Elements shrink with the card until one of them reaches its minimum; there the card stops.
    const min = getCardScaledMinSize(card);
    startResize(cardId, event, {
      withCardGrids: false,
      cell: { width: pitchX, height: pitchY },
      minWidth: Math.min(min.w, SMART_HOME_LAYOUT_COLUMNS - card.x),
      minHeight: Math.min(min.h, SMART_HOME_LAYOUT_ROWS - card.y),
    });
  };

  const onElementResizeStart = (elementId: string, event: ResizeEvent) => {
    const owner = cards.find((card) => card.elements.some((element) => element.id === elementId));
    const element = owner?.elements.find((candidate) => candidate.id === elementId);
    const body = event.currentTarget.closest("[data-card-body]");
    if (!owner || !element || !body) return;
    setSelectedId(owner.id);
    startResize(elementId, event, {
      withCardGrids: true,
      cell: cardCellSize(body, owner),
      minWidth: 1,
      minHeight: getElementMinRows(element),
    });
  };

  const notApplied = (message: string) => showErrorNotification({ title: t("notApplied"), message });

  const updateCard = (next: SmartHomeLayoutCard) => {
    const placed = placeCardEdit(cards, next);
    const edited = placed.find((card) => card.id === next.id);
    if (!edited || elementsFitCard(edited)) {
      setCards(() => placed);
      return;
    }
    // Elements outside the card's final size move into free space; without any, the edit is not applied.
    const fitted = fitElementsIntoCard(edited);
    if (!fitted) {
      notApplied(t("cardTooSmall"));
      return;
    }
    setCards(() => placed.map((card) => (card.id === fitted.id ? fitted : card)));
  };

  /** The cards after an edit of one of them; a size change pushes overlapping cards down, as a resize would. */
  const placeCardEdit = (existing: readonly SmartHomeLayoutCard[], next: SmartHomeLayoutCard) => {
    const sized = existing.find((card) => card.id === next.id);
    const replaced = existing.map((card) => (card.id === next.id ? next : card));
    if (!sized || (sized.w === next.w && sized.h === next.h)) return replaced;
    // A size change pushes overlapping cards down, exactly like a resize gesture, but never out of the widget.
    // When there is no room, the card keeps its size and its elements share the space it has.
    const kept = existing.map((card) => (card.id === next.id ? { ...next, w: sized.w, h: sized.h } : card));
    const fittedHeight = Math.min(next.h, SMART_HOME_LAYOUT_ROWS - next.y);
    const resolved = resolvePinnedGridCollisions(
      replaced.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
      { id: next.id, x: next.x, y: next.y, w: next.w, h: fittedHeight },
      SMART_HOME_LAYOUT_COLUMNS,
    );
    if (resolved.some((placement) => placement.y + placement.h > SMART_HOME_LAYOUT_ROWS)) return kept;
    return applyGridState(replaced, {
      grids: [{ id: GRID_ID, columnCount: SMART_HOME_LAYOUT_COLUMNS, placements: resolved }],
    });
  };

  /** Changes the selected card's elements; new or bigger ones grow the card so nothing is cut off. */
  const setCardElements = (card: SmartHomeLayoutCard, nextElements: SmartHomeLayoutElement[]) => {
    const next = { ...card, elements: nextElements };
    updateCard({ ...next, h: Math.max(card.h, getCardMinSize(next).h) });
  };

  /** A new element on a card: where it was dropped, else in free space; the panel then shows it. */
  const addElement = (
    view: SmartHomeElementView,
    cardId: string | null = selectedId,
    at?: { x: number; y: number },
    entityId = "",
  ) => {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (!card) return notApplied(t("selectCardFirst"));
    if (card.elements.length >= SMART_HOME_LAYOUT_MAX_ELEMENTS) return notApplied(t("noRoom"));
    const element = placeNewElement(card, { id: createId(), source: integrationId, entityId, view }, at);
    setCardElements(card, [...card.elements, element]);
    setSelectedId(card.id);
    setSelectedElementId(element.id);
    setPickEntityId(entityId || staticElementViews.has(view) ? null : element.id);
  };

  const addEntityElement = (entityId: string) => {
    const entity = index?.entitiesById.get(entityId);
    if (entity) addElement(getDefaultView(entity), selectedId, undefined, entity.id);
  };

  // A new card needs at least the minimum card size free inside the widget.
  const isFull =
    cards.length >= SMART_HOME_LAYOUT_MAX_CARDS ||
    findFreeSlot(cards, SMART_HOME_CARD_MIN.w, SMART_HOME_CARD_MIN.h) === null;

  const addCards = (created: SmartHomeLayoutCard | null) => {
    // A new card, copy or template obeys the same grid rules as an import: inside the widget, nothing on top of
    // anything and every id once.
    if (!created || cards.length >= SMART_HOME_LAYOUT_MAX_CARDS || !isValidArrangement([...cards, created])) {
      notApplied(t("noRoom"));
      return;
    }
    setCards((existing) => [...existing, created]);
    selectCard(created.id);
  };

  const templateTarget = () => {
    if (!index || !templateDevice) return null;
    return {
      device: index.catalog.devices?.find((candidate) => candidate.id === templateDevice),
      entities: index.entities.filter((entity) => entity.deviceId === templateDevice),
    };
  };

  const addPreset = (preset: SmartHomeLayoutPreset) => {
    const target = templateTarget();
    if (!target) return;
    addCards(createCard(cards, buildPresetElements(preset, integrationId, target.entities), target.device?.name));
  };

  const addOwnTemplate = (template: SmartHomeLayoutTemplate) => {
    const target = templateTarget();
    if (!target) return;
    addCards(cardFromTemplate(template, target.entities, integrationId, cards, target.device?.name));
  };

  const saveTemplate = (card: SmartHomeLayoutCard, name: string) => {
    if (!index) return;
    const template = cardToTemplate(card, name, index.entitiesById);
    updateDraft((current) => ({
      ...current,
      templates: [...(current.templates ?? []), template].slice(-SMART_HOME_LAYOUT_MAX_TEMPLATES),
    }));
  };

  const removeTemplate = (id: string) =>
    updateDraft((current) => {
      const next = (current.templates ?? []).filter((template) => template.id !== id);
      return { ...current, templates: next.length > 0 ? next : undefined };
    });

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-home-layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLayout = () => {
    let parsed: SmartHomeLayout;
    try {
      parsed = smartHomeLayoutSchema.parse(JSON.parse(importText));
    } catch {
      setImportError(true);
      return;
    }
    if (parsed.cards.length === 0 && !parsed.templates?.length) {
      setImportError(true);
      return;
    }
    // Cards on top of each other, or elements outside their card, cannot be edited; such a layout is refused.
    if (!isValidArrangement(parsed.cards)) {
      setImportError(true);
      return;
    }
    updateDraft((current) => {
      // Imported templates join the saved ones; a template imported twice is kept once.
      const known = new Set((current.templates ?? []).map((template) => template.id));
      const mergedTemplates = [
        ...(current.templates ?? []),
        ...(parsed.templates ?? []).filter((template) => !known.has(template.id)),
      ].slice(-SMART_HOME_LAYOUT_MAX_TEMPLATES);
      return {
        cards: withSource(parsed.cards, integrationId),
        templates: mergedTemplates.length > 0 ? mergedTemplates : undefined,
      };
    });
    setShareOpened(false);
    setImportText("");
    setImportError(false);
    selectCard(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={cancel}
    >
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="wrap">
            <InsertBar
              canAddCard={!isFull}
              canAddElement={cards.length > 0}
              onAddCard={() => addCards(createCard(cards, []))}
              onAddElement={(view) => addElement(view)}
            />
            {/* A device and what to build from it, in one place: the toolbar keeps a single row. */}
            <Popover
              opened={templateOpened}
              onChange={setTemplateOpened}
              position="bottom-start"
              width={300}
              shadow="md"
              trapFocus
              returnFocus
            >
              <Popover.Target>
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<IconTemplate size={16} />}
                  disabled={isFull || (!index && templates.length === 0)}
                  onClick={() => setTemplateOpened((opened) => !opened)}
                >
                  {t("addTemplate")}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Select
                    size="sm"
                    data-autofocus
                    label={t("templateDevice")}
                    placeholder={t("templateDevice")}
                    data={deviceOptions}
                    value={templateDevice}
                    onChange={setTemplateDevice}
                    searchable
                    clearable
                    disabled={!index}
                    // In the popover's own layer, so picking a device does not count as a click outside it.
                    comboboxProps={{ withinPortal: false }}
                  />
                  {smartHomeLayoutPresets.map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant="light"
                      justify="flex-start"
                      disabled={!templateDevice}
                      onClick={() => {
                        addPreset(preset);
                        setTemplateOpened(false);
                      }}
                    >
                      {t(`preset.${preset}`)}
                    </Button>
                  ))}
                  {templates.length > 0 && (
                    <>
                      <Text size="xs" fw={500} c="dimmed" mt={4}>
                        {t("myTemplates")}
                      </Text>
                      {templates.map((template) => (
                        <Group key={template.id} gap={4} wrap="nowrap">
                          <Button
                            flex={1}
                            size="sm"
                            variant="light"
                            justify="flex-start"
                            disabled={!templateDevice}
                            onClick={() => {
                              addOwnTemplate(template);
                              setTemplateOpened(false);
                            }}
                          >
                            {template.name}
                          </Button>
                          <ActionIcon
                            size="input-sm"
                            variant="subtle"
                            color="red"
                            aria-label={t("deleteTemplate", { name: template.name })}
                            onClick={() => removeTemplate(template.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>
          <Group gap="xs" wrap="wrap">
            <Tooltip label={t("undo")}>
              <ActionIcon
                variant="default"
                size="input-sm"
                disabled={!history.canUndo}
                onClick={undo}
                aria-label={t("undo")}
              >
                <IconArrowBackUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("redo")}>
              <ActionIcon
                variant="default"
                size="input-sm"
                disabled={!history.canRedo}
                onClick={redo}
                aria-label={t("redo")}
              >
                <IconArrowForwardUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Popover
              opened={shareOpened}
              onChange={setShareOpened}
              position="bottom-end"
              width="min(340px, calc(100vw - 16px))"
              shadow="md"
              trapFocus
              returnFocus
            >
              <Popover.Target>
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<IconShare size={16} />}
                  onClick={() => setShareOpened((opened) => !opened)}
                >
                  {t("share")}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    {t("shareHint")}
                  </Text>
                  <Group gap="xs" grow>
                    <CopyButton value={JSON.stringify(draft)}>
                      {({ copied, copy }) => (
                        <Button
                          size="sm"
                          variant="light"
                          color={copied ? "teal" : undefined}
                          leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          onClick={copy}
                        >
                          {copied ? t("copied") : t("copyLayout")}
                        </Button>
                      )}
                    </CopyButton>
                    <Button size="sm" variant="light" leftSection={<IconDownload size={16} />} onClick={download}>
                      {t("download")}
                    </Button>
                  </Group>
                  <Textarea
                    size="sm"
                    data-autofocus
                    label={t("importLayout")}
                    placeholder={t("importPlaceholder")}
                    autosize
                    minRows={2}
                    maxRows={6}
                    value={importText}
                    error={importError ? t("importInvalid") : undefined}
                    onChange={(event) => {
                      setImportText(event.currentTarget.value);
                      setImportError(false);
                    }}
                  />
                  <Button size="sm" disabled={importText.trim() === ""} onClick={importLayout}>
                    {t("importApply")}
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Button
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => {
                setCards([]);
                selectCard(null);
              }}
              disabled={cards.length === 0}
            >
              {t("clear")}
            </Button>
          </Group>
        </Group>

        <div className={classes.editor}>
          <div className={`${controlClasses.root} ${classes.canvasScroll}`}>
            {previewSize && (
              <div className={classes.canvasHint}>
                {t("previewHint", { width: Math.round(previewSize.width), height: Math.round(previewSize.height) })}
              </div>
            )}
            <SmartHomeInteractionProvider blocked="editing">
              <SmartHomeLiveProvider
                integrationId={integrationId}
                blockIds={blockIds}
                roomDomains={[]}
                excludedEntityIds={[]}
                historyEntityIds={graphIds}
              >
                <div
                  ref={canvasRef}
                  className={classes.canvas}
                  data-empty={cards.length === 0}
                  style={
                    {
                      "--opacity": (board?.opacity ?? 100) / 100,
                      // Exactly the widget's width: a larger widget scrolls here rather than being previewed narrower.
                      width: shownSize ? shownSize.width + CANVAS_PADDING * 2 : undefined,
                      // Explicit, because the canvas is a size container and so does not grow with its rows.
                      height: gridHeight + CANVAS_PADDING * 2,
                      gridTemplateColumns: `repeat(${SMART_HOME_LAYOUT_COLUMNS}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${layoutRows}, ${rowHeight}px)`,
                      gap: LAYOUT_GAP,
                    } as CSSProperties
                  }
                >
                  {/* The widget's grid, cell by cell: shows how big the widget is and where cards snap to. */}
                  {gridCells.map(({ key, column, row }) => (
                    <div
                      key={key}
                      className={classes.canvasCell}
                      style={{ gridColumn: column, gridRow: row }}
                      aria-hidden
                    />
                  ))}
                  {cards.map((card) => (
                    <CanvasCard
                      key={card.id}
                      card={card}
                      placement={cardPlacement(card)}
                      elementPlacements={elementPlacements(card)}
                      elements={elements}
                      source={integrationId}
                      selected={card.id === selectedId}
                      selectedElementId={card.id === selectedId ? selectedElementId : null}
                      dropTarget={insertDrag?.target?.cardId === card.id}
                      onSelect={selectCard}
                      onSelectElement={selectElement}
                      onResizeStart={onCardResizeStart}
                      onElementResizeStart={onElementResizeStart}
                    />
                  ))}
                  {cards.length === 0 && (
                    <Stack className={classes.canvasEmpty} gap="sm" align="center">
                      <Text size="sm" c="dimmed" ta="center">
                        {t("canvasEmpty")}
                      </Text>
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconPlus size={16} />}
                        onClick={() => addCards(createCard(cards, []))}
                      >
                        {t("addCard")}
                      </Button>
                    </Stack>
                  )}
                </div>
              </SmartHomeLiveProvider>
            </SmartHomeInteractionProvider>
          </div>

          <div className={classes.panel}>
            {selected && selectedElement ? (
              <ElementInspector
                key={selectedElement.id}
                element={selectedElement}
                card={selected}
                entity={index?.entitiesById.get(selectedElement.entityId)}
                catalog={catalog}
                source={integrationId}
                cardOptions={cardOptions}
                autoFocusEntity={pickEntityId === selectedElement.id}
                onChange={(next) => {
                  if (next.entityId) setPickEntityId(null);
                  setCardElements(
                    selected,
                    selected.elements.map((candidate) => (candidate.id === next.id ? next : candidate)),
                  );
                }}
                onBack={() => setSelectedElementId(null)}
                onMoveToCard={(cardId) => moveElementToCard(selectedElement, cardId)}
                onDuplicate={() => {
                  if (selected.elements.length >= SMART_HOME_LAYOUT_MAX_ELEMENTS) return notApplied(t("noRoom"));
                  // A copy has no position of its own, so it takes free space and never covers what is there.
                  const { x: _x, y: _y, ...rest } = selectedElement;
                  const copy = { ...rest, id: createId() };
                  setCardElements(selected, [...selected.elements, copy]);
                  setSelectedElementId(copy.id);
                }}
                onRemove={() => {
                  setCardElements(
                    selected,
                    selected.elements.filter((candidate) => candidate.id !== selectedElement.id),
                  );
                  setSelectedElementId(null);
                }}
              />
            ) : selected ? (
              <CardInspector
                key={selected.id}
                card={selected}
                catalog={catalog}
                entities={index?.entitiesById ?? null}
                onChange={updateCard}
                onSelectElement={setSelectedElementId}
                onAddEntity={addEntityElement}
                onDuplicate={() => addCards(duplicateCard(selected, cards))}
                onSaveTemplate={(name) => saveTemplate(selected, name)}
                onRemove={() => {
                  setCards((existing) => existing.filter((card) => card.id !== selected.id));
                  selectCard(null);
                }}
              />
            ) : (
              <Text size="sm" c="dimmed" p="md">
                {t("noSelection")}
              </Text>
            )}
          </div>
        </div>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {tCommon("common.action.cancel")}
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {tCommon("common.action.apply")}
          </Button>
        </Group>
      </Stack>
      {/* The dragged element type follows the pointer. */}
      {/* On the page itself: inside the dialog, whose transform moves fixed boxes, it would trail beside the pointer. */}
      {createPortal(
        <DragOverlay dropAnimation={null} zIndex={1000}>
          {insertDrag ? <InsertDragPreview view={insertDrag.view} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

function InsertDragPreview({ view }: { view: SmartHomeElementView }) {
  const Icon = viewIcons[view];
  return (
    <ThemeIcon size={40} radius="md">
      <Icon size={22} />
    </ThemeIcon>
  );
}
