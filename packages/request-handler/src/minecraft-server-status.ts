import dayjs from "dayjs";
import { z } from "zod/v4";

import { fetchWithTimeout } from "@homarr/common";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const minecraftServerStatusRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "minecraftServerStatusApiResult",
  widgetKind: "minecraftServerStatus",
  async requestAsync(input: { domain: string; isBedrockServer: boolean }) {
    const path = `${input.isBedrockServer ? "/bedrock" : ""}/3/${input.domain}`;

    const response = await fetchWithTimeout(`https://api.mcsrvstat.us${path}`);
    return responseSchema.parse(await response.json());
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

const responseSchema = z
  .object({
    online: z.literal(false),
  })
  .or(
    z.object({
      online: z.literal(true),
      players: z.object({
        online: z.number(),
        max: z.number(),
      }),
      icon: z.string().optional(),
    }),
  );

export type MinecraftServerStatus = z.infer<typeof responseSchema>;
