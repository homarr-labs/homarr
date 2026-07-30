import { z } from "zod/v4";

const askUserOptionSchema = z.object({
  id: z.string().trim().min(1).max(48),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).optional(),
});

export const browserToolContracts = {
  ask_user: {
    description:
      "Pause and ask the user one concise structured question. Use this for missing information or a meaningful choice, never as a second confirmation before a mutating tool. Provide 2-4 distinct options; the UI adds a freeform Other choice when allowOther is not false.",
    parameters: z.object({
      question: z.string().trim().min(1).max(240),
      description: z.string().trim().max(400).optional(),
      options: z.array(askUserOptionSchema).min(2).max(4),
      allowOther: z.boolean().optional(),
    }),
  },
  configure_app: {
    description:
      "Open Homarr's native app form so the user can review or complete app details. Its icon picker searches the local Homarr icon repository. Use this before app.create instead of inventing an external icon URL.",
    parameters: z.object({
      name: z.string().trim().max(64).optional(),
      description: z.string().trim().max(512).nullable().optional(),
      iconUrl: z
        .string()
        .trim()
        .max(2_048)
        .optional()
        .describe(
          "An exact icon URL returned by Homarr's icon_findIcons tool. Omit this field if no icon tool result is available; the native form will search locally from the app name.",
        ),
      href: z.string().trim().max(2_048).nullable().optional(),
      pingUrl: z.string().trim().max(2_048).nullable().optional(),
    }),
  },
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

export type AskUserArgs = z.infer<(typeof browserToolContracts)["ask_user"]["parameters"]>;
export type AskUserResult = {
  answer: string;
  optionId?: string;
  source: "option" | "other";
};
export type ConfigureAppArgs = z.infer<(typeof browserToolContracts)["configure_app"]["parameters"]>;

export const normalizeAssistantAppIconUrl = (value: string | undefined) => {
  if (!value) return "";
  return value.startsWith("/") || URL.canParse(value) ? value : "";
};
