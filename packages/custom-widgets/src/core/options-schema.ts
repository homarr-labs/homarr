import { z } from "zod/v4";

import { customWidgetIdentifierSchema } from "./request-schema";

export const customWidgetOptionControls = [
  "text",
  "textarea",
  "number",
  "switch",
  "select",
  "multiSelect",
  "slider",
  "date",
  "time",
  "color",
  "icon",
  "url",
  "duration",
  "timeZone",
  "json",
] as const;

const choiceSchema = z.strictObject({
  label: z.string().trim().min(1).max(128),
  value: z.union([z.string(), z.number().finite()]),
});

const choicesFromSchema = z.strictObject({
  request: customWidgetIdentifierSchema,
  itemsPath: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  valuePath: z.string().trim().min(1),
  labelPath: z.string().trim().min(1),
});

export const customWidgetOptionSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(128),
    description: z.string().max(512).optional(),
    control: z.enum(customWidgetOptionControls),
    default: z.json(),
    choices: z.array(choiceSchema).min(1).max(100).optional(),
    choicesFrom: choicesFromSchema.optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().finite().positive().optional(),
    advanced: z.boolean().optional(),
    group: z.string().trim().min(1).max(128).optional(),
  })
  .superRefine((option, ctx) => {
    const issue = getCustomWidgetOptionValueIssue(option, option.default);
    if (issue) ctx.addIssue({ code: "custom", path: ["default"], message: issue });
    if (option.min !== undefined && option.max !== undefined && option.min > option.max) {
      ctx.addIssue({ code: "custom", path: ["min"], message: "Minimum cannot be greater than maximum" });
    }
    if ((option.choices || option.choicesFrom) && !["select", "multiSelect"].includes(option.control)) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "Choices require a select or multiSelect control" });
    }
    if (option.choices && option.choicesFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["choicesFrom"],
        message: "Use static choices or dynamic choices, not both",
      });
    }
    if (
      option.choices &&
      new Set(option.choices.map((choice) => String(choice.value))).size !== option.choices.length
    ) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "Choice values must be unique" });
    }
  });

export const customWidgetOptionsSchema = z
  .record(customWidgetIdentifierSchema, customWidgetOptionSchema)
  .refine((options) => Object.keys(options).length <= 64, "A widget can define at most 64 options")
  .default({});

export type CustomWidgetOption = z.infer<typeof customWidgetOptionSchema>;
export type CustomWidgetOptions = z.infer<typeof customWidgetOptionsSchema>;

export function getCustomWidgetOptionValueIssue(
  option: Pick<CustomWidgetOption, "control" | "min" | "max" | "choices">,
  value: unknown,
): string | null {
  if (["number", "slider", "duration"].includes(option.control)) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Expected a number";
    if (option.min !== undefined && value < option.min) return `Must be at least ${option.min}`;
    if (option.max !== undefined && value > option.max) return `Must be at most ${option.max}`;
  } else if (option.control === "switch") {
    if (typeof value !== "boolean") return "Expected a boolean";
  } else if (option.control === "multiSelect") {
    if (!Array.isArray(value) || value.some((entry) => !["string", "number"].includes(typeof entry)))
      return "Expected a list of choices";
  } else if (option.control !== "json" && typeof value !== "string") return "Expected text";

  if (option.control === "url" && typeof value === "string" && value && !URL.canParse(value))
    return "Must be a valid URL";
  if (option.choices && (option.control === "select" || option.control === "multiSelect")) {
    const allowed = option.choices.map((choice) => choice.value);
    const values = Array.isArray(value) ? value : [value];
    if (values.some((entry) => !allowed.some((choice) => Object.is(choice, entry))))
      return "Value is not one of the allowed choices";
  }
  return null;
}
