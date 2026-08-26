import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { createWidgetRequestHandler } from "./lib/widget-request-handler";

export const minecraftServerStatusRequestHandler = createWidgetRequestHandler({
  // Domains are supplied through a public procedure and form an unbounded key space.
  requestTimeoutMs: 10_000,
  async requestAsync(input: { domain: string; isBedrockServer: boolean }, signal) {
    const path = `${input.isBedrockServer ? "/bedrock" : ""}/3/${input.domain}`;

    const response = await fetchWithTrustedCertificatesAsync(`https://api.mcsrvstat.us${path}`, { signal });
    return responseSchema.parse(await response.json());
  },
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
