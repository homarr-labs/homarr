import { IconServer2 } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { supportsStorageVolumeSelection } from "../filter-storage-volumes";
import { optionsBuilder } from "../options";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";
import type { StorageVolumeObservationHook } from "../storage-volume-options";

export interface DefinitionResources {
  useStorageVolumeObservations: StorageVolumeObservationHook;
}

export const createDefinition = (resources: DefinitionResources) =>
  ({
    kind: "systemDisks",
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
          visibleStorageVolumes: factory.integrationMultiSelect(
            createStorageVolumeMultiSelectOptions(resources.useStorageVolumeObservations),
          ),
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
  }) satisfies WidgetDefinition & { kind: "systemDisks" };
