import type { ReactNode } from "react";
import {
  Accordion,
  ActionIcon,
  Button,
  ColorPicker,
  ColorSwatch,
  Divider,
  Group,
  Input,
  NumberInput,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconCopy,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";
import { TablerIconPicker } from "@homarr/forms-collection/tabler-icon-picker";
import { useI18n } from "@homarr/translation/client";

import { SmartHomeEntityPicker, SmartHomeEntitySelect } from "../../_inputs";
import type { SmartHomeCatalogState } from "../../_inputs";
import classes from "./editor.module.css";
import { smartHomeIconSuggestions } from "./icon-suggestions";
import { splitEntityName } from "./names";
import { getAllowedViews, getDefaultView } from "./presets";
import { layoutColor } from "./rules";
import {
  controlElementViews,
  getElementParts,
  iconElementViews,
  isNamedLayoutColor,
  labelledElementViews,
  SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES,
  SMART_HOME_COMPARISON_MAX,
  SMART_HOME_ELEMENT_MAX_RULES,
  SMART_HOME_FACTOR_MAX,
  SMART_HOME_LAYOUT_MAX_TEXT,
  smartHomeAggregates,
  smartHomeCompareOperators,
  smartHomeGraphRanges,
  smartHomeLayoutColors,
  staticElementViews,
  valueElementViews,
} from "./schema";
import type {
  SmartHomeAggregate,
  SmartHomeCompareOperator,
  SmartHomeElementPart,
  SmartHomeElementView,
  SmartHomeLayoutColor,
  SmartHomeLayoutElement,
  SmartHomeLayoutRule,
} from "./schema";

// Comparisons read as symbols in every language.
const operatorLabels: Record<SmartHomeCompareOperator, string> = { gt: ">", lt: "<", eq: "=", ne: "≠" };
const operatorData = smartHomeCompareOperators.map((op) => ({ value: op, label: operatorLabels[op] }));
const staticViews = ["heading", "divider", "spacer"] as const satisfies readonly SmartHomeElementView[];

export interface OptionSection {
  value: string;
  label: string;
  content: ReactNode;
}

/** Rarely used options, folded away the same way for cards and elements. */
export function OptionSections({ sections }: { sections: readonly OptionSection[] }) {
  if (sections.length === 0) return null;
  return (
    <Accordion variant="separated" multiple chevronPosition="left" classNames={{ content: classes.optionContent }}>
      {sections.map((section) => (
        <Accordion.Item key={section.value} value={section.value}>
          <Accordion.Control>
            <Text size="sm">{section.label}</Text>
          </Accordion.Control>
          <Accordion.Panel>{section.content}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

const useColorLabel = () => {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  return (color: SmartHomeLayoutColor) => (isNamedLayoutColor(color) ? t(`colors.${color}`) : color.toUpperCase());
};

/** A labelled color choice (a card's accent): the swatch with the color's name beside it. */
export function ColorSelect({
  value,
  onChange,
  label,
  clearable = false,
}: {
  value: SmartHomeLayoutColor | undefined;
  onChange: (color: SmartHomeLayoutColor | undefined) => void;
  label?: string;
  clearable?: boolean;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const colorLabel = useColorLabel();
  return (
    <Input.Wrapper label={label}>
      <Group gap="xs" wrap="nowrap" mt={4}>
        <ColorSwatchPicker value={value} onChange={onChange} clearable={clearable} />
        <Text size="sm" c={value ? undefined : "dimmed"}>
          {value ? colorLabel(value) : t("noColor")}
        </Text>
      </Group>
    </Input.Wrapper>
  );
}

// A custom color starts from the current palette color's neighborhood rather than black.
const DEFAULT_CUSTOM_COLOR = "#4dabf7";

/**
 * A color as a round swatch; a tap opens the palette (theme colors) and a picker for any other color. Takes little
 * room beside a rule's value.
 */
function ColorSwatchPicker({
  value,
  onChange,
  clearable = false,
}: {
  value: SmartHomeLayoutColor | undefined;
  onChange: (color: SmartHomeLayoutColor | undefined) => void;
  clearable?: boolean;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const colorLabel = useColorLabel();
  const custom = value && !isNamedLayoutColor(value) ? value : null;
  const name = value ? colorLabel(value) : t("noColor");
  return (
    <Popover position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Tooltip label={name} openDelay={400}>
          <UnstyledButton className={classes.swatchButton} aria-label={`${t("color")}: ${name}`}>
            {value ? (
              <ColorSwatch color={layoutColor(value)} size={20} />
            ) : (
              <span className={classes.swatchNone} aria-hidden />
            )}
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <div className={classes.swatchGrid}>
            {clearable && (
              <Tooltip label={t("noColor")} openDelay={300}>
                <UnstyledButton
                  className={classes.swatchOption}
                  aria-label={t("noColor")}
                  aria-pressed={!value}
                  onClick={() => onChange(undefined)}
                >
                  <span className={classes.swatchNone} aria-hidden />
                </UnstyledButton>
              </Tooltip>
            )}
            {smartHomeLayoutColors.map((color) => (
              <Tooltip key={color} label={t(`colors.${color}`)} openDelay={300}>
                <ColorSwatch
                  component="button"
                  type="button"
                  color={layoutColor(color)}
                  size={24}
                  aria-label={t(`colors.${color}`)}
                  aria-pressed={color === value}
                  className={classes.swatchOption}
                  onClick={() => onChange(color)}
                />
              </Tooltip>
            ))}
          </div>
          <Divider label={t("customColor")} labelPosition="left" />
          <ColorPicker
            size="sm"
            format="hex"
            fullWidth
            value={custom ?? DEFAULT_CUSTOM_COLOR}
            saturationLabel={t("colorSaturation")}
            hueLabel={t("colorHue")}
            onChangeEnd={(hex) => onChange(hex.toLowerCase() as `#${string}`)}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function RulesEditor({
  rules,
  onChange,
}: {
  rules: readonly SmartHomeLayoutRule[];
  onChange: (rules: SmartHomeLayoutRule[] | undefined) => void;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const update = (index: number, rule: SmartHomeLayoutRule) =>
    onChange(rules.map((candidate, position) => (position === index ? rule : candidate)));
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t("rulesHint")}
      </Text>
      {rules.map((rule, index) => (
        // Reads as a sentence: "> 25 → red".
        <Group key={index} gap={6} wrap="nowrap" align="center">
          <SegmentedControl
            size="xs"
            aria-label={t("ruleOperator")}
            data={operatorData}
            value={rule.op}
            onChange={(op) => update(index, { ...rule, op: op as SmartHomeCompareOperator })}
            classNames={{ label: classes.operatorLabel }}
          />
          <TextInput
            size="sm"
            flex={1}
            miw={0}
            aria-label={t("ruleValue")}
            placeholder={t("ruleValue")}
            maxLength={SMART_HOME_COMPARISON_MAX}
            value={rule.value}
            onChange={(event) => update(index, { ...rule, value: event.currentTarget.value })}
          />
          <ColorSwatchPicker value={rule.color} onChange={(color) => color && update(index, { ...rule, color })} />
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={t("removeRule")}
            onClick={() => {
              const next = rules.filter((_, position) => position !== index);
              onChange(next.length > 0 ? next : undefined);
            }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      ))}
      {rules.length < SMART_HOME_ELEMENT_MAX_RULES && (
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={14} />}
          onClick={() => onChange([...rules, { op: "gt", value: "", color: "red" }])}
        >
          {t("addRule")}
        </Button>
      )}
    </Stack>
  );
}

interface ElementRowProps {
  element: SmartHomeLayoutElement;
  entity: SmartHomeCatalogEntity | undefined;
  catalog: SmartHomeCatalogState;
  /** The integration the editor picks entities from. */
  source: string;
  onChange: (element: SmartHomeLayoutElement) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** One element in the card panel: what it shows and how, with the rarely used options folded away. */
export function ElementRow({ element, entity, catalog, source, onChange, onDuplicate, onRemove }: ElementRowProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const isStatic = staticElementViews.has(element.view);
  const views = isStatic ? staticViews : entity ? getAllowedViews(entity) : [element.view];
  const { title, subtitle } = isStatic
    ? { title: t(`views.${element.view}`), subtitle: "" }
    : entity
      ? splitEntityName(entity.name)
      : { title: t("missingEntity"), subtitle: element.entityId };
  // Missing only once the catalog has loaded; until then the entity may simply not be known yet.
  const missing = !isStatic && !entity && catalog.status === "ready";
  const set = (patch: Partial<SmartHomeLayoutElement>) => onChange({ ...element, ...patch });
  // Another entity keeps the element's options; only a view the new entity cannot show changes.
  const relink = (entityId: string | null) => {
    const next = entityId && catalog.status === "ready" ? catalog.index.entitiesById.get(entityId) : undefined;
    if (!next) return;
    const view = getAllowedViews(next).includes(element.view) ? element.view : getDefaultView(next);
    onChange({ ...element, source, entityId: next.id, view });
  };
  // Only an entity that can be controlled has controls; for a sensor, the large tile and the row only show it.
  const controllable = (views as readonly SmartHomeElementView[]).includes("button");
  const isControlView = (view: SmartHomeElementView) => controllable && controlElementViews.has(view);
  const showsValue = valueElementViews.has(element.view);

  const sections: OptionSection[] = [];
  if (element.view === "group") {
    sections.push({
      value: "group",
      label: t("sectionGroup"),
      content: (
        <Stack gap="xs">
          <SmartHomeEntityPicker
            catalog={catalog}
            label={t("groupEntities")}
            description={t("groupEntitiesHint")}
            value={element.entityIds ?? []}
            maxValues={SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES}
            onChange={(ids) => set({ entityIds: ids.length > 0 ? ids : undefined })}
          />
          <Select
            size="sm"
            label={t("aggregate")}
            allowDeselect={false}
            data={smartHomeAggregates.map((aggregate) => ({ value: aggregate, label: t(`aggregates.${aggregate}`) }))}
            value={element.aggregate ?? "sum"}
            onChange={(value) => value && set({ aggregate: value as SmartHomeAggregate })}
          />
        </Stack>
      ),
    });
  }
  if (element.view === "graph") {
    sections.push({
      value: "graph",
      label: t("sectionGraph"),
      content: (
        <Stack gap="xs">
          <SegmentedControl
            size="xs"
            fullWidth
            aria-label={t("graphRange")}
            value={String(element.range ?? 24)}
            onChange={(value) => set({ range: Number(value) === 24 ? undefined : Number(value) })}
            data={smartHomeGraphRanges.map((hours) => ({ value: String(hours), label: t(`ranges.${hours}`) }))}
          />
          <SmartHomeEntityPicker
            catalog={catalog}
            label={t("graphLines")}
            value={element.entityIds ?? []}
            domains={["sensor", "number"]}
            maxValues={SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES}
            onChange={(ids) => set({ entityIds: ids.length > 0 ? ids : undefined })}
          />
          <Switch
            label={t("showMinMax")}
            checked={element.showMinMax === true}
            onChange={(event) => set({ showMinMax: event.currentTarget.checked || undefined })}
          />
        </Stack>
      ),
    });
  }
  if (showsValue) {
    sections.push({
      value: "format",
      label: t("sectionFormat"),
      content: (
        <Group gap="xs" grow>
          <NumberInput
            size="sm"
            label={t("decimals")}
            placeholder={t("auto")}
            min={0}
            max={3}
            allowDecimal={false}
            value={element.decimals ?? ""}
            onChange={(value) => set({ decimals: typeof value === "number" ? value : undefined })}
          />
          <NumberInput
            size="sm"
            label={t("factor")}
            placeholder="1"
            min={0}
            max={SMART_HOME_FACTOR_MAX}
            clampBehavior="strict"
            decimalScale={6}
            value={element.factor ?? ""}
            onChange={(value) =>
              set({
                factor: typeof value === "number" && value > 0 && value <= SMART_HOME_FACTOR_MAX ? value : undefined,
              })
            }
          />
          <TextInput
            size="sm"
            label={t("unit")}
            placeholder={entity ? t("auto") : ""}
            value={element.unit ?? ""}
            maxLength={12}
            onChange={(event) => set({ unit: event.currentTarget.value || undefined })}
          />
        </Group>
      ),
    });
    sections.push({
      value: "rules",
      label: t("sectionRules"),
      content: <RulesEditor rules={element.rules ?? []} onChange={(rules) => set({ rules })} />,
    });
  }
  // What the element shows: each part its view and entity offer can be switched off.
  const parts = isStatic ? [] : getElementParts(element.view, entity?.domain);
  if (parts.length > 0) {
    const hidden = new Set(element.hide ?? []);
    const togglePart = (part: SmartHomeElementPart, shown: boolean) => {
      const next = shown ? [...hidden].filter((candidate) => candidate !== part) : [...hidden, part];
      set({ hide: next.length > 0 ? next : undefined });
    };
    sections.push({
      value: "parts",
      label: t("sectionParts"),
      content: (
        <Stack gap="xs">
          {parts.map((part) => (
            <Switch
              key={part}
              label={t(`parts.${part}`)}
              checked={!hidden.has(part)}
              onChange={(event) => togglePart(part, event.currentTarget.checked)}
            />
          ))}
        </Stack>
      ),
    });
  }
  if (!isStatic) {
    const condition = element.condition;
    sections.push({
      value: "visibility",
      label: t("sectionVisibility"),
      content: (
        <Stack gap="xs">
          <Switch
            label={t("readOnly")}
            description={t("readOnlyHint")}
            checked={element.readOnly === true}
            onChange={(event) => set({ readOnly: event.currentTarget.checked || undefined })}
          />
          <Switch
            label={t("condition")}
            checked={condition !== undefined}
            onChange={(event) =>
              set({ condition: event.currentTarget.checked ? { op: "eq", value: "on" } : undefined })
            }
          />
          {condition && (
            <>
              <SmartHomeEntitySelect
                catalog={catalog}
                label={t("conditionEntity")}
                placeholder={t("conditionOwnEntity")}
                value={condition.entityId ?? null}
                clearable
                onChange={(entityId) => set({ condition: { ...condition, entityId: entityId ?? undefined } })}
              />
              <Group gap={6} wrap="nowrap">
                <Select
                  size="sm"
                  w={64}
                  aria-label={t("ruleOperator")}
                  allowDeselect={false}
                  data={operatorData}
                  value={condition.op}
                  onChange={(op) => op && set({ condition: { ...condition, op: op as SmartHomeCompareOperator } })}
                />
                <TextInput
                  size="sm"
                  flex={1}
                  aria-label={t("ruleValue")}
                  placeholder={t("conditionValue")}
                  maxLength={SMART_HOME_COMPARISON_MAX}
                  value={condition.value}
                  onChange={(event) => set({ condition: { ...condition, value: event.currentTarget.value } })}
                />
              </Group>
              <Switch
                label={t("conditionCollapse")}
                description={t("conditionCollapseHint")}
                checked={condition.collapse === true}
                onChange={(event) =>
                  set({ condition: { ...condition, collapse: event.currentTarget.checked || undefined } })
                }
              />
            </>
          )}
        </Stack>
      ),
    });
  }

  return (
    <Stack gap="xs" className={classes.elementRow}>
      <Group gap="xs" wrap="nowrap" justify="space-between" align="flex-start">
        <Group gap={8} wrap="nowrap" miw={0}>
          {missing && <IconAlertTriangle size={18} color="var(--mantine-color-orange-6)" aria-hidden />}
          <Stack gap={0} miw={0}>
            <Text size="sm" fw={600} truncate title={entity?.name ?? element.entityId}>
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed" ff={missing ? "monospace" : undefined} truncate title={subtitle}>
                {subtitle}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap={2} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" onClick={onDuplicate} aria-label={t("duplicate")}>
            <IconCopy size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label={t("removeElement")}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
      {!isStatic && (
        <SmartHomeEntitySelect
          catalog={catalog}
          label={t("elementEntity")}
          description={missing ? t("missingEntityHint") : undefined}
          value={element.entityId || null}
          clearable={false}
          onChange={relink}
        />
      )}
      <Select
        size="sm"
        label={t("view")}
        allowDeselect={false}
        data={
          isStatic
            ? views.map((view) => ({ value: view, label: t(`views.${view}`) }))
            : (["controls", "readings"] as const)
                .map((group) => ({
                  group: t(`viewGroups.${group}`),
                  items: views
                    .filter((view) => isControlView(view) === (group === "controls"))
                    .map((view) => ({ value: view, label: t(`views.${view}`) })),
                }))
                .filter((group) => group.items.length > 0)
        }
        value={element.view}
        onChange={(value) => value && set({ view: value as SmartHomeElementView })}
      />
      {element.view !== "divider" && element.view !== "spacer" && (
        <Group gap="xs" wrap="nowrap" align="flex-end">
          {iconElementViews.has(element.view) && (
            <TablerIconPicker
              label={t("icon")}
              resetLabel={t("iconReset")}
              suggestions={smartHomeIconSuggestions}
              value={element.icon}
              onChange={(icon) => set({ icon })}
            />
          )}
          <TextInput
            size="sm"
            flex={1}
            label={element.view === "heading" ? t("headingText") : t("elementLabel")}
            placeholder={isStatic ? "" : title}
            value={element.label ?? ""}
            maxLength={SMART_HOME_LAYOUT_MAX_TEXT}
            disabled={element.hideLabel === true}
            onChange={(event) => set({ label: event.currentTarget.value || undefined })}
          />
        </Group>
      )}
      {element.view === "heading" && (
        <SegmentedControl
          size="xs"
          fullWidth
          aria-label={t("align")}
          value={element.align ?? "start"}
          onChange={(value) => set({ align: value === "start" ? undefined : (value as "center" | "end") })}
          data={[
            { value: "start", label: <IconAlignLeft size={16} aria-label={t("alignStart")} /> },
            { value: "center", label: <IconAlignCenter size={16} aria-label={t("alignCenter")} /> },
            { value: "end", label: <IconAlignRight size={16} aria-label={t("alignEnd")} /> },
          ]}
        />
      )}
      {element.view === "camera" && (
        <Switch
          label={t("cameraLive")}
          description={t("cameraLiveHint")}
          checked={element.live !== false}
          onChange={(event) => set({ live: event.currentTarget.checked ? undefined : false })}
        />
      )}
      {labelledElementViews.has(element.view) && (
        <Switch
          label={t("showLabel")}
          checked={element.hideLabel !== true}
          onChange={(event) => set({ hideLabel: event.currentTarget.checked ? undefined : true })}
        />
      )}
      <OptionSections sections={sections} />
    </Stack>
  );
}
