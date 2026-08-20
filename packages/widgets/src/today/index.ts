import { IconCalendarWeek } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("today", {
  icon: IconCalendarWeek,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      weekConvention: factory.select({
        defaultValue: "locale",
        options: [
          { value: "locale", label: (t) => t("widget.today.option.weekConvention.options.locale") },
          { value: "iso", label: (t) => t("widget.today.option.weekConvention.options.iso") },
        ],
      }),
      showWeekNumber: factory.switch({ defaultValue: true }),
      showDayOfYear: factory.switch({ defaultValue: true }),
      showQuarter: factory.switch({ defaultValue: true }),
      showYearProgress: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
