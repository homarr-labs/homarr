import { z } from "zod/v4";

export const appHrefSchema = z
  .string()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export interface LinkedDockerContainer {
  endpointId: string;
  name: string;
}

// Docker names survive container recreation and cannot contain "@"; endpoint IDs may contain it.
export const formatLinkedDockerContainer = ({ endpointId, name }: LinkedDockerContainer) => `${name}@${endpointId}`;

export const parseLinkedDockerContainer = (value: string): LinkedDockerContainer | null => {
  const separatorIndex = value.indexOf("@");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;
  return { name: value.slice(0, separatorIndex), endpointId: value.slice(separatorIndex + 1) };
};

export const linkedDockerContainerSchema = z
  .string()
  .max(1280)
  .refine((value) => {
    const target = parseLinkedDockerContainer(value);
    return target !== null && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(target.name) && target.endpointId.length <= 1024;
  }, "Invalid Docker container link");

export const appManageSchema = z.object({
  name: z.string().trim().min(1).max(64),
  dockerContainer: linkedDockerContainerSchema.nullable().optional(),
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

export const getAppWithVisibleDockerLink = <TApp extends { dockerContainer?: string | null }>(
  app: TApp,
  canReadDockerLink: boolean,
): TApp => {
  if (canReadDockerLink || !app.dockerContainer) return app;
  return { ...app, dockerContainer: null };
};
