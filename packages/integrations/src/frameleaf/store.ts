import { decryptSecret, encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema";

import { FrameleafConnectionError, frameleafStateSchema, normalizeFrameleafOrigin } from "./connection";
import type { FrameleafState, FrameleafStore } from "./connection";

/** The existing encrypted secret row is also the durable refresh claim. SQLite and PostgreSQL use the same CAS. */
export class FrameleafDatabaseStore implements FrameleafStore {
  constructor(
    private readonly database: Database,
    private readonly integrationId: string,
  ) {}
  private predicate() {
    return and(
      eq(integrationSecrets.integrationId, this.integrationId),
      eq(integrationSecrets.kind, "frameleafConnection"),
    );
  }
  private async rowAsync() {
    const integration = await this.database.query.integrations.findFirst({
      where: and(eq(integrations.id, this.integrationId), eq(integrations.kind, "frameleaf")),
    });
    if (!integration) throw new FrameleafConnectionError("reconnect");
    const row = await this.database.query.integrationSecrets.findFirst({ where: this.predicate() });
    if (!row) return { state: null, row: null, origin: normalizeFrameleafOrigin(integration.url) };
    const state = frameleafStateSchema.parse(JSON.parse(decryptSecret(row.value)));
    if (state.origin !== normalizeFrameleafOrigin(integration.url)) throw new FrameleafConnectionError("configuration");
    return { state, row, origin: normalizeFrameleafOrigin(integration.url) };
  }
  async readAsync() {
    try {
      return (await this.rowAsync()).state;
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
  }
  async replaceAsync(previous: FrameleafState | null, next: FrameleafState | null) {
    try {
      const { state, row, origin } = await this.rowAsync();
      if (next && normalizeFrameleafOrigin(next.origin) !== origin) throw new FrameleafConnectionError("configuration");
      if (JSON.stringify(state) !== JSON.stringify(previous === null ? null : frameleafStateSchema.parse(previous)))
        return false;
      if (!row) {
        if (!next) return true;
        const inserted = await this.database
          .insert(integrationSecrets)
          .values({
            integrationId: this.integrationId,
            kind: "frameleafConnection",
            value: encryptSecret(JSON.stringify(next)),
          })
          .onConflictDoNothing()
          .returning({ kind: integrationSecrets.kind });
        return inserted.length === 1;
      }
      const where = and(this.predicate(), eq(integrationSecrets.value, row.value));
      if (!next)
        return (
          (await this.database.delete(integrationSecrets).where(where).returning({ kind: integrationSecrets.kind }))
            .length === 1
        );
      return (
        (
          await this.database
            .update(integrationSecrets)
            .set({ value: encryptSecret(JSON.stringify(next)) })
            .where(where)
            .returning({ kind: integrationSecrets.kind })
        ).length === 1
      );
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
  }
}
