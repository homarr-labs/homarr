
import type { AnchorNote, AnchorNotesListInput, AnchorNoteSummary } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const anchorNotesListRequestHandler = createIntegrationRequestHandler<
  AnchorNoteSummary[],
  "anchor",
  AnchorNotesListInput
>({
  queryKey: "anchorNotesList",
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return instance.listNotesAsync(input);
  },
});

export const anchorNoteRequestHandler = createIntegrationRequestHandler<AnchorNote, "anchor", { noteId: string }>(
  {
    queryKey: "anchorNote",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return instance.getNoteAsync(input.noteId);
    },
  },
);
