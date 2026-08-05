import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const WUD_CONTAINERS_PARSE_ERROR_MESSAGE = "Invalid WUD containers response";

export const wudContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable().optional(),
  updateAvailable: z.boolean(),
  link: z.string().nullable().optional(),
  image: z
    .object({
      tag: z
        .object({
          value: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
  updateKind: z
    .object({
      remoteValue: z.string().nullable().optional(),
    })
    .optional(),
  result: z
    .object({
      tag: z.string().nullable().optional(),
    })
    .optional(),
});

export const wudContainersResponseSchema = z.array(wudContainerSchema);

export interface WudContainerUpdate {
  id: string;
  name: string;
  currentVersion: string | null;
  newVersion: string | null;
  link: string | null;
}

export interface WudStats {
  totalContainers: number;
  updatesAvailable: number;
  updates: WudContainerUpdate[];
}

export const parseWudContainersResponseAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<z.infer<typeof wudContainersResponseSchema>> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError(WUD_CONTAINERS_PARSE_ERROR_MESSAGE, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  const parseResult = await wudContainersResponseSchema.safeParseAsync(json);
  if (!parseResult.success) {
    throw new ParseError(WUD_CONTAINERS_PARSE_ERROR_MESSAGE, { cause: parseResult.error });
  }

  return parseResult.data;
};

const mapContainerUpdate = (container: z.infer<typeof wudContainerSchema>): WudContainerUpdate => ({
  id: container.id,
  name: container.displayName ?? container.name,
  currentVersion: container.image?.tag?.value ?? null,
  newVersion: container.updateKind?.remoteValue ?? container.result?.tag ?? null,
  link: container.link ?? null,
});

export const mapWudStats = (containers: z.infer<typeof wudContainersResponseSchema>): WudStats => ({
  totalContainers: containers.length,
  updatesAvailable: containers.filter((container) => container.updateAvailable).length,
  updates: containers.filter((container) => container.updateAvailable).map(mapContainerUpdate),
});
