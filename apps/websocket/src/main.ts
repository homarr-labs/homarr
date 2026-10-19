import { startWebSocketServer } from "@homarr/api/websocket-runtime";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "websocketMain" });
const websocket = startWebSocketServer();

export const startupPromise = websocket.startupPromise;

process.on("SIGTERM", () => {
  logger.info("SIGTERM");
  websocket.stop();
});
