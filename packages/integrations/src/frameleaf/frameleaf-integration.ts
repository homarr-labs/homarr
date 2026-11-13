import { db } from "@homarr/db";

import { Integration } from "../base/integration";
import { FrameleafReader } from "./reader";
import { FrameleafDatabaseStore } from "./store";

export class FrameleafIntegration extends Integration {
  protected async testingAsync() {
    await new FrameleafReader(new FrameleafDatabaseStore(db, this.publicIntegration.id)).albumsAsync();
    return { success: true } as const;
  }
}
