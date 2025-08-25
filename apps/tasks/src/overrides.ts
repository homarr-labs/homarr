import { setGlobalDispatcher } from "undici";

import { LoggingAgent } from "@homarr/common/server";

const agent = new LoggingAgent();
setGlobalDispatcher(agent);
