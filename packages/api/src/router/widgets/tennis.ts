import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { fetchTennisMatchesHandler, TennisApiKeyError } from "@homarr/request-handler/tennis";

import { tennisStatuses, tennisTours } from "../../../../widgets/src/tennis";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const tennisInputSchema = z.object({
  tour: z.enum(tennisTours),
  status: z.enum(tennisStatuses),
  matchCount: z.number().int().min(1).max(20),
  showTournament: z.boolean(),
  showRanking: z.boolean(),
});

export const tennisRouter = createTRPCRouter({
  getMatches: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get tennis matches from the Live Tennis API. Returns live scores, upcoming fixtures or completed results for ATP, WTA, Challenger, ITF and Grand Slam juniors. REQUIRED: tour (all|atp|wta|challenger|itf|juniors), status (live|upcoming|completed), matchCount (1-20), showTournament, showRanking. Requires the LIVE_TENNIS_API_KEY environment variable to be set on the Homarr server.",
      },
    })
    .input(tennisInputSchema)
    .query(async ({ input }) => {
      const innerHandler = fetchTennisMatchesHandler.handler({
        tour: input.tour,
        status: input.status,
        matchCount: input.matchCount,
      });

      try {
        return await innerHandler.getDataAsync();
      } catch (error) {
        if (error instanceof TennisApiKeyError) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: error.message });
        }
        throw error;
      }
    }),
});
