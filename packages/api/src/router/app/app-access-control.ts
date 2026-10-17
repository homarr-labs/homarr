import SuperJSON from "superjson";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq, inArray, or } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";

import type { WidgetComponentProps } from "../../../../widgets/src";

export class AppAccessControl {
  constructor(
    private db: Database,
    private user: Session["user"] | null,
  ) {}

  async canUserSeeAppAsync(appId: string) {
    return await this.canUserSeeAppsAsync([appId]);
  }

  async canUserSeeAppsAsync(appIds: string[]) {
    // Currently any user can see all apps if they are logged in
    if (this.user) return true;

    const appIdsOnPublicBoards = new Set(await this.getAllAppIdsOnPublicBoardsAsync());
    return appIds.every((appId) => appIdsOnPublicBoards.has(appId));
  }

  private async getAllAppIdsOnPublicBoardsAsync() {
    const itemsWithApps = await this.db.query.items.findMany({
      columns: { kind: true, options: true },
      where: and(
        or(eq(items.kind, "app"), eq(items.kind, "bookmarks")),
        inArray(items.boardId, this.db.select({ id: boards.id }).from(boards).where(eq(boards.isPublic, true))),
      ),
    });

    return itemsWithApps.flatMap((item) => {
      if (item.kind === "app") {
        const parsedOptions = SuperJSON.parse<WidgetComponentProps<"app">["options"]>(item.options);
        return [parsedOptions.appId];
      }

      const parsedOptions = SuperJSON.parse<WidgetComponentProps<"bookmarks">["options"]>(item.options);
      return parsedOptions.items;
    });
  }
}
