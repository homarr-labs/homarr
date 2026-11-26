"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent, KeyboardSensorOptions } from "@dnd-kit/core";
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Divider,
  Group,
  Menu,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
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
  IconX,
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

import { SmartHomeEntitySelect, useSmartHomeCatalog } from "../../_inputs";
import type { SmartHomeCatalogState } from "../../_inputs";
import { createEntityBlockId } from "../configuration";
import { haDomains } from "../types";
import type { HaDomain } from "../types";
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
  resizeCardWithElements,
  scaleElementPlacements,
} from "./card-grid";
import type { SmartHomeLayoutEditorProps } from "./editor-modal";
import classes from "./editor.module.css";
import { ColorSelect, ElementRow, OptionSections } from "./element-row";
import layoutClasses from "./layout.module.css";
import { buildPresetElements, createCard, getDefaultView, smartHomeLayoutPresets } from "./presets";
import type { SmartHomeLayoutPreset } from "./presets";
import { findFreeSlot, getMinimumRowHeight, LAYOUT_GAP } from "./responsive";
import {
  getLayoutEntityIds,
  getLayoutGraphEntityIds,
  NARROW_WIDGET_WIDTH,
  smartHomeLayoutSchema,
  SMART_HOME_CARD_MIN,
  SMART_HOME_LAYOUT_COLUMNS,
  SMART_HOME_LAYOUT_MAX_CARDS,
  SMART_HOME_LAYOUT_MAX_ELEMENTS,
  SMART_HOME_LAYOUT_MAX_TEMPLATES,
  SMART_HOME_LAYOUT_MAX_TEXT,
  SMART_HOME_LAYOUT_ROWS,
  SMART_HOME_LAYOUT_VERSION,
} from "./schema";
import type {
  SmartHomeCardColors,
  SmartHomeLayout,
  SmartHomeLayoutCard,
  SmartHomeLayoutElement,
  SmartHomeLayoutTemplate,
} from "./schema";
import { cardFromTemplate, cardToTemplate, duplicateCard } from "./templates";
import { useUndoable } from "./use-undoable";
import CustomLayoutView, {
  CardColors,
  cardBodyStyle,
  CardTint,
  DEFAULT_CARD_ACCENT,
  getCardPalette,
  LayoutElement,
  placementStyle,
} from "./view";

const GRID_ID = "smart-home-layout";
// Used when the widget's size is unknown (e.g. a widget not yet placed on the board).
const FALLBACK_CANVAS_HEIGHT = 420;
const CANVAS_PADDING = 8;
// The narrow arrangement is previewed at a phone-sized widget width.
const NARROW_PREVIEW_WIDTH = 360;
const noCards: SmartHomeLayoutCard[] = [];

type LayoutVariant = "wide" | "narrow";

/** What the editor changes, with undo: both arrangements and the saved templates. */
interface EditorDraft {
  cards: SmartHomeLayoutCard[];
  narrowCards: SmartHomeLayoutCard[] | undefined;
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
  onSelect: () => void;
  onResizeStart: (id: string, event: ResizeEvent) => void;
}

