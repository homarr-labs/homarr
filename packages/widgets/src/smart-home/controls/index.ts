import { IconSmartHome } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";
import { BlockAddButton, BlockListItem, useBlockListData, useCatalogEntityOptions } from "./configuration";
import type { SmartHomeBlockListItem } from "./configuration";
import { haDomains, smartHomeControlPalettes, smartHomeControlSizes, smartHomePresentations } from "./types";

const noBlocks: string[] = [];

export const { definition, componentLoader } = createWidgetDefinition("smartHome-controls", {
  icon: IconSmartHome,
  supportsInlineEditing: true,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "smartHome"]],
  ...getWidgetIntegrationConfig("smartHome-controls"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        presentation: factory.select({
          options: smartHomePresentations.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.option.presentation.option.${value}`),
          })),
          defaultValue: "entities",
        }),
        title: factory.text(),
        blocks: {
          ...factory.sortableItemList<SmartHomeBlockListItem, string>({
            ItemComponent: BlockListItem,
            AddButton: BlockAddButton,
            uniqueIdentifier: (item) => item.id,
            useData: useBlockListData,
          }),
          defaultValue: noBlocks,
        },
        roomDomains: factory.multiSelect({
          options: haDomains.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.domain.${value}`),
          })),
          searchable: true,
          withDescription: true,
        }),
        excludedEntityIds: factory.dynamicMultiSelect({
          useOptions: useCatalogEntityOptions,
          withDescription: true,
        }),
        showSummary: factory.switch({ defaultValue: true }),
        readOnly: factory.switch({ withDescription: true }),
        controlSize: factory.select({
          options: smartHomeControlSizes.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.option.controlSize.option.${value}`),
          })),
          defaultValue: "auto",
        }),
        palette: factory.select({
          options: smartHomeControlPalettes.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.option.palette.option.${value}`),
          })),
          defaultValue: "boring",
        }),
      }),
      {
        showSummary: { shouldHide: (options) => options.presentation !== "entities" },
        controlSize: {
          shouldHide: (options) => options.presentation !== "controlPanel",
        },
        palette: {
          shouldHide: (options) => options.presentation !== "controlPanel",
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
