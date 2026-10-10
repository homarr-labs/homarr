import "@mantine/core/styles.css";

import clientAssets from "./entry-client?assets=client";
import serverAssets from "./entry-server?assets=ssr";
import { fetchApplication } from "./server/host";

export default { fetch: (request: Request) => fetchApplication(request, clientAssets.merge(serverAssets)) };
