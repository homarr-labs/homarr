import { definePlugin } from "nitro";

import { getFixtureConfig } from "../../src/server/context/config";
import { closeDatabase, initializeDatabase } from "../../src/server/database/lifecycle";
import { closeRenderState } from "../../src/server/render/handler";
import { closeSessions } from "../../src/server/session/service";
import { closeWidgetState } from "../../src/server/widget/service";

export default definePlugin(async (app) => {
  getFixtureConfig();
  app.hooks.hook("close", async () => {
    await closeRenderState();
    await closeSessions();
    await closeWidgetState();
    await closeDatabase();
  });
  await initializeDatabase();
});
