import {IconClock} from "@tabler/icons-react";

import {createWidgetDefinition} from "../definition";
import {optionsBuilder} from "../options";
import type {BookmarkItem} from "./bookmark-item";

export const {definition, componentLoader} = createWidgetDefinition("bookmarks", {
  icon: IconClock,
  options: optionsBuilder.from(
    (factory) => ({
      title: factory.text(),
      items: factory.orderedObjectList<BookmarkItem>({
        itemComponent: (bookmarkItem) => {
          return <span>Bookmark: {JSON.stringify(bookmarkItem)}</span>
        }
      })
    }),
  ),
}).withDynamicImport(() => import("./component"));
