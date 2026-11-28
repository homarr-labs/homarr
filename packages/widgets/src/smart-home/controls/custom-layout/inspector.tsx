"use client";

import { Fragment, useMemo, useState } from "react";
import type { PointerEventHandler, ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Accordion,
  ActionIcon,
  Anchor,
  Button,
  Divider,
  Group,
  Menu,
  NavLink,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowMoveRight,
  IconCopy,
  IconDots,
  IconLayoutGrid,
  IconSquarePlus,
  IconTemplate,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { SmartHomeEntitySelect } from "../../_inputs";
import type { SmartHomeCatalogState } from "../../_inputs";
import { getElementPlacements } from "./card-grid";
import classes from "./editor.module.css";
import { ElementSettings, StylePicker } from "./element-row";
import type { StyleValue } from "./element-row";
import { splitEntityName } from "./names";
import { SMART_HOME_LAYOUT_MAX_ELEMENTS, SMART_HOME_LAYOUT_MAX_TEXT, staticElementViews } from "./schema";
import type { SmartHomeElementView, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";
import { DEFAULT_CARD_ACCENT } from "./view";
import { insertViewGroups, viewIcons } from "./view-icons";

/** Prefix of the insert bar's drag ids, so the editor tells them from cards and elements. */
export const INSERT_DRAG_PREFIX = "insert:";

interface InsertItemProps {
  view: SmartHomeElementView;
  disabled: boolean;
  onAdd: (view: SmartHomeElementView) => void;
}

/** One element type: dragged onto a card it lands there, clicked it goes to the selected card. */
function InsertItem({ view, disabled, onAdd }: InsertItemProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const { listeners, setNodeRef } = useDraggable({ id: `${INSERT_DRAG_PREFIX}${view}`, disabled });
  const Icon = viewIcons[view];
  return (
    <Tooltip label={t(`views.${view}`)} withinPortal>
      <ActionIcon
        ref={setNodeRef}
        variant="subtle"
        color="gray"
        size="md"
        disabled={disabled}
        aria-label={t("insertElement", { view: t(`views.${view}`) })}
        // Only the pointer drags; the keyboard clicks, which adds to the selected card.
        onPointerDown={listeners?.onPointerDown as PointerEventHandler<HTMLButtonElement> | undefined}
        onClick={() => onAdd(view)}
        className={classes.insertItem}
      >
        <Icon size={18} stroke={1.8} />
      </ActionIcon>
    </Tooltip>
  );
}

interface InsertBarProps {
  canAddCard: boolean;
  canAddElement: boolean;
  onAddCard: () => void;
  onAddElement: (view: SmartHomeElementView) => void;
}

/** Everything that can go on the layout, as one compact row: a card, then element types in groups. */
export function InsertBar({ canAddCard, canAddElement, onAddCard, onAddElement }: InsertBarProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  return (
    <Group gap={2} wrap="wrap" className={classes.insertBar} role="toolbar" aria-label={t("insert")}>
      <Tooltip label={t("addCard")} withinPortal>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          disabled={!canAddCard}
          aria-label={t("addCard")}
          onClick={onAddCard}
        >
          <IconSquarePlus size={18} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
      {insertViewGroups.map((group) => (
        <Fragment key={group[0]}>
          <Divider orientation="vertical" mx={3} my={2} />
          {group.map((view) => (
            <InsertItem key={view} view={view} disabled={!canAddElement} onAdd={onAddElement} />
          ))}
        </Fragment>
      ))}
    </Group>
  );
}

/** The panel head, as in Homarr's settings: an icon badge, a title and what it belongs to, then actions. */
function InspectorHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: TablerIcon;
  title: string;
  subtitle: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Group gap="sm" wrap="nowrap" className={classes.inspectorHeader}>
      <ThemeIcon size={40} radius="md" variant="light">
        <Icon size={20} />
      </ThemeIcon>
      <Stack gap={0} miw={0} flex={1}>
        <Text fw={600} truncate title={title}>
          {title}
        </Text>
        <Text size="sm" c="dimmed" truncate component="div">
          {subtitle}
        </Text>
      </Stack>
      <Group gap={2} wrap="nowrap">
        {actions}
      </Group>
    </Group>
  );
}

