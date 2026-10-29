"use client";

import { useEffect, useState } from "react";
import {
  CloseButton,
  ColorInput,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import type { z } from "zod/v4";

import type { WidgetKind } from "@homarr/definitions";
import { getWidgetName } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { createModal, ModalFormFooter, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";
import { loadAllWidgetDefinitions } from "@homarr/widgets/manifest";

import { useSectionItems } from "../use-section-items";

const containerEditFormSchema = containerSectionOptionsSchema.unwrap().superRefine((options, context) => {
  if (!options.autoExpand.enabled || options.autoExpand.itemId !== null) return;
  context.addIssue({ code: "invalid_type", expected: "string", input: null, path: ["autoExpand", "itemId"] });
});

interface ModalProps {
  sectionId: string;
  value: z.infer<typeof containerSectionOptionsSchema>;
  onSuccessfulEdit: (value: z.infer<typeof containerSectionOptionsSchema>) => void;
}

export const ContainerEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const tSection = useI18n("section");
  const theme = useMantineTheme();
  const { items } = useSectionItems(innerProps.sectionId);
  const [activityCapableKinds, setActivityCapableKinds] = useState<ReadonlySet<WidgetKind>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void loadAllWidgetDefinitions().then((definitions) => {
      if (cancelled) return;
      const kinds = [...definitions.entries()]
        .filter(([, definition]) => definition.activitySignal !== undefined)
        .map(([kind]) => kind);
      setActivityCapableKinds(new Set(kinds));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activityCapableItems = items.filter((item) => activityCapableKinds.has(item.kind));
  const form = useZodForm(containerEditFormSchema, {
    mode: "controlled",
    initialValues: { ...innerProps.value },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        innerProps.onSuccessfulEdit(values);
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput label={tSection("container.option.title.label")} data-autofocus {...form.getInputProps("title")} />
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
        <Switch
          label={tSection("option.autoExpand.label")}
          description={tSection("option.autoExpand.description")}
          disabled={activityCapableItems.length === 0}
          {...form.getInputProps("autoExpand.enabled", { type: "checkbox" })}
          onChange={(event) => {
            const enabled = event.currentTarget.checked;
            form.setFieldValue("autoExpand.enabled", enabled);
            if (enabled && form.values.autoExpand.inactiveDisplay === "collapsed") {
              form.setFieldValue("collapsible", true);
            }
          }}
        />
        {form.values.autoExpand.enabled && (
          <>
            <Select
              label={tSection("container.option.autoExpand.item.label")}
              placeholder={tSection("container.option.autoExpand.item.placeholder")}
              data={activityCapableItems.map((item) => ({
                value: item.id,
                label: item.advancedOptions.title?.trim() || getWidgetName(item.kind, t),
              }))}
              {...form.getInputProps("autoExpand.itemId")}
            />
            <SegmentedControl
              data={[
                {
                  value: "collapsed",
                  label: tSection("container.option.autoExpand.inactiveDisplay.collapsed"),
                },
                { value: "hidden", label: tSection("container.option.autoExpand.inactiveDisplay.hidden") },
              ]}
              {...form.getInputProps("autoExpand.inactiveDisplay")}
              onChange={(value) => {
                form.setFieldValue("autoExpand.inactiveDisplay", value as "collapsed" | "hidden");
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
              onClick={() => form.setFieldValue("borderColor", "")}
              style={{ display: form.getInputProps("borderColor").value ? undefined : "none" }}
            />
          }
          {...form.getInputProps("borderColor")}
        />
        <ModalFormFooter onCancel={actions.closeModal} />
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: modalSizeForm,
});
