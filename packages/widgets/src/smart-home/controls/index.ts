import { IconSmartHome } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";
import { BlockAddButton, BlockListItem, useBlockListData, useCatalogEntityOptions } from "./configuration";
import type { SmartHomeBlockListItem } from "./configuration";
import { smartHomeLayoutModes } from "./custom-layout/schema";
import {
  haDomains,
  smartHomeControlPalettes,
  smartHomeControlSizes,
  smartHomePresentations,
  smartHomeReadingOrders,
} from "./types";

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
        layoutMode: factory.select({
          options: smartHomeLayoutModes.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.option.layoutMode.option.${value}`),
          })),
          defaultValue: "automatic",
        }),
        customLayout: factory.smartHomeLayout(),
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
        groupByDevice: factory.switch({ withDescription: true }),
        readingOrder: factory.select({
          options: smartHomeReadingOrders.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-controls.option.readingOrder.option.${value}`),
          })),
          defaultValue: "automatic",
          withDescription: true,
        }),
        showDeviceGraph: factory.switch({ defaultValue: true, withDescription: true }),
        showDeviceKeyValue: factory.switch({ withDescription: true }),
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
        // Each mode only shows its own settings; switching modes keeps the other mode's values.
        customLayout: { shouldHide: (options) => options.layoutMode !== "custom" },
        presentation: { shouldHide: (options) => options.layoutMode === "custom" },
        blocks: { shouldHide: (options) => options.layoutMode === "custom" },
        roomDomains: { shouldHide: (options) => options.layoutMode === "custom" },
        excludedEntityIds: { shouldHide: (options) => options.layoutMode === "custom" },
        groupByDevice: { shouldHide: (options) => options.layoutMode === "custom" },
        showSummary: {
          shouldHide: (options) => options.layoutMode === "custom" || options.presentation !== "entities",
        },
        readingOrder: { shouldHide: (options) => options.layoutMode === "custom" || !options.groupByDevice },
        showDeviceGraph: {
          shouldHide: (options) =>
            options.layoutMode === "custom" || options.presentation !== "controlPanel" || !options.groupByDevice,
        },
        showDeviceKeyValue: {
          shouldHide: (options) =>
            options.layoutMode === "custom" || options.presentation !== "controlPanel" || !options.groupByDevice,
        },
        controlSize: {
          shouldHide: (options) => options.layoutMode === "custom" || options.presentation !== "controlPanel",
        },
        palette: {
          shouldHide: (options) => options.layoutMode !== "custom" && options.presentation !== "controlPanel",
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
