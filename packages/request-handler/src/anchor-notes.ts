import type { AnchorNote, AnchorNotesListInput, AnchorNoteSummary } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations/factory";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const anchorNotesListRequestHandler = createIntegrationRequestHandler<
  AnchorNoteSummary[],
  "anchor",
  AnchorNotesListInput
>({
  cacheNamespace: "anchor-notes:list",
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return instance.listNotesAsync(input);
  },
});

export const anchorNoteRequestHandler = createIntegrationRequestHandler<AnchorNote, "anchor", { noteId: string }>({
  cacheNamespace: "anchor-notes:detail",
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return instance.getNoteAsync(input.noteId);
  },
});
