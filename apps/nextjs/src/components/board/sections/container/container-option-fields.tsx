import {
  Accordion,
  CloseButton,
  ColorInput,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  useMantineTheme,
} from "@mantine/core";

import { getWidgetName } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import type { ContainerSectionOptions, SmartContainerOptions } from "@homarr/validation/shared";
import type { Item } from "~/app/[locale]/boards/_types";

interface SmartOptionsProps {
  smart: SmartContainerOptions;
  setSmartOption: <K extends keyof SmartContainerOptions>(key: K, value: SmartContainerOptions[K]) => void;
}

export const editorSwitchStyles = { body: { minHeight: 44, alignItems: "center" } };

export const ContainerRotationSettings = ({ smart, setSmartOption }: SmartOptionsProps) => {
  const t = useI18n("section.container.smart");
  return (
    <Stack gap="md">
      <Select
        label={t("mode")}
        description={t(`modeDescription.${smart.mode}`)}
        data={["manual", "timed", "smart", "hybrid"].map((mode) => ({
          value: mode,
          label: t(mode as "manual" | "timed" | "smart" | "hybrid"),
        }))}
        value={smart.mode}
        allowDeselect={false}
        onChange={(mode) => {
          if (mode) setSmartOption("mode", mode as SmartContainerOptions["mode"]);
        }}
      />
      <NumberInput
        label={t("interval")}
        description={t("intervalDescription")}
        min={5}
        max={3600}
        allowDecimal={false}
        value={smart.intervalSeconds}
        disabled={smart.mode === "manual" || smart.mode === "smart"}
        onChange={(value) => {
          if (typeof value === "number") setSmartOption("intervalSeconds", value);
        }}
      />
      <Select
        label={t("fallbackState")}
        description={t("fallbackStateDescription")}
        placeholder={t("firstEnabledState")}
        data={smart.states
          .filter((state) => state.enabled)
          .map((state, index) => ({
            value: state.id,
            label: state.title || `${t("state")} ${index + 1}`,
          }))}
        value={smart.fallbackStateId ?? null}
        clearable
        onChange={(id) => setSmartOption("fallbackStateId", id ?? undefined)}
        disabled={smart.mode === "manual" || smart.mode === "timed"}
      />
      <Switch
        styles={editorSwitchStyles}
        label={t("skipInactive")}
        description={t("skipInactiveDescription")}
        checked={smart.skipInactive}
        disabled={smart.mode !== "timed"}
        onChange={(event) => setSmartOption("skipInactive", event.currentTarget.checked)}
      />
      <Switch
        styles={editorSwitchStyles}
        label={t("pauseOnHover")}
        description={t("pauseOnHoverDescription")}
        checked={smart.pauseOnHover}
        onChange={(event) => setSmartOption("pauseOnHover", event.currentTarget.checked)}
      />
    </Stack>
  );
};

