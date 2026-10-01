import { IconServer2 } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { supportsStorageVolumeSelection } from "../filter-storage-volumes";
import { optionsBuilder } from "../options";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";

export const { definition, componentLoader } = createWidgetDefinition("systemDisks", {
  supportsAdvancedFocus: true,
  icon: IconServer2,
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 10,
  ...getWidgetIntegrationConfig("systemDisks"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showTemperatureIfAvailable: factory.switch({ defaultValue: true }),
        displayMode: factory.select({
          options: (["percentage", "absolute", "free"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.systemDisks.option.displayMode.option.${value}.label`),
          })),
          defaultValue: "percentage",
        }),
        showBackgroundBar: factory.switch({ defaultValue: true }),
        visibleStorageVolumes: factory.integrationMultiSelect(createStorageVolumeMultiSelectOptions()),
      }),
      {
        visibleStorageVolumes: {
          shouldHide(_, integrationKinds) {
            return !supportsStorageVolumeSelection(integrationKinds);
          },
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
