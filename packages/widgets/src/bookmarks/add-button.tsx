"use client";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { SortableItemListInput } from "../options";
import { BookmarkAddButtonView } from "./add-button-view";
import { BookmarkGroupsEditor } from "./groups";
import type { BookmarkSelectionItem } from "./selection-type";

export type { BookmarkSelectionItem } from "./selection-type";

export const BookmarkAddButton: SortableItemListInput<BookmarkSelectionItem, string>["AddButton"] = (props) => {
  const t = useI18n("widget.bookmarks.option.items.apps");
  const tCommon = useI18n("common");
  const tSelect = useI18n("app.action.select");
  const selectableApps = clientApi.app.selectable.useQuery();

  return (
    <BookmarkAddButtonView
      {...props}
      selectableApps={selectableApps}
      labels={{
        label: t("label"),
        description: t("description"),
        placeholder: t("placeholder"),
        addUrl: t("addUrl"),
        hint: t("hint"),
        error: tCommon("error"),
        notFound: tSelect("notFound"),
      }}
      groupsEditor={<BookmarkGroupsEditor />}
    />
  );
};
