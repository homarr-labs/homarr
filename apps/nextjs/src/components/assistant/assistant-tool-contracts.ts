import { z } from "zod/v4";

export const browserToolContracts = {
  navigate_to_route: {
    description:
      "Navigate the current Homarr tab to a safe internal route. Only same-origin paths beginning with a single slash are accepted.",
    parameters: z.object({
      path: z.string().describe("An internal Homarr route, for example /manage/apps"),
    }),
  },
  open_command_menu: {
    description: "Open Homarr's command and search menu.",
    parameters: z.object({}),
  },
  open_media_request_search: {
    description: "Open Homarr's media request search interface.",
    parameters: z.object({}),
  },
} as const;
