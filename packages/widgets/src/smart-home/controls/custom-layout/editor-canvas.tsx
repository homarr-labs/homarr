"use client";

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ThemeIcon } from "@mantine/core";
import { IconGripHorizontal } from "@tabler/icons-react";

import type { GridPlacement } from "@homarr/boards/grid";
import { useI18n } from "@homarr/translation/client";

import { getCardTitleRows } from "./card-grid";
import classes from "./editor.module.css";
import layoutClasses from "./layout.module.css";
import type { SmartHomeElementView, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";
import {
  CardColors,
  cardBodyStyle,
  CardTint,
  getCardPalette,
  getCardSurface,
  LayoutElement,
  placementStyle,
} from "./view";
import { viewIcons } from "./view-icons";

// The editor's canvas: cards and elements as on the board, with handles to move and resize them.

export type ResizeEvent = ReactPointerEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>;

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

export function CanvasCard({
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

/** What follows the pointer while an element type is dragged from the insert bar. */
export function InsertDragPreview({ view }: { view: SmartHomeElementView }) {
  const Icon = viewIcons[view];
  return (
    <ThemeIcon size={40} radius="md">
      <Icon size={22} />
    </ThemeIcon>
  );
}
