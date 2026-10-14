import "@mantine/core/styles.css";

import clientAssets from "./entry-client?assets=client";
import serverAssets from "./entry-server?assets=ssr";
import { runFixtureRequest } from "./server/context/http";
import { renderPage } from "./server/render/handler";

export default {
  fetch(request: Request) {
    return runFixtureRequest(request, (context) => renderPage(context, clientAssets.merge(serverAssets)));
  },
};
