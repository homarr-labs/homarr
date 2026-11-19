import { z } from "zod/v4";

export const appHrefSchema = z
  .string()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const appManageSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z
    .string()
    .trim()
    .max(512)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  iconUrl: z.string().trim().min(1),
  href: appHrefSchema,
  pingUrl: z
    .string()
    .trim()
    .url()
    .regex(/^https?:\/\//) // Only allow http and https for security reasons (javascript: is not allowed)
    .or(z.literal(""))
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

export const appCreateManySchema = z
  .array(appManageSchema.omit({ iconUrl: true }).and(z.object({ iconUrl: z.string().min(1).nullable() })))
  .min(1);

export const appEditSchema = appManageSchema.and(z.object({ id: z.string() }));

export const normalizeAppWidgetOptions = (options: Record<string, unknown>): Record<string, unknown> => {
  if (options.openIn !== undefined) return options;
  if (options.openInNewTab === undefined && options.openInNewWindow === undefined) return options;

  const { openInNewTab, openInNewWindow, ...remainingOptions } = options;
  let openIn = "newTab";
  if (openInNewWindow === true) openIn = "newWindow";
  else if (openInNewTab === false) openIn = "currentTab";

  return { ...remainingOptions, openIn };
};
