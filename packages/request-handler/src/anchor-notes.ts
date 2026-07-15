import type { AnchorNote, AnchorNotesListInput, AnchorNoteSummary } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const anchorNotesListRequestHandler = createIntegrationRequestHandler<
  AnchorNoteSummary[],
  "anchor",
  AnchorNotesListInput
>({
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return instance.listNotesAsync(input);
  },
  cacheTtlMs: 15_000,
});

export const anchorNoteRequestHandler = createIntegrationRequestHandler<AnchorNote, "anchor", { noteId: string }>({
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return instance.getNoteAsync(input.noteId);
  },
  cacheTtlMs: 15_000,
});
