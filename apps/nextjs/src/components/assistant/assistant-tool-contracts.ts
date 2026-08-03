import { z } from "zod/v4";

import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";

export const assistantAskUserOptionKinds = ["affirmative", "negative", "alternative"] as const;
export type AssistantAskUserOptionKind = (typeof assistantAskUserOptionKinds)[number];

const askUserOptionSchema = z.object({
  id: z.string().trim().min(1).max(48),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).optional(),
  kind: z
    .enum(assistantAskUserOptionKinds)
    .describe(
      "Classify agreement, approval, or proceeding as affirmative; refusal or stopping as negative; and unrelated selections as alternative.",
    ),
});

const boardImageValueSchema = z.string().trim().max(2_048).nullable();
const boardTitleValueSchema = z.string().trim().max(255).nullable();
const boardColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const assistantBoardSettingsChangesSchema = z
  .object({
    pageTitle: boardTitleValueSchema.optional(),
    metaTitle: boardTitleValueSchema.optional(),
    logoImageUrl: boardImageValueSchema.optional(),
    faviconImageUrl: boardImageValueSchema.optional(),
    backgroundImageUrl: boardImageValueSchema.optional(),
    backgroundImageAttachment: z.enum(backgroundImageAttachments.values).optional(),
    backgroundImageRepeat: z.enum(backgroundImageRepeats.values).optional(),
    backgroundImageSize: z.enum(backgroundImageSizes.values).optional(),
    primaryColor: boardColorSchema.optional(),
    secondaryColor: boardColorSchema.optional(),
    opacity: z.number().min(0).max(100).optional(),
    customCss: z
      .string()
      .max(16_384)
      .optional()
      .describe(
        "The complete resulting board stylesheet. Preserve existing rules from board_getBoardSettings unless the user explicitly asks to replace them.",
      ),
    iconColor: boardColorSchema.nullable().optional(),
    itemRadius: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
    disableStatus: z.boolean().optional(),
  })
  .describe("Only the board fields the user asked to change.");

export const browserToolContracts = {
  ask_user: {
    description:
      "Pause and ask the user one concise structured question. Use this for missing information or a meaningful choice, never as a second confirmation before a mutating tool. Provide 2-4 distinct options and classify every option: agreement, approval, or proceeding is affirmative; refusal or stopping is negative; unrelated selections are alternative. A confirmation question must have exactly one affirmative option. The UI adds a freeform Other choice when allowOther is not false.",
    parameters: z.object({
      question: z.string().trim().min(1).max(240),
      description: z.string().trim().max(400).optional(),
      options: z.array(askUserOptionSchema).min(2).max(4),
      allowOther: z.boolean().optional(),
    }),
  },
  configure_app: {
    description:
      "Open Homarr's native app form with the best available app details already filled in. Its icon picker searches the local Homarr icon repository. Include the inferred description, href, and pingUrl when they are known. Use this before app.create instead of inventing an external icon URL.",
    parameters: z.object({
      name: z.string().trim().min(1).max(64),
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
  configure_board_settings: {
    description:
      "Open Homarr's native board settings and custom CSS review form. Always call board_getBoardSettings first, then pass only the requested proposed changes here. The user can edit the complete stylesheet and all supported settings. Use the returned flat object directly with board_savePartialBoardSettings; do not ask for confirmation in prose.",
    parameters: z.object({
      boardId: z.string().trim().min(1).max(64),
      boardName: z.string().trim().min(1).max(255),
      summary: z.string().trim().min(1).max(400),
      changes: assistantBoardSettingsChangesSchema,
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
  optionKind?: AssistantAskUserOptionKind;
  source: "option" | "other";
};
export type ConfigureAppArgs = z.infer<(typeof browserToolContracts)["configure_app"]["parameters"]>;
export type ConfigureBoardSettingsArgs = z.infer<
  (typeof browserToolContracts)["configure_board_settings"]["parameters"]
>;
export type AssistantBoardSettingsChanges = z.infer<typeof assistantBoardSettingsChangesSchema>;
export type ConfigureBoardSettingsResult =
  | (AssistantBoardSettingsChanges & { id: string })
  | { id: string; cancelled: true };

export const normalizeAssistantAppIconUrl = (value: string | undefined) => {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (!URL.canParse(value)) return "";
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:" ? value : "";
};
