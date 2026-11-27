import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion,
  ActionIcon,
  Button,
  ColorInput,
  ColorPicker,
  ColorSwatch,
  convertHsvaTo,
  isColorValid,
  parseColor,
  Divider,
  Group,
  Input,
  Center,
  NumberInput,
  Popover,
  SimpleGrid,
  useMantineTheme,
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
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBan,
  IconLink,
  IconPalette,
  IconPlus,
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
import { isPercentReading, layoutColor } from "./rules";
import { getViewDomains, viewIcons } from "./view-icons";
import {
  controlElementViews,
  fullTileDomains,
  getElementParts,
  alignableElementViews,
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
    <Accordion
      variant="separated"
      multiple
      chevronPosition="left"
      styles={{ content: { padding: "0 var(--mantine-spacing-sm) var(--mantine-spacing-sm)" } }}
    >
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

type ColorTextFormat = "hexa" | "rgba";

/** Any color as stored: #rrggbb, or #rrggbbaa when it is see-through. */
const toStoredColor = (color: string) => {
  const hsva = parseColor(color);
  return convertHsvaTo(hsva.a < 1 ? "hexa" : "hex", hsva).toLowerCase() as `#${string}`;
};

/** A color as text in the chosen format; an opaque color in HEX keeps the short #rrggbb. */
const colorText = (color: string, format: ColorTextFormat) => {
  const hsva = parseColor(color);
  return convertHsvaTo(format === "hexa" && hsva.a >= 1 ? "hex" : format, hsva);
};

/**
 * Any color: the picker with a transparency slider, and the same color as text (HEX or RGBA) to type or paste, with
 * the browser's eyedropper where it has one.
 */
function CustomColorPicker({ value, onChange }: { value: string; onChange: (color: `#${string}`) => void }) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [color, setColor] = useState(value);
  const [format, setFormat] = useState<ColorTextFormat>("hexa");
  // The text field keeps what is typed until it is a color; the picker and the eyedropper write to it.
  const [text, setText] = useState(() => colorText(value, format));
  useEffect(() => {
    setColor(value);
  }, [value]);
  const show = (next: string, nextFormat = format) => {
    setColor(next);
    setText(colorText(next, nextFormat));
  };
  const commit = (next: string) => {
    if (isColorValid(next)) onChange(toStoredColor(next));
  };
  return (
    <Stack gap="xs">
      <ColorPicker
        size="sm"
        format="hexa"
        fullWidth
        value={color}
        saturationLabel={t("colorSaturation")}
        hueLabel={t("colorHue")}
        alphaLabel={t("colorAlpha")}
        onChange={(next) => show(next)}
        onChangeEnd={commit}
      />
      <Group gap="xs" wrap="nowrap">
        <SegmentedControl
          size="xs"
          aria-label={t("colorFormat")}
          value={format}
          onChange={(next) => {
            setFormat(next as ColorTextFormat);
            show(color, next as ColorTextFormat);
          }}
          data={[
            { value: "hexa", label: "HEX" },
            { value: "rgba", label: "RGBA" },
          ]}
        />
        <ColorInput
          size="xs"
          flex={1}
          aria-label={t("customColor")}
          format={format}
          withPicker={false}
          withEyeDropper
          value={text}
          onChange={(next) => {
            setText(next);
            if (isColorValid(next)) setColor(next);
          }}
          // The eyedropper and Enter end here; typing ends when the field is left.
          onChangeEnd={commit}
          onBlur={() => commit(text)}
        />
      </Group>
    </Stack>
  );
}

