import { z } from "zod";

import { FlattenError } from "@homarr/common";

import type { TestConnectionError } from "./integration";

export class IntegrationTestConnectionError extends FlattenError {
  constructor(
    public key: TestConnectionError["key"],
    public detailMessage?: string,
  ) {
    super("Checking integration connection failed", { key, message: detailMessage });
  }
}

const schema = z.object({
  key: z.custom<TestConnectionError["key"]>((value) => z.string().parse(value)),
  message: z.string().optional(),
});
export const convertIntegrationTestConnectionError = (error: unknown) => {
  const result = schema.safeParse(error);
  if (!result.success) {
    return;
  }

  return result.data;
};
