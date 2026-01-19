import dayjs from "dayjs";

import type { AnchorNote, AnchorNotesListInput, AnchorNoteSummary } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const anchorNotesListRequestHandler = createCachedIntegrationRequestHandler<
  AnchorNoteSummary[],
  "anchor",
  AnchorNotesListInput
>({
  queryKey: "anchorNotesList",
  cacheDuration: dayjs.duration(15, "seconds"),
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.listNotesAsync(input);
  },
});

export const anchorNoteRequestHandler = createCachedIntegrationRequestHandler<
  AnchorNote,
  "anchor",
  { noteId: string }
>({
  queryKey: "anchorNote",
  cacheDuration: dayjs.duration(15, "seconds"),
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getNoteAsync(input.noteId);
  },
});
