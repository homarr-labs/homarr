import { parse } from "superjson";

import type { Database, InferSelectModel } from "@homarr/db";
import type { apps } from "@homarr/db/schema";

import type { BackendPrincipal } from "../../context";
import type { AppProcedureResources } from "./resources";

export class AppAccessControl {
  constructor(
    private readonly db: Database,
    private readonly principal: BackendPrincipal,
    private readonly resources: AppProcedureResources,
    private readonly signal: AbortSignal,
  ) {}

  async canUserSeeAppAsync(appId: string) {
    return await this.canUserSeeAppsAsync([appId]);
  }

  async canUserSeeAppsAsync(appIds: string[]) {
    this.signal.throwIfAborted();
    if (this.principal.kind === "authenticated") return true;
    const appIdsOnPublicBoards = await this.getAllAppIdsOnPublicBoardsAsync();
    this.signal.throwIfAborted();
    return appIds.every((appId) => appIdsOnPublicBoards.includes(appId));
  }

  private async getAllAppIdsOnPublicBoardsAsync() {
    const { eq, or } = this.resources.operators;
    const { items } = this.resources.tables;
    const itemsWithApps = await this.db.query.items.findMany({
      where: or(eq(items.kind, "app"), eq(items.kind, "bookmarks")),
      with: { board: { columns: { isPublic: true } } },
    });
    this.signal.throwIfAborted();
    return itemsWithApps
      .filter((item) => item.board.isPublic)
      .flatMap((item) => {
        if (item.kind === "app") return [parse<{ appId: string }>(item.options).appId];
        return parse<{ items: string[] }>(item.options).items;
      });
  }
}

export class AppRepository {
  private readonly accessControl: AppAccessControl;

  constructor(
    private readonly db: Database,
    principal: BackendPrincipal,
    private readonly resources: AppProcedureResources,
    private readonly signal: AbortSignal,
  ) {
    this.accessControl = new AppAccessControl(db, principal, resources, signal);
  }

  async getByIdAsync(id: string): Promise<InferSelectModel<typeof apps> | null> {
    const result = await this.getByIdsAsync([id]);
    return result[0] ?? null;
  }

  async getByIdsAsync(ids: string[]): Promise<InferSelectModel<typeof apps>[]> {
    const canUserSeeApps = await this.accessControl.canUserSeeAppsAsync(ids);
    this.signal.throwIfAborted();
    if (!canUserSeeApps) return [];
    return await this.db.query.apps.findMany({
      where: this.resources.operators.inArray(this.resources.tables.apps.id, ids),
    });
  }
}
