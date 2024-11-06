import { TRPCError } from "@trpc/server";

import { decryptSecretWithKey } from "@homarr/common/server";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const onboardingRouter = createTRPCRouter({
  checkToken: publicProcedure
    .input(z.object({ checksum: z.array(z.string()).length(2), token: z.string() }))
    .mutation(({ input }) => {
      const [raw, encrypted] = input.checksum as [string, `${string}.${string}`];

      try {
        const decrypted = decryptSecretWithKey(encrypted, Buffer.from(input.token, "hex"));
        if (decrypted === raw) {
          return true;
        }

        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid token",
        });
      } catch {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid token",
        });
      }
    }),
});