function CanvasElement({ element, placement, source, onSelect, onResizeStart }: CanvasElementProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: element.id });
  const name = element.label || element.entityId || t(`views.${element.view}`);
  return (
    <div
      ref={setNodeRef}
      data-element-id={element.id}
      className={`${layoutClasses.elementCell} ${classes.canvasElement}`}
      data-dragging={isDragging}
      style={placementStyle(placement)}
      onFocus={onSelect}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={classes.elementHandle}
        aria-label={t("moveElement", { name })}
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
  onSelect: (id: string) => void;
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
  onSelect,
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
      data-selected={selected}
      data-dragging={isDragging}
      style={placementStyle(placement)}
    >
      <section className={layoutClasses.card} data-palette={getCardPalette(card)}>
        <CardColors card={card}>
          {card.tint ? <CardTint card={card} source={source} /> : null}
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
                  onSelect={() => onSelect(card.id)}
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

interface CardPropertiesProps {
  cardOptions: { value: string; label: string }[];
  onMoveElement: (element: SmartHomeLayoutElement, cardId: string) => void;
  card: SmartHomeLayoutCard;
  catalog: SmartHomeCatalogState;
  source: string;
  onChange: (card: SmartHomeLayoutCard) => void;
  onDuplicate: () => void;
  onSaveTemplate: (name: string) => void;
  onRemove: () => void;
}

function CardProperties({
  cardOptions,
  onMoveElement,
  card,
  catalog,
  source,
  onChange,
  onDuplicate,
  onSaveTemplate,
  onRemove,
}: CardPropertiesProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [pickerKey, setPickerKey] = useState(0);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const tDomain = useI18n("widget.smartHome-controls.domain");
  // Narrows the add picker to one kind of entity; the list is long on a big smart home.
  const [addDomain, setAddDomain] = useState<HaDomain | null>(null);
  const entities = catalog.status === "ready" ? catalog.index.entitiesById : null;
  const domainOptions = useMemo(() => {
    const present = new Set(catalog.status === "ready" ? catalog.index.domains : []);
    return haDomains
      .filter((domain) => present.has(domain))
      .map((domain) => ({ value: domain, label: tDomain(domain) }));
  }, [catalog, tDomain]);
  const onCard = useMemo(
    () => ({ ids: new Set(card.elements.map((element) => element.entityId)), label: t("onCard") }),
    [card.elements, t],
  );
  // New or bigger elements grow the card so nothing is cut off; shrinking stays a manual choice.
  const setElements = (elements: SmartHomeLayoutElement[]) => {
    const next = { ...card, elements };
    onChange({ ...next, h: Math.max(card.h, getCardMinSize(next).h) });
  };
  const full = card.elements.length >= SMART_HOME_LAYOUT_MAX_ELEMENTS;

  const addElement = (entityId: string | null) => {
    setPickerKey((key) => key + 1);
    const entity = entityId ? entities?.get(entityId) : undefined;
    if (!entity || full) return;
    setElements([...card.elements, { id: createId(), source, entityId: entity.id, view: getDefaultView(entity) }]);
  };

  const addStatic = (view: "heading" | "divider" | "spacer") => {
    if (full) return;
    setElements([...card.elements, { id: createId(), source, entityId: "", view }]);
  };

  // A copy has no position of its own, so it takes free space on the card and never covers what is there.
  const duplicateElement = (element: SmartHomeLayoutElement) => {
    if (full) return;
    const { x: _x, y: _y, ...rest } = element;
    setElements([...card.elements, { ...rest, id: createId() }]);
  };

  // The list follows the card: top to bottom, then left to right, so it reads like the preview.
  const ordered = useMemo(() => {
    const placements = new Map(getElementPlacements(card).map((placement) => [placement.id, placement]));
    const position = (id: string) => placements.get(id) ?? { x: 0, y: 0 };
    return card.elements.toSorted(
      (left, right) => position(left.id).y - position(right.id).y || position(left.id).x - position(right.id).x,
    );
  }, [card]);

  return (
    <Stack gap="sm">
      <TextInput
        label={t("cardTitle")}
        placeholder={t("untitledCard")}
        value={card.title ?? ""}
        maxLength={SMART_HOME_LAYOUT_MAX_TEXT}
        onChange={(event) => {
          const next = { ...card, title: event.currentTarget.value || undefined };
          // A new title takes a row, so the card grows instead of squeezing its elements.
          onChange({ ...next, h: Math.max(card.h, getCardMinSize(next).h) });
        }}
      />
      <OptionSections
        sections={[
          {
            value: "style",
            label: t("sectionStyle"),
            content: (
              <Stack gap="xs">
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    {t("cardColors")}
                  </Text>
                  <SegmentedControl
                    size="xs"
                    fullWidth
                    aria-label={t("cardColors")}
                    value={card.colors ?? "neutral"}
                    onChange={(value) =>
                      onChange({ ...card, colors: value === "neutral" ? undefined : (value as SmartHomeCardColors) })
                    }
                    data={[
                      { value: "neutral", label: t("colorsNeutral") },
                      { value: "state", label: t("colorsState") },
                      { value: "accent", label: t("colorsAccent") },
                    ]}
                  />
                </Stack>
                {card.colors === "accent" ? (
                  <ColorSelect
                    label={t("accent")}
                    value={card.accent ?? DEFAULT_CARD_ACCENT}
                    onChange={(accent) => onChange({ ...card, accent })}
                  />
                ) : null}
                <Switch
                  label={t("tint")}
                  description={t("tintHint")}
                  checked={card.tint === true}
                  onChange={(event) => onChange({ ...card, tint: event.currentTarget.checked || undefined })}
                />
              </Stack>
            ),
          },
          {
            value: "visibility",
            label: t("sectionVisibility"),
            content: (
              <Switch
                label={t("readOnly")}
                description={t("readOnlyCardHint")}
                checked={card.readOnly === true}
                onChange={(event) => onChange({ ...card, readOnly: event.currentTarget.checked || undefined })}
              />
            ),
          },
        ]}
      />
      <Divider label={t("elements")} labelPosition="left" />
      {ordered.map((element) => (
        <ElementRow
          key={element.id}
          element={element}
          cardId={card.id}
          cardOptions={cardOptions}
          onMoveToCard={(id) => onMoveElement(element, id)}
          entity={entities?.get(element.entityId)}
          catalog={catalog}
          source={source}
          onChange={(next) =>
            setElements(card.elements.map((candidate) => (candidate.id === next.id ? next : candidate)))
          }
          onDuplicate={() => duplicateElement(element)}
          onRemove={() => setElements(card.elements.filter((candidate) => candidate.id !== element.id))}
        />
      ))}
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <Box flex={1} miw={0}>
          <SmartHomeEntitySelect
            key={pickerKey}
            catalog={catalog}
            label={t("addElement")}
            placeholder={t("addElementPlaceholder")}
            value={null}
            onChange={addElement}
            clearable={false}
            disabled={full}
            domains={addDomain ? [addDomain] : undefined}
            marked={onCard}
          />
        </Box>
        <Select
          w={150}
          aria-label={t("addElementType")}
          placeholder={t("addElementAllTypes")}
          data={domainOptions}
          value={addDomain}
          onChange={(value) => setAddDomain(value as HaDomain | null)}
          clearable
          searchable
          disabled={full}
        />
      </Group>
      <Group gap="xs" grow>
        {(["heading", "divider", "spacer"] as const).map((view) => (
          <Button key={view} size="sm" variant="light" disabled={full} onClick={() => addStatic(view)}>
            {t(`views.${view}`)}
          </Button>
        ))}
      </Group>
      <Divider />
      {templateName === null ? (
        <Group gap="xs" grow>
          <Button variant="default" leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
            {t("duplicateCard")}
          </Button>
          <Button
            variant="default"
            leftSection={<IconTemplate size={16} />}
            onClick={() => setTemplateName(card.title ?? "")}
          >
            {t("saveTemplate")}
          </Button>
        </Group>
      ) : (
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <TextInput
            flex={1}
            label={t("templateName")}
            value={templateName}
            maxLength={80}
            data-autofocus
            onChange={(event) => setTemplateName(event.currentTarget.value)}
          />
          <Button
            disabled={templateName.trim() === ""}
            onClick={() => {
              onSaveTemplate(templateName.trim());
              setTemplateName(null);
            }}
          >
            {t("save")}
          </Button>
          <ActionIcon variant="subtle" size="input-sm" aria-label={t("cancel")} onClick={() => setTemplateName(null)}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      )}
      <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={onRemove}>
        {t("removeCard")}
      </Button>
    </Stack>
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
    narrowCards: layout.narrowCards?.map((card) => fitElementsIntoCard(card) ?? card),
    templates: layout.templates,
  }));
  const { update: updateDraft } = history;
  const [variant, setVariant] = useState<LayoutVariant>(() =>
    previewSize && previewSize.width < NARROW_WIDGET_WIDTH ? "narrow" : "wide",
  );
  const cards = variant === "wide" ? history.value.cards : (history.value.narrowCards ?? noCards);
  // Changes the arrangement being edited, wide or narrow.
  const setCards = useCallback(
    (next: SmartHomeLayoutCard[] | ((current: SmartHomeLayoutCard[]) => SmartHomeLayoutCard[])) =>
      updateDraft((draft) => {
        const current = variant === "wide" ? draft.cards : (draft.narrowCards ?? noCards);
        const value = typeof next === "function" ? next(current) : next;
        if (value === current) return draft;
        return variant === "wide" ? { ...draft, cards: value } : { ...draft, narrowCards: value };
      }),
    [updateDraft, variant],
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
  const [shareOpened, setShareOpened] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(false);
  // The narrow arrangement is shown at a phone-sized width; the height stays the widget's.
  const shownSize =
    variant === "narrow"
      ? {
          width: Math.min(NARROW_PREVIEW_WIDTH, previewSize?.width ?? NARROW_PREVIEW_WIDTH),
          height: previewSize?.height ?? FALLBACK_CANVAS_HEIGHT,
        }
      : previewSize;
  const [templateDevice, setTemplateDevice] = useState<string | null>(null);
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
  const showStackedPreview = variant === "narrow" && !cards.length && history.value.cards.length > 0;
  const canvasHeight = shownSize?.height ?? FALLBACK_CANVAS_HEIGHT;
  const rowHeight = Math.max(getMinimumRowHeight(cards), (canvasHeight + LAYOUT_GAP) / layoutRows - LAYOUT_GAP);
  const gridHeight = rowHeight * layoutRows + LAYOUT_GAP * (layoutRows - 1);
  const pitchY = rowHeight + LAYOUT_GAP;

  const draft = useMemo(
    (): SmartHomeLayout => ({
      version: SMART_HOME_LAYOUT_VERSION,
      cards: history.value.cards,
      ...(history.value.narrowCards?.length ? { narrowCards: history.value.narrowCards } : {}),
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
  const selected = cards.find((card) => card.id === selectedId) ?? null;
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
  };

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const id = String(active.id);
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
      setSelectedId(id);
      return;
    }
    const owner = cards.find((candidate) => candidate.elements.some((element) => element.id === id));
    const node = canvasNode.current?.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
    const body = node?.parentElement;
    if (!owner || !node || !body) return;
    setSelectedId(owner.id);
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

  const onDragMove = ({ active, delta }: DragMoveEvent) => settle(String(active.id), delta);

  const onDragEnd = ({ active, delta }: DragEndEvent) => {
    const id = String(active.id);
    if (pointer.current) settle(id, delta);
    // An element dropped on another card selects that card, so its settings show the element.
    const owner = transaction.current?.preview.grids.find(
      (grid) => grid.ownerPlacementId && grid.placements.some((placement) => placement.id === id),
    )?.ownerPlacementId;
    stopTracking();
    finish();
    if (owner) setSelectedId(owner);
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
    setSelectedId(created.id);
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

  const switchVariant = (next: LayoutVariant) => {
    setVariant(next);
    setSelectedId(null);
    cancel();
  };

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
    if (parsed.cards.length === 0 && !parsed.narrowCards?.length && !parsed.templates?.length) {
      setImportError(true);
      return;
    }
    // Cards on top of each other, or elements outside their card, cannot be edited; such a layout is refused.
    const arrangements = [parsed.cards, ...(parsed.narrowCards ? [parsed.narrowCards] : [])];
    if (!arrangements.every(isValidArrangement)) {
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
        narrowCards: parsed.narrowCards ? withSource(parsed.narrowCards, integrationId) : undefined,
        templates: mergedTemplates.length > 0 ? mergedTemplates : undefined,
      };
    });
    setShareOpened(false);
    setImportText("");
    setImportError(false);
    setSelectedId(null);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs" wrap="wrap">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => addCards(createCard(cards, []))}
            disabled={isFull}
          >
            {t("addCard")}
          </Button>
          <Select
            w={240}
            placeholder={t("templateDevice")}
            aria-label={t("templateDevice")}
            data={deviceOptions}
            value={templateDevice}
            onChange={setTemplateDevice}
            searchable
            clearable
            disabled={!index}
          />
          <Menu position="bottom-start" withinPortal>
            <Menu.Target>
              <Button
                variant="light"
                leftSection={<IconTemplate size={16} />}
                disabled={(!templateDevice || isFull) && templates.length === 0}
              >
                {t("addTemplate")}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {smartHomeLayoutPresets.map((preset) => (
                <Menu.Item key={preset} disabled={!templateDevice || isFull} onClick={() => addPreset(preset)}>
                  {t(`preset.${preset}`)}
                </Menu.Item>
              ))}
              {templates.length > 0 && (
                <>
                  <Menu.Divider />
                  <Menu.Label>{t("myTemplates")}</Menu.Label>
                  {templates.map((template) => (
                    <Fragment key={template.id}>
                      <Menu.Item disabled={!templateDevice || isFull} onClick={() => addOwnTemplate(template)}>
                        {template.name}
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => removeTemplate(template.id)}
                      >
                        {t("deleteTemplate", { name: template.name })}
                      </Menu.Item>
                    </Fragment>
                  ))}
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="sm"
            aria-label={t("variant")}
            value={variant}
            onChange={(value) => switchVariant(value as LayoutVariant)}
            data={[
              { value: "wide", label: t("variants.wide") },
              { value: "narrow", label: t("variants.narrow") },
            ]}
          />
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
              setSelectedId(null);
            }}
            disabled={cards.length === 0}
          >
            {t("clear")}
          </Button>
        </Group>
      </Group>

      <div className={classes.editor}>
        <div className={`${controlClasses.root} ${classes.canvasScroll}`}>
          {variant === "narrow" ? (
            <Group className={classes.canvasHint} gap="xs" justify="space-between" wrap="nowrap">
              <span>{t("narrowHint", { width: NARROW_WIDGET_WIDTH })}</span>
              {cards.length === 0 && history.value.cards.length > 0 && (
                <Button size="compact-xs" variant="light" onClick={() => setCards(history.value.cards)}>
                  {t("copyWide")}
                </Button>
              )}
            </Group>
          ) : (
            previewSize && (
              <div className={classes.canvasHint}>
                {t("previewHint", { width: Math.round(previewSize.width), height: Math.round(previewSize.height) })}
              </div>
            )
          )}
          <SmartHomeInteractionProvider blocked="editing">
            <SmartHomeLiveProvider
              integrationId={integrationId}
              blockIds={blockIds}
              roomDomains={[]}
              excludedEntityIds={[]}
              historyEntityIds={graphIds}
            >
              <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onDragCancel={cancel}
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
                      height: (showStackedPreview ? canvasHeight : gridHeight) + CANVAS_PADDING * 2,
                      gridTemplateColumns: `repeat(${SMART_HOME_LAYOUT_COLUMNS}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${layoutRows}, ${rowHeight}px)`,
                      gap: LAYOUT_GAP,
                    } as CSSProperties
                  }
                >
                  {/* The widget's grid, cell by cell: shows how big the widget is and where cards snap to. */}
                  {!showStackedPreview &&
                    gridCells.map(({ key, column, row }) => (
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
                      onSelect={setSelectedId}
                      onResizeStart={onCardResizeStart}
                      onElementResizeStart={onElementResizeStart}
                    />
                  ))}
                  {showStackedPreview && (
                    <Box style={{ gridColumn: "1 / -1", gridRow: "1 / -1" }} mih={0}>
                      <CustomLayoutView
                        layout={draft}
                        source={integrationId}
                        width={shownSize?.width ?? NARROW_PREVIEW_WIDTH}
                      />
                    </Box>
                  )}
                  {cards.length === 0 && !showStackedPreview && (
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
              </DndContext>
            </SmartHomeLiveProvider>
          </SmartHomeInteractionProvider>
        </div>

        <div className={classes.panel}>
          {selected ? (
            <CardProperties
              key={selected.id}
              card={selected}
              onMoveElement={moveElementToCard}
              cardOptions={cards.map((card, position) => ({
                value: card.id,
                label: card.title || t("numberedCard", { number: position + 1 }),
              }))}
              catalog={catalog}
              source={integrationId}
              onChange={updateCard}
              onDuplicate={() => {
                addCards(duplicateCard(selected, cards));
              }}
              onSaveTemplate={(name) => saveTemplate(selected, name)}
              onRemove={() => {
                setCards((existing) => existing.filter((card) => card.id !== selected.id));
                setSelectedId(null);
              }}
            />
          ) : (
            <Text size="sm" c="dimmed">
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
  );
}
