import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const WUD_CONTAINERS_PARSE_ERROR_MESSAGE = "Invalid WUD containers response";

export const wudContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  updateAvailable: z.boolean(),
});

export const wudContainersResponseSchema = z.array(wudContainerSchema);

export interface WudStats {
  totalContainers: number;
  updatesAvailable: number;
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

export const mapWudStats = (containers: z.infer<typeof wudContainersResponseSchema>): WudStats => ({
  totalContainers: containers.length,
  updatesAvailable: containers.filter((container) => container.updateAvailable).length,
});