const cardStyleValue = (card: SmartHomeLayoutCard): StyleValue => {
  if (card.colors === "state") return "state";
  if (card.colors === "accent") return card.accent ?? DEFAULT_CARD_ACCENT;
  return "neutral";
};

const withCardStyle = (card: SmartHomeLayoutCard, value: StyleValue): SmartHomeLayoutCard => {
  if (value === "neutral" || value === "inherit") return { ...card, colors: undefined, accent: undefined };
  if (value === "state") return { ...card, colors: "state", accent: undefined };
  return { ...card, colors: "accent", accent: value };
};

interface CardInspectorProps {
  card: SmartHomeLayoutCard;
  catalog: SmartHomeCatalogState;
  entities: ReadonlyMap<string, SmartHomeCatalogEntity> | null;
  onChange: (card: SmartHomeLayoutCard) => void;
  onSelectElement: (id: string) => void;
  onAddEntity: (entityId: string) => void;
  onDuplicate: () => void;
  onSaveTemplate: (name: string) => void;
  onRemove: () => void;
}

/** The selected card: its name, colors and elements; the rest folded away. */
export function CardInspector({
  card,
  catalog,
  entities,
  onChange,
  onSelectElement,
  onAddEntity,
  onDuplicate,
  onSaveTemplate,
  onRemove,
}: CardInspectorProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const full = card.elements.length >= SMART_HOME_LAYOUT_MAX_ELEMENTS;
  // The list reads like the card: top to bottom, then left to right.
  const ordered = useMemo(() => {
    const placements = new Map(getElementPlacements(card).map((placement) => [placement.id, placement]));
    const position = (id: string) => placements.get(id) ?? { x: 0, y: 0 };
    return card.elements.toSorted(
      (left, right) => position(left.id).y - position(right.id).y || position(left.id).x - position(right.id).x,
    );
  }, [card]);
  const onCard = useMemo(
    () => ({ ids: new Set(card.elements.map((element) => element.entityId)), label: t("onCard") }),
    [card.elements, t],
  );

  return (
    <Stack gap={0}>
      <InspectorHeader
        icon={IconLayoutGrid}
        title={card.title || t("untitledCard")}
        subtitle={t("card")}
        actions={
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t("cardActions")}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
                {t("duplicateCard")}
              </Menu.Item>
              <Menu.Item leftSection={<IconTemplate size={16} />} onClick={() => setTemplateName(card.title ?? "")}>
                {t("saveTemplate")}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onRemove}>
                {t("removeCard")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      <Stack gap="md" p="md">
        {templateName !== null && (
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
        <TextInput
          label={t("cardTitle")}
          placeholder={t("untitledCard")}
          value={card.title ?? ""}
          maxLength={SMART_HOME_LAYOUT_MAX_TEXT}
          onChange={(event) => onChange({ ...card, title: event.currentTarget.value || undefined })}
        />
        <StylePicker
          label={t("cardColors")}
          value={cardStyleValue(card)}
          onChange={(value) => onChange(withCardStyle(card, value))}
        />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {t("elements")}
          </Text>
          <Stack gap={0} mx="calc(var(--mantine-spacing-xs) * -1)">
            {ordered.map((element) => (
              <ElementNavLink
                key={element.id}
                element={element}
                entity={entities?.get(element.entityId)}
                onClick={() => onSelectElement(element.id)}
              />
            ))}
          </Stack>
          <SmartHomeEntitySelect
            key={pickerKey}
            catalog={catalog}
            placeholder={t("addEntity")}
            value={null}
            clearable={false}
            disabled={full}
            marked={onCard}
            onChange={(entityId) => {
              setPickerKey((key) => key + 1);
              if (entityId) onAddEntity(entityId);
            }}
          />
        </Stack>
        <Accordion variant="separated" chevronPosition="left">
          <Accordion.Item value="advanced">
            <Accordion.Control>
              <Text size="sm">{t("advancedOptions")}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Switch
                  label={t("readOnly")}
                  description={t("readOnlyCardHint")}
                  checked={card.readOnly === true}
                  onChange={(event) => onChange({ ...card, readOnly: event.currentTarget.checked || undefined })}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Stack>
  );
}

/** The name an element goes by in the panel: its label, its entity's name, or what it is. */
const useElementName = () => {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  return (element: SmartHomeLayoutElement, entity: SmartHomeCatalogEntity | undefined) => {
    if (element.label) return element.label;
    if (staticElementViews.has(element.view)) return t(`views.${element.view}`);
    if (entity) return splitEntityName(entity.name).title;
    return element.entityId ? element.entityId : t("chooseEntity");
  };
};

function ElementNavLink({
  element,
  entity,
  onClick,
}: {
  element: SmartHomeLayoutElement;
  entity: SmartHomeCatalogEntity | undefined;
  onClick: () => void;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const name = useElementName();
  const Icon = viewIcons[element.view];
  return (
    <NavLink
      label={name(element, entity)}
      leftSection={<Icon size={18} stroke={1.8} />}
      rightSection={
        <Text size="xs" c="dimmed">
          {t(`views.${element.view}`)}
        </Text>
      }
      onClick={onClick}
    />
  );
}

interface ElementInspectorProps {
  element: SmartHomeLayoutElement;
  card: SmartHomeLayoutCard;
  entity: SmartHomeCatalogEntity | undefined;
  catalog: SmartHomeCatalogState;
  source: string;
  cardOptions: { value: string; label: string }[];
  autoFocusEntity: boolean;
  onChange: (element: SmartHomeLayoutElement) => void;
  onBack: () => void;
  onMoveToCard: (cardId: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** The selected element: what it shows and how; its card is one click back. */
export function ElementInspector({
  element,
  card,
  entity,
  catalog,
  source,
  cardOptions,
  autoFocusEntity,
  onChange,
  onBack,
  onMoveToCard,
  onDuplicate,
  onRemove,
}: ElementInspectorProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const name = useElementName();
  return (
    <Stack gap={0}>
      <InspectorHeader
        icon={viewIcons[element.view]}
        title={name(element, entity)}
        subtitle={
          <Anchor component="button" type="button" size="sm" c="dimmed" onClick={onBack}>
            {t("elementOfCard", { view: t(`views.${element.view}`), card: card.title || t("untitledCard") })}
          </Anchor>
        }
        actions={
          <>
            {cardOptions.length > 1 && (
              <Menu position="bottom-end" withinPortal shadow="md">
                <Menu.Target>
                  <Tooltip label={t("moveToCard")} withinPortal>
                    <ActionIcon variant="subtle" color="gray" aria-label={t("moveToCard")}>
                      <IconArrowMoveRight size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t("moveToCard")}</Menu.Label>
                  {cardOptions
                    .filter((option) => option.value !== card.id)
                    .map((option) => (
                      <Menu.Item key={option.value} onClick={() => onMoveToCard(option.value)}>
                        {option.label}
                      </Menu.Item>
                    ))}
                </Menu.Dropdown>
              </Menu>
            )}
            <Tooltip label={t("duplicate")} withinPortal>
              <ActionIcon variant="subtle" color="gray" onClick={onDuplicate} aria-label={t("duplicate")}>
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("removeElement")} withinPortal>
              <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label={t("removeElement")}>
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        }
      />
      <Stack p="md">
        <ElementSettings
          element={element}
          entity={entity}
          catalog={catalog}
          source={source}
          onChange={onChange}
          autoFocusEntity={autoFocusEntity}
        />
      </Stack>
    </Stack>
  );
}
