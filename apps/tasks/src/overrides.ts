import { setGlobalDispatcher } from "undici";

import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "tasksOverrides" });
setGlobalDispatcher(new UndiciHttpAgent());
logger.info("Configured global undici dispatcher for tasks runtime");
