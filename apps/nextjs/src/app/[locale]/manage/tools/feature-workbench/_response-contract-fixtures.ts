import { z } from "zod/v4";

import { simulateResponseContractAsync } from "@homarr/integrations/response-contract";

import { responseStateFixtures } from "./_feature-state-fixtures";

const fixtureResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
});

export const parseWorkbenchResponseAsync = async (response: { json: () => Promise<unknown> }) =>
  fixtureResponseSchema.parse(await response.json());

export const getResponseContractFixtureResultsAsync = () =>
  simulateResponseContractAsync(parseWorkbenchResponseAsync, [
    {
      name: "success",
      payload: responseStateFixtures.find((fixture) => fixture.id === "success")?.payload,
      expected: { status: "ok", service: "fixture-service", version: "2.0" },
    },
    {
      name: "failure",
      payload: responseStateFixtures.find((fixture) => fixture.id === "failure")?.payload,
      rejects: true,
    },
  ]);

export type ResponseContractFixtureResult = Awaited<ReturnType<typeof getResponseContractFixtureResultsAsync>>[number];
