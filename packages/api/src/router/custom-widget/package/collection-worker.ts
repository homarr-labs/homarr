import { createSessionAsync } from "@homarr/auth/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import { db, and, eq, like } from "@homarr/db";
import { customWidgetStorage, users } from "@homarr/db/schema";

import { selectCollectedValue, widgetCollectorSchema } from "./collection-contracts";
import type { WidgetHistory } from "./collection-contracts";
import {
  collectorKey,
  getCollectorSourceDigest,
  historyKey,
  readCollectionRecord,
  trimWidgetHistory,
  writeCollectionRecord,
} from "./collection-storage";
import { withWidgetInstallationLock } from "./coordination";
import { invokePackageHandler } from "./invocations";
import { resolvePackagePlacement } from "./records";

const logger = createLogger({ module: "widget-collections" });
let timer: ReturnType<typeof setInterval> | undefined;
let running = false;
let lastRetentionSweep = 0;
let redis: ReturnType<typeof createRedisClient> | undefined;

/** Every replica may schedule this tick; Redis admits one collector per sampling slot. */
export async function collectWidgetHistory() {
  if (running) return;
  running = true;
  try {
    const rows = await db.query.customWidgetStorage.findMany({
      where: and(eq(customWidgetStorage.scope, "system"), like(customWidgetStorage.key, "collector:%")),
    });
    const sweepRetention = Date.now() - lastRetentionSweep > 600_000;
    if (sweepRetention) lastRetentionSweep = Date.now();
    for (let offset = 0; offset < rows.length; offset += 4) {
      await Promise.all(
        rows
          .slice(offset, offset + 4)
          .map((row) =>
            collectOne(row, sweepRetention).catch(() =>
              logger.warn("Widget collection did not complete", { installationId: row.installationId }),
            ),
          ),
      );
    }
  } finally {
    running = false;
  }
}

async function collectOne(row: typeof customWidgetStorage.$inferSelect, sweepRetention: boolean) {
  const parsed = widgetCollectorSchema.safeParse(JSON.parse(row.value));
  if (!parsed.success) return;
  if (sweepRetention) {
    await withWidgetInstallationLock(row.installationId, async () => {
      const current = widgetCollectorSchema.safeParse(
        await readCollectionRecord({ db, session: null }, row.installationId, collectorKey(parsed.data.id)),
      );
      if (!current.success) return;
      const history = (await readCollectionRecord(
        { db, session: null },
        row.installationId,
        historyKey(parsed.data.id),
      )) as WidgetHistory | null;
      if (!history) return;
      const before = history.samples.length;
      trimWidgetHistory(history, current.data);
      if (history.samples.length !== before)
        await writeCollectionRecord(
          { db, session: null },
          row.installationId,
          row.ownerKey,
          historyKey(parsed.data.id),
          history,
        );
    });
  }
  if (!parsed.data.enabled) return;
  const collector = parsed.data;
  redis ??= createRedisClient();
  const slot = Math.floor(Date.now() / (collector.intervalSeconds * 1000));
  const key = `custom-widget:collection-slot:${collector.id}:${slot}`;
  if ((await redis.set(key, "1", "EX", collector.intervalSeconds * 2, "NX")) !== "OK") return;
  await withWidgetInstallationLock(collector.installationId, async (signal) => {
    // An owner can pause/remove/rebind a collector while it waits for another managed operation.
    const raw = await readCollectionRecord({ db, session: null }, collector.installationId, collectorKey(collector.id));
    const current = widgetCollectorSchema.safeParse(raw);
    if (!current.success || !current.data.enabled) return;
    const configured = current.data;
    const user = await db.query.users.findFirst({ where: eq(users.id, configured.userId) });
    if (!user) return;
    const session = await createSessionAsync(db, user);
    if (!session.user.permissions.includes("admin")) return;
    const ctx = { db, session };
    const resolved = await resolvePackagePlacement(ctx, configured.itemId).catch(() => null);
    if (!resolved || resolved.installation.id !== configured.installationId) return;
    const sourceDigest = await getCollectorSourceDigest(ctx, resolved, configured);
    const previous = (await readCollectionRecord(
      ctx,
      configured.installationId,
      historyKey(configured.id),
    )) as WidgetHistory | null;
    let samples = previous?.samples ?? [];
    if (previous?.sourceDigest !== sourceDigest) samples = [];
    const history: WidgetHistory = { sourceDigest, samples, unit: configured.unit, lastAttempt: Date.now() };
    try {
      const result = await invokePackageHandler(
        ctx,
        { itemId: configured.itemId, name: configured.handler, input: configured.input },
        "query",
        signal,
      );
      history.samples.push({ timestamp: Date.now(), value: selectCollectedValue(result, configured.valuePath) });
    } catch {
      history.lastError = "Collection failed. Check the connection and handler in the workbench.";
    }
    signal.throwIfAborted();
    await writeCollectionRecord(
      ctx,
      configured.installationId,
      configured.itemId,
      historyKey(configured.id),
      trimWidgetHistory(history, configured),
    );
  });
}

export function startWidgetCollections() {
  if (timer) return;
  timer = setInterval(() => {
    void collectWidgetHistory().catch(() => logger.warn("Widget collection scheduler is unavailable"));
  }, 5000);
  timer.unref();
}