/**
 * A color as a round swatch; a tap opens the palette (theme colors) and a picker for any other color. Takes little
 * room beside a rule's value.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  clearable = false,
  emptyIcon = <IconBan size={20} aria-hidden />,
}: {
  value: SmartHomeLayoutColor | undefined;
  onChange: (color: SmartHomeLayoutColor | undefined) => void;
  clearable?: boolean;
  /** Shown while no color is chosen; the style picker shows a palette there, as it opens more colors. */
  emptyIcon?: ReactNode;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const colorLabel = useColorLabel();
  const theme = useMantineTheme();
  const custom = value && !isNamedLayoutColor(value) ? value : null;
  const name = value ? colorLabel(value) : t("noColor");
  return (
    <Popover position="bottom-end" withArrow shadow="md" trapFocus returnFocus>
      <Popover.Target>
        <ActionIcon
          title={name}
          variant="subtle"
          color="gray"
          radius="xl"
          size="lg"
          aria-label={`${t("color")}: ${name}`}
        >
          {value ? <ColorSwatch color={layoutColor(value)} size={20} /> : emptyIcon}
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <SimpleGrid cols={6} spacing="xs">
            {clearable && (
              <Tooltip label={t("noColor")} openDelay={300}>
                <UnstyledButton
                  className={classes.swatchOption}
                  aria-label={t("noColor")}
                  aria-pressed={!value}
                  onClick={() => onChange(undefined)}
                >
                  <IconBan size={24} aria-hidden />
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
          </SimpleGrid>
          <Divider label={t("customColor")} labelPosition="left" />
          <CustomColorPicker
            value={
              custom ?? theme.colors[value && isNamedLayoutColor(value) ? value : theme.primaryColor]?.[6] ?? "#228be6"
            }
            onChange={onChange}
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
            styles={{ label: { minWidth: 18, paddingInline: 6, fontSize: "var(--mantine-font-size-sm)" } }}
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

interface ElementSettingsProps {
  element: SmartHomeLayoutElement;
  entity: SmartHomeCatalogEntity | undefined;
  catalog: SmartHomeCatalogState;
  /** The integration the editor picks entities from. */
  source: string;
  onChange: (element: SmartHomeLayoutElement) => void;
  /** Just added and still without an entity: the picker opens right away. */
  autoFocusEntity?: boolean;
}

/** The selected element's settings: what it shows and how, with the rarely used options folded away. */
export function ElementSettings({
  element,
  entity,
  catalog,
  source,
  onChange,
  autoFocusEntity = false,
}: ElementSettingsProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [factorDraft, setFactorDraft] = useState<number | string>();
  const isStatic = staticElementViews.has(element.view);
  const views = isStatic ? staticViews : entity ? getAllowedViews(entity) : [element.view];
  const title = isStatic ? t(`views.${element.view}`) : entity ? splitEntityName(entity.name).title : "";
  // Missing only once the catalog has loaded; until then the entity may simply not be known yet.
  const missing = !isStatic && element.entityId !== "" && !entity && catalog.status === "ready";
  const set = (patch: Partial<SmartHomeLayoutElement>) => onChange({ ...element, ...patch });
  // Another entity keeps the element's options; only a view the new entity cannot show changes.
  const relink = (entityId: string | null) => {
    const next = entityId && catalog.status === "ready" ? catalog.index.entitiesById.get(entityId) : undefined;
    if (!next) return;
    const view = getAllowedViews(next).includes(element.view) ? element.view : getDefaultView(next);
    onChange({ ...element, source, entityId: next.id, view });
  };
  // A graph draws and a group combines several entities: one list, the first is the element's own.
  const isMulti = element.view === "graph" || element.view === "group";
  const relinkAll = (ids: string[]) => {
    const [first, ...rest] = ids;
    const next = first && catalog.status === "ready" ? catalog.index.entitiesById.get(first) : undefined;
    const view = !next || getAllowedViews(next).includes(element.view) ? element.view : getDefaultView(next);
    onChange({
      ...element,
      source,
      entityId: first ?? "",
      entityIds: rest.length > 0 ? rest : undefined,
      view,
    });
  };
  // Only an entity that can be controlled has controls; for a sensor, the large tile and the row only show it.
  const controllable = (views as readonly SmartHomeElementView[]).includes("button");
  const isControlView = (view: SmartHomeElementView) => controllable && controlElementViews.has(view);
  // A percentage's large control is a ring that can sit anywhere in its element and reads like a value.
  const ringTile = element.view === "tile" && entity !== undefined && isPercentReading(entity);
  const showsValue = valueElementViews.has(element.view) || ringTile;
  // These have their own place until one is chosen, so no choice shows as selected.
  const movesNumber = element.view === "value" || element.view === "group" || ringTile;

  const sections: OptionSection[] = [];
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
          <Switch
            label={t("showMinMax")}
            checked={element.showMinMax === true}
            onChange={(event) => set({ showMinMax: event.currentTarget.checked || undefined })}
          />
          <Input.Wrapper label={t("graphScale")} description={t("graphScaleHint")}>
            <Group gap="xs" grow mt={4}>
              <NumberInput
                size="sm"
                aria-label={t("graphScaleMin")}
                placeholder={t("graphScaleMin")}
                value={element.scaleMin ?? ""}
                onChange={(value) => set({ scaleMin: typeof value === "number" ? value : undefined })}
              />
              <NumberInput
                size="sm"
                aria-label={t("graphScaleMax")}
                placeholder={t("graphScaleMax")}
                value={element.scaleMax ?? ""}
                onChange={(value) => set({ scaleMax: typeof value === "number" ? value : undefined })}
              />
            </Group>
          </Input.Wrapper>
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
            allowNegative={false}
            clampBehavior="strict"
            value={element.decimals ?? ""}
            // A value outside 0 to 3 is never applied, not even for a moment while it is typed.
            onChange={(value) =>
              set({
                decimals:
                  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3 ? value : undefined,
              })
            }
          />
          <NumberInput
            size="sm"
            label={t("factor")}
            placeholder="1"
            min={0}
            max={SMART_HOME_FACTOR_MAX}
            clampBehavior="strict"
            decimalScale={6}
            value={factorDraft ?? element.factor ?? ""}
            onChange={setFactorDraft}
            onBlur={() => {
              if (factorDraft === "") set({ factor: undefined });
              const value = Number(factorDraft);
              if (value > 0 && value <= SMART_HOME_FACTOR_MAX) set({ factor: value });
              setFactorDraft(undefined);
            }}
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
  // A full tile (thermostat, player, ...) draws its own name and icon.
  const fullTile = element.view === "tile" && entity !== undefined && fullTileDomains.has(entity.domain);
  const canHideLabel = labelledElementViews.has(element.view) && !fullTile;
  // A large control's icon is its switch, so it always shows; a percentage's ring has none.
  const canHideIcon = iconElementViews.has(element.view) && (element.view !== "tile" || ringTile);
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
    <Stack gap="md">
      {isMulti && (
        <SmartHomeEntityPicker
          catalog={catalog}
          label={t(element.view === "graph" ? "graphLines" : "groupEntities")}
          description={missing ? t("missingEntityHint") : element.view === "group" ? t("groupEntitiesHint") : undefined}
          value={[element.entityId, ...(element.entityIds ?? [])].filter((id) => id !== "")}
          domains={getViewDomains(element.view)}
          maxValues={SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES + 1}
          onChange={relinkAll}
          openOnMount={autoFocusEntity}
        />
      )}
      {element.view === "group" && (
        <Select
          size="sm"
          label={t("aggregate")}
          allowDeselect={false}
          data={smartHomeAggregates.map((aggregate) => ({ value: aggregate, label: t(`aggregates.${aggregate}`) }))}
          value={element.aggregate ?? "sum"}
          onChange={(value) => value && set({ aggregate: value as SmartHomeAggregate })}
        />
      )}
      {!isStatic && !isMulti && (
        <SmartHomeEntitySelect
          catalog={catalog}
          label={t("elementEntity")}
          description={missing ? t("missingEntityHint") : undefined}
          value={element.entityId || null}
          clearable={false}
          onChange={relink}
          domains={element.entityId ? undefined : getViewDomains(element.view)}
          openOnMount={autoFocusEntity}
        />
      )}
      {/* How the element shows its entity: one icon per view, controls first. */}
      {views.length > 1 && (
        <Input.Wrapper label={t("view")}>
          <SegmentedControl
            mt={4}
            fullWidth
            size="sm"
            aria-label={t("view")}
            value={element.view}
            onChange={(value) => set({ view: value as SmartHomeElementView })}
            data={views
              .toSorted((left, right) => Number(isControlView(right)) - Number(isControlView(left)))
              .map((view) => {
                const Icon = viewIcons[view];
                return {
                  value: view,
                  label: (
                    <Tooltip label={t(`views.${view}`)} openDelay={300} withinPortal>
                      <Center>
                        <Icon size={18} aria-label={t(`views.${view}`)} />
                      </Center>
                    </Tooltip>
                  ),
                };
              })}
          />
        </Input.Wrapper>
      )}
      {element.view !== "divider" && element.view !== "spacer" && (
        <Group gap="xs" wrap="nowrap" align="flex-end">
          {iconElementViews.has(element.view) && !fullTile && element.hideIcon !== true && (
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
            disabled={canHideLabel && element.hideLabel === true}
            onChange={(event) => set({ label: event.currentTarget.value || undefined })}
          />
        </Group>
      )}
      {(alignableElementViews.has(element.view) || ringTile) && (
        <Input.Wrapper label={t("align")}>
          <SegmentedControl
            mt={4}
            size="xs"
            fullWidth
            aria-label={t("align")}
            // A value's number has its own place until one is chosen (under the label, or at the end of a flat row).
            value={element.align ?? (movesNumber ? "" : "start")}
            onChange={(value) =>
              set({ align: value === "start" && !movesNumber ? undefined : (value as "start" | "center" | "end") })
            }
            data={[
              { value: "start", label: <IconAlignLeft size={16} aria-label={t("alignStart")} /> },
              { value: "center", label: <IconAlignCenter size={16} aria-label={t("alignCenter")} /> },
              { value: "end", label: <IconAlignRight size={16} aria-label={t("alignEnd")} /> },
            ]}
          />
        </Input.Wrapper>
      )}
      {element.view === "camera" && (
        <Switch
          label={t("cameraLive")}
          description={t("cameraLiveHint")}
          checked={element.live !== false}
          onChange={(event) => set({ live: event.currentTarget.checked ? undefined : false })}
        />
      )}
      {canHideIcon && (
        <Switch
          label={t("showIcon")}
          checked={element.hideIcon !== true && !element.hide?.includes("icon")}
          onChange={(event) => {
            const hide = element.hide?.filter((part) => part !== "icon");
            set({
              hideIcon: event.currentTarget.checked ? undefined : true,
              hide: hide && hide.length > 0 ? hide : undefined,
            });
          }}
        />
      )}
      {canHideLabel && (
        <Switch
          label={t("showLabel")}
          checked={element.hideLabel !== true}
          onChange={(event) => set({ hideLabel: event.currentTarget.checked ? undefined : true })}
        />
      )}
      {element.view !== "spacer" && (
        <StylePicker
          label={t("elementStyle")}
          value={element.accent ?? "inherit"}
          inherit
          onChange={(value) => set({ accent: value === "inherit" || value === "state" ? undefined : value })}
        />
      )}
      <OptionSections sections={sections} />
    </Stack>
  );
}

/** A style choice: the card's (elements only), the primary color, each device's own (cards only) or one color. */
export type StyleValue = "inherit" | "neutral" | "state" | SmartHomeLayoutColor;

interface StylePickerProps {
  label: string;
  value: StyleValue;
  onChange: (value: StyleValue) => void;
  /** An element can follow its card; only a card can color by device. */
  inherit?: boolean;
}

const styleBackground = (option: StyleValue) => {
  if (option === "inherit") return "var(--mantine-color-default)";
  if (option === "neutral") return "var(--mantine-color-default-border)";
  if (option === "state")
    return "conic-gradient(var(--mantine-color-yellow-6), var(--mantine-color-green-6), var(--mantine-color-blue-6), var(--mantine-color-grape-6), var(--mantine-color-yellow-6))";
  return layoutColor(option);
};

/** Round swatches for the common choices, and the palette (with a custom color) behind the last one. */
export function StylePicker({ label, value, onChange, inherit = false }: StylePickerProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const colorLabel = useColorLabel();
  const fixed: { value: StyleValue; label: string; swatch: ReactNode }[] = [
    ...(inherit
      ? [{ value: "inherit" as const, label: t("styleLikeCard"), swatch: <IconLink size={14} aria-hidden /> }]
      : []),
    { value: "neutral", label: t("colorsNeutral"), swatch: null },
    ...(inherit ? [] : [{ value: "state" as const, label: t("colorsState"), swatch: null }]),
    { value: "primary", label: colorLabel("primary"), swatch: null },
    { value: "secondary", label: colorLabel("secondary"), swatch: null },
  ];
  const other = !fixed.some((option) => option.value === value) ? (value as SmartHomeLayoutColor) : undefined;
  return (
    <Input.Wrapper label={label}>
      <Group gap={8} mt={6} wrap="wrap">
        {fixed.map((option) => (
          <Tooltip key={option.value} label={option.label} openDelay={300} withinPortal>
            <UnstyledButton
              className={classes.styleSwatch}
              style={{ background: styleBackground(option.value) }}
              aria-label={option.label}
              aria-pressed={option.value === value}
              onClick={() => onChange(option.value)}
            >
              {option.swatch}
            </UnstyledButton>
          </Tooltip>
        ))}
        <ColorSwatchPicker
          value={other}
          onChange={(color) => color && onChange(color)}
          emptyIcon={<IconPalette size={20} aria-hidden />}
        />
      </Group>
    </Input.Wrapper>
  );
}
