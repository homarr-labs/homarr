import type { z } from "zod";

import type { MaybePromise } from "@homarr/common/types";

export const createQueue = <TInput extends z.ZodType>(input: TInput) => {
  return {
    withCallback: (callback: (data: z.infer<TInput>) => MaybePromise<void>) => {
      return {
        _input: input,
        _callback: callback,
      };
    },
  };
};
