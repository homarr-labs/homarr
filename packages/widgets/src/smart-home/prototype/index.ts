import { IconFlask } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";
import { BlockAddButton, BlockListItem, useBlockListData, useCatalogEntityOptions } from "./configuration";
import type { PrototypeBlockListItem } from "./configuration";
import { haDomains, prototypeControlPalettes, prototypeControlSizes, prototypePresentations } from "./types";

const noBlocks: string[] = [];

export const { definition, componentLoader } = createWidgetDefinition("smartHome-prototype", {
  icon: IconFlask,
  supportsInlineEditing: true,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "smartHome"]],
  ...getWidgetIntegrationConfig("smartHome-prototype"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        presentation: factory.select({
          options: prototypePresentations.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-prototype.option.presentation.option.${value}`),
          })),
          defaultValue: "entities",
        }),
        title: factory.text(),
        blocks: {
          ...factory.sortableItemList<PrototypeBlockListItem, string>({
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
            label: (t) => t(`widget.smartHome-prototype.domain.${value}`),
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
          options: prototypeControlSizes.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-prototype.option.controlSize.option.${value}`),
          })),
          defaultValue: "auto",
        }),
        palette: factory.select({
          options: prototypeControlPalettes.map((value) => ({
            value,
            label: (t) => t(`widget.smartHome-prototype.option.palette.option.${value}`),
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
