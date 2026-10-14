import type { createAppProcedures } from "@homarr/api/nitro/routers/app";

import type { BookmarkItem } from "./bookmark-item";

type NativeAppProcedures = ReturnType<typeof createAppProcedures>;
type NativeAppOutputs = {
  [TMethod in "byIds" | "selectable"]: NonNullable<
    NonNullable<NativeAppProcedures[TMethod]["~orpc"]["__TOutputSchema"]>["type"]["~standard"]["types"]
  >["output"];
};

export type BookmarkAppIds = NonNullable<
  NonNullable<NativeAppProcedures["byIds"]["~orpc"]["__TInputSchema"]>["type"]["~standard"]["types"]
>["input"];
export type BookmarkAppsByIds = NativeAppOutputs["byIds"];
export type BookmarkSelectableApps = NativeAppOutputs["selectable"];
export type BookmarkSelectionItem = BookmarkSelectableApps[number] | BookmarkItem;

export interface BookmarkAppsByIdsObservation {
  data: BookmarkAppsByIds | undefined;
  error: unknown;
  isLoading: boolean;
}

export interface BookmarkSelectableAppsObservation {
  data: BookmarkSelectableApps | undefined;
  error: unknown;
  isPending: boolean;
}
