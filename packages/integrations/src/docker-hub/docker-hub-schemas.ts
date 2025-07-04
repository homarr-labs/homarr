import { z } from "zod";

export const accessTokenResponseSchema = z.object({
  access_token: z.string(),
});
