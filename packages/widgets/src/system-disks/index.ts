import { IconServer2 } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";

export const { definition, componentLoader } = createWidgetDefinition("systemDisks", {
  icon: IconServer2,
  mobile: {
    width: 2,
    height: 1,
    supportsCompactSummary: true,
    supportsDetailView: true,
    unmountWhenOffscreen: true,
  },
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 5,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid", "synology"],
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
            return integrationKinds.length === 0 || !integrationKinds.every((kind) => kind === "synology");
          },
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
