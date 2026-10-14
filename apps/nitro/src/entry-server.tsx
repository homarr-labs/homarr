import "./app/preview-styles";

import { fetchApplication } from "@homarr/backend/host";
import type { PreparedApplicationRenderer } from "@homarr/backend/host";

import clientAssets from "./entry-client?assets=client";
import serverAssets from "./entry-server?assets=ssr";
import { renderPublicPage } from "./ssr/render";

export default {
  fetch: (request: Request) => {
    const mergedAssets = clientAssets.merge(serverAssets);
    const render: PreparedApplicationRenderer = (context, prepared) =>
      renderPublicPage(context, mergedAssets, prepared);
    return fetchApplication(request, render);
  },
};
