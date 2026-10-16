import { z } from "zod/v4";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  widgetKinds,
} from "@homarr/definitions";

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
      "Pause and ask the user one concise structured question. Use this only for missing information or a meaningful choice, never to confirm details that are already sufficient for a native review form or mutating tool. In particular, do not use ask_user before configure_app, configure_board_settings, or configure_widget when their inputs are known. Provide 2-4 distinct options and classify every option: agreement, approval, or proceeding is affirmative; refusal or stopping is negative; unrelated selections are alternative. A confirmation question must have exactly one affirmative option. The UI adds a freeform Other choice when allowOther is not false.",
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
      "Open Homarr's native board settings and custom CSS review form. This form is the user's confirmation step. Always call board_getBoardSettings first, then call this tool directly with only the requested proposed changes, including the complete resulting stylesheet in changes.customCss for a CSS request. Do not call ask_user between those tools when the requested changes are known. The user can edit the complete stylesheet and all supported settings. Use the returned flat object directly with board_savePartialBoardSettings.",
    parameters: z.object({
      boardId: z.string().trim().min(1).max(64),
      boardName: z.string().trim().min(1).max(255),
      summary: z.string().trim().min(1).max(400),
      changes: assistantBoardSettingsChangesSchema,
    }),
  },
  configure_widget: {
    description:
      "Open Homarr's native widget editor with inferred options and integrations preselected. Use this before board_addItem for every dashboard widget, including app and notebook widgets. The editor applies widget defaults, validates supported options, and only offers compatible integrations the user can access. Use the returned boardId, kind, options, and integrationIds directly with board_addItem.",
    parameters: z.object({
      boardId: z.string().trim().min(1).max(64),
      boardName: z.string().trim().min(1).max(255),
      kind: z.enum(widgetKinds),
      summary: z.string().trim().min(1).max(400),
      options: z.record(z.string(), z.unknown()).optional(),
      integrationIds: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
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
  refresh_current_view: {
    description:
      "Refetch the active Homarr page and its visible dashboard data. Use when the user asks to reload, or when the current view still needs to reflect an already completed change. Never use this before a mutation is approved and completed.",
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
export type ConfigureWidgetArgs = z.infer<(typeof browserToolContracts)["configure_widget"]["parameters"]>;
export type ConfigureWidgetResult =
  | {
      boardId: string;
      kind: ConfigureWidgetArgs["kind"];
      options: Record<string, unknown>;
      integrationIds: string[];
    }
  | {
      boardId: string;
      kind: ConfigureWidgetArgs["kind"];
      cancelled: true;
      reason?: "no-compatible-integration" | "user-cancelled";
    };

export const normalizeAssistantAppIconUrl = (value: string | undefined) => {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (!URL.canParse(value)) return "";
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:" ? value : "";
};
