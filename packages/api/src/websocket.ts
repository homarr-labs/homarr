// The former standalone WebSocket process remains an optional dashboard adapter.
import { createLegacyApiRouter } from "./legacy";
import { appRouter as nativeRouter } from "./root";

export const appRouter = createLegacyApiRouter(nativeRouter);
export { createApiContext as createTRPCContext } from "./procedure";
