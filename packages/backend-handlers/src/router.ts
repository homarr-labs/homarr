import { Hono } from "hono";

import {
  getCrowdinContributors,
  getGithubContributors,
  getOpenCollectiveContributors,
} from "@homarr/backend-handlers/about/contributors";
import { GET as getDependencies } from "@homarr/backend-handlers/about/dependencies";
import { GET as exportBackup } from "@homarr/backend-handlers/backup/export";
import { POST as importBackup } from "@homarr/backend-handlers/backup/import";
import { GET as getBackupMigrations } from "@homarr/backend-handlers/backup/migrations";
import { GET as getSqlWasm } from "@homarr/backend-handlers/backup/sql-wasm";
import {
  GET as getConfigurationRequest,
  POST as completeConfigurationRequest,
} from "@homarr/backend-handlers/custom-widgets/configuration-request/route";
import { GET as getAuthoringResource } from "@homarr/backend-handlers/custom-widgets/resources";
import { GET as getHealthLive } from "@homarr/backend-handlers/health/live";
import { GET as getHealthReady } from "@homarr/backend-handlers/health/ready";
import { GET as getImageProxy } from "@homarr/backend-handlers/image-proxy";
import { POST as claimOnboarding } from "@homarr/backend-handlers/onboarding-claim";
import { GET as getUserMedia } from "@homarr/backend-handlers/user-medias";

export const resourcesRoutes = new Hono()
  .get("/api/about/contributors/crowdin", () => getCrowdinContributors())
  .get("/api/about/contributors/github", () => getGithubContributors())
  .get("/api/about/contributors/opencollective", () => getOpenCollectiveContributors())
  .get("/api/about/dependencies", () => getDependencies())
  .get("/api/backup/export", (context) => exportBackup(context.req.raw))
  .post("/api/backup/import", (context) => importBackup(context.req.raw))
  .get("/api/backup/migrations", () => getBackupMigrations())
  .get("/api/backup/sql-wasm", () => getSqlWasm())
  .get("/api/custom-widgets/configuration-request/:token", (context) =>
    getConfigurationRequest(context.req.raw, { params: Promise.resolve({ token: context.req.param("token") }) }),
  )
  .post("/api/custom-widgets/configuration-request/:token", (context) =>
    completeConfigurationRequest(context.req.raw, { params: Promise.resolve({ token: context.req.param("token") }) }),
  )
  .get("/api/custom-widgets/:resource", (context) =>
    getAuthoringResource(context.req.raw, { params: Promise.resolve({ resource: context.req.param("resource") }) }),
  )
  .get("/api/health/live", () => getHealthLive())
  .get("/api/health/ready", () => getHealthReady())
  .get("/api/image-proxy/:id", (context) =>
    getImageProxy(context.req.raw, { params: Promise.resolve({ id: context.req.param("id") }) }),
  )
  .post("/api/onboarding/claim", (context) => claimOnboarding(context.req.raw))
  .get("/api/user-medias/:id", (context) =>
    getUserMedia(context.req.raw, { params: Promise.resolve({ id: context.req.param("id") }) }),
  );
