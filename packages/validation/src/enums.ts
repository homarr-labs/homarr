import { z } from "zod";

type CouldBeReadonlyArray<T> = T[] | readonly T[];

export const zodEnumFromArray = <T extends string>(
  arr: CouldBeReadonlyArray<T>,
) => z.enum([arr[0]!, ...arr.slice(1)]);

export const zodUnionFromArray = <T extends z.ZodTypeAny>(
  arr: CouldBeReadonlyArray<T>,
) => z.union([arr[0]!, arr[1]!, ...arr.slice(2)]);
