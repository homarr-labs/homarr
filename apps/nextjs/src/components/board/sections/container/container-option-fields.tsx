import { Accordion, CloseButton, ColorInput, NumberInput, Select, Stack, Switch, useMantineTheme } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import type { ContainerSectionOptions, SmartContainerOptions } from "@homarr/validation/shared";

interface SmartOptionsProps {
  smart: SmartContainerOptions;
  setSmartOption: <K extends keyof SmartContainerOptions>(key: K, value: SmartContainerOptions[K]) => void;
}

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
      <Switch
        label={t("skipInactive")}
        description={t("skipInactiveDescription")}
        checked={smart.skipInactive}
        onChange={(event) => setSmartOption("skipInactive", event.currentTarget.checked)}
      />
      <Switch
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
}: SmartOptionsProps & { form: UseFormReturnType<ContainerSectionOptions> }) => {
  const t = useI18n("section.container.smart");
  const tSection = useI18n("section");
  const translate = useI18n();
  const theme = useMantineTheme();
  return (
    <Stack gap="md">
      <Switch
        label={t("reclaimSpace")}
        description={t("reclaimSpaceDescription")}
        checked={smart.reclaimSpace}
        onChange={(event) => setSmartOption("reclaimSpace", event.currentTarget.checked)}
      />
      <Switch
        label={tSection("option.showLabel.label")}
        description={tSection("option.showLabel.description")}
        {...form.getInputProps("showLabel", { type: "checkbox" })}
      />
      <Switch
        label={tSection("option.collapsible.label")}
        description={tSection("option.collapsible.description")}
        {...form.getInputProps("collapsible", { type: "checkbox" })}
      />
      <Switch
        label={tSection("option.showOpenAll.label")}
        description={tSection("option.showOpenAll.description")}
        {...form.getInputProps("showOpenAll", { type: "checkbox" })}
      />
      <Switch
        label={tSection("option.scrollable.label")}
        description={tSection("option.scrollable.description")}
        {...form.getInputProps("scrollable", { type: "checkbox" })}
      />
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
