import { z } from "zod";

type CouldBeReadonlyArray<T> = T[] | readonly T[];

export const zodEnumFromArray = <T extends string>(
  array: CouldBeReadonlyArray<T>,
) => z.enum([array[0]!, ...array.slice(1)]);

export const zodUnionFromArray = <T extends z.ZodTypeAny>(
  array: CouldBeReadonlyArray<T>,
) => z.union([array[0]!, array[1]!, ...array.slice(2)]);
