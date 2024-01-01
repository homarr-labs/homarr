import { z } from "zod";

export const zodEnumFromArray = <T extends string>(arr: T[]) =>
  z.enum([arr[0]!, ...arr.slice(1)]);
