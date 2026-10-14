import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { createWidgetDefinition } from "../definition";
import { createDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "timetable",
  createDefinition({
    useStationSearch(input) {
      return clientApi.widget.timetable.searchStations.useQuery(input);
    },
    useTimetableTranslations() {
      return useI18n("widget.timetable");
    },
  }),
).withDynamicImport(() => import("./component"));
