"use client";

import type { PropsWithChildren } from "react";

import type { RouterOutputs } from "@homarr/api";
import { BoardPreviewProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { SpotlightProvider } from "@homarr/spotlight";

// Widget components also read board appearance outside dashboard routes. This
// personal context has no persisted board or grid item behind it. Inline edits
// are saved through the header's setOptions callback, never board mutations.
const headerWidgetBoard: RouterOutputs["board"]["getBoardByName"] = {
  id: "",
  name: "header",
  creatorId: null,
  creator: null,
  isPublic: false,
  pageTitle: null,
  metaTitle: null,
  logoImageUrl: null,
  faviconImageUrl: null,
  backgroundImageUrl: null,
  backgroundImageAttachment: "scroll",
  backgroundImageRepeat: "no-repeat",
  backgroundImageSize: "cover",
  primaryColor: null,
  secondaryColor: null,
  opacity: 100,
  customCss: "",
  iconColor: null,
  itemRadius: "md",
  disableStatus: false,
  groupPermissions: [],
  userPermissions: [{ permission: "modify" }],
  sections: [],
  items: [],
  layouts: [],
};

export const HeaderWidgetRuntimeBoundary = ({ children }: PropsWithChildren) => (
  <EditModeProvider>
    <BoardPreviewProvider board={headerWidgetBoard}>
      <SpotlightProvider>{children}</SpotlightProvider>
    </BoardPreviewProvider>
  </EditModeProvider>
);
