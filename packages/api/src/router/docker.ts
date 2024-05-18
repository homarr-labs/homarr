import { createTRPCRouter, publicProcedure } from "../trpc";

export const dockerRouter = createTRPCRouter({
  getContainers: publicProcedure.query(async ({ ctx }) => {
    return { containers: [] };
  }),
});
