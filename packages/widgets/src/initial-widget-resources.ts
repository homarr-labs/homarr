import { definition as appDefinition } from "./app";
import AppComponent from "./app/component";
import { definition as bookmarksDefinition } from "./bookmarks";
import BookmarksComponent from "./bookmarks/component";

// These tiles are server-rendered in the first board response. Include their
// client code in the board bundle so hydration cannot replace them with a
// module-loading fallback while their lazy imports resolve.
export const initialWidgetResources = {
  app: { definition: appDefinition, Component: AppComponent },
  bookmarks: { definition: bookmarksDefinition, Component: BookmarksComponent },
};