export const ContainerAppearanceSettings = ({
  form,
  smart,
  setSmartOption,
  activityItems,
}: SmartOptionsProps & { form: UseFormReturnType<ContainerSectionOptions>; activityItems: Item[] }) => {
  const t = useI18n("section.container.smart");
  const tSection = useI18n("section");
  const translate = useI18n();
  const theme = useMantineTheme();
  return (
    <Stack gap="md">
      {smart.enabled && (
        <>
          <Select
            label={t("navigationStyle")}
            data={[
              { value: "reel", label: t("reelStyle") },
              { value: "compact", label: t("compactStyle") },
            ]}
            value={smart.appearance}
            allowDeselect={false}
            onChange={(value) => {
              if (value === "reel" || value === "compact") setSmartOption("appearance", value);
            }}
          />
          <Switch
            styles={editorSwitchStyles}
            label={t("compactQuiet")}
            description={t("compactQuietDescription")}
            checked={smart.compactQuiet}
            onChange={(event) => setSmartOption("compactQuiet", event.currentTarget.checked)}
          />
          <NumberInput
            label={t("minActiveRows")}
            min={1}
            max={24}
            allowDecimal={false}
            {...form.getInputProps("smart.minActiveRows")}
          />
          <NumberInput
            label={t("maxActiveRows")}
            min={1}
            max={24}
            allowDecimal={false}
            {...form.getInputProps("smart.maxActiveRows")}
          />
        </>
      )}
      {smart.enabled && (
        <Switch
          styles={editorSwitchStyles}
          label={t("reclaimSpace")}
          description={t("reclaimSpaceDescription")}
          checked={smart.reclaimSpace}
          onChange={(event) => setSmartOption("reclaimSpace", event.currentTarget.checked)}
        />
      )}
      <Switch
        styles={editorSwitchStyles}
        label={tSection("option.showLabel.label")}
        description={tSection("option.showLabel.description")}
        {...form.getInputProps("showLabel", { type: "checkbox" })}
      />
      <Switch
        styles={editorSwitchStyles}
        label={tSection("option.collapsible.label")}
        description={tSection("option.collapsible.description")}
        {...form.getInputProps("collapsible", { type: "checkbox" })}
        disabled={
          !smart.enabled && form.values.autoExpand.enabled && form.values.autoExpand.inactiveDisplay === "collapsed"
        }
      />
      <Switch
        styles={editorSwitchStyles}
        label={tSection("option.showOpenAll.label")}
        description={tSection("option.showOpenAll.description")}
        {...form.getInputProps("showOpenAll", { type: "checkbox" })}
      />
      {!smart.enabled && (
        <Switch
          styles={editorSwitchStyles}
          label={tSection("option.scrollable.label")}
          description={tSection("option.scrollable.description")}
          {...form.getInputProps("scrollable", { type: "checkbox" })}
        />
      )}
      {!smart.enabled && (
        <>
          <Switch
            styles={editorSwitchStyles}
            label={tSection("option.autoExpand.label")}
            description={tSection("option.autoExpand.description")}
            disabled={activityItems.length === 0 && !form.values.autoExpand.enabled}
            {...form.getInputProps("autoExpand.enabled", { type: "checkbox" })}
            onChange={(event) => {
              const enabled = event.currentTarget.checked;
              form.setFieldValue("autoExpand.enabled", enabled);
              if (enabled && form.values.autoExpand.inactiveDisplay === "collapsed")
                form.setFieldValue("collapsible", true);
            }}
          />
          {form.values.autoExpand.enabled && (
            <>
              <Select
                label={tSection("container.option.autoExpand.item.label")}
                placeholder={tSection("container.option.autoExpand.item.placeholder")}
                data={activityItems.map((item) => ({
                  value: item.id,
                  label: item.advancedOptions.title?.trim() || getWidgetName(item.kind, translate),
                }))}
                {...form.getInputProps("autoExpand.itemId")}
              />
              <SegmentedControl
                data={[
                  { value: "collapsed", label: tSection("container.option.autoExpand.inactiveDisplay.collapsed") },
                  { value: "hidden", label: tSection("container.option.autoExpand.inactiveDisplay.hidden") },
                ]}
                {...form.getInputProps("autoExpand.inactiveDisplay")}
                onChange={(value) => {
                  if (value !== "collapsed" && value !== "hidden") return;
                  form.setFieldValue("autoExpand.inactiveDisplay", value);
                  if (value === "collapsed") form.setFieldValue("collapsible", true);
                }}
              />
              <Switch
                label={tSection("container.option.autoExpand.fitToContent.label")}
                description={tSection("container.option.autoExpand.fitToContent.description")}
                {...form.getInputProps("autoExpand.fitToContent", { type: "checkbox" })}
              />
            </>
          )}
        </>
      )}
      <Accordion variant="contained">
        <Accordion.Item value="advanced">
          <Accordion.Control>{translate("item.edit.advancedOptions.label")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <TextMultiSelect
                label={tSection("container.option.customCssClasses.label")}
                {...form.getInputProps("customCssClasses")}
              />
              <ColorInput
                label={tSection("container.option.borderColor.label")}
                format="hex"
                swatches={Object.values(theme.colors).map((color) => color[6])}
                rightSection={
                  <CloseButton
                    aria-label={translate("common.action.remove")}
                    onClick={() => form.setFieldValue("borderColor", "")}
                    style={{ display: form.values.borderColor ? undefined : "none" }}
                  />
                }
                {...form.getInputProps("borderColor")}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
