import { z } from "zod/v4";
import type { ZodIntersection, ZodObject } from "zod/v4";

export function convertIntersectionToZodObject<TIntersection extends ZodIntersection<ZodObject, ZodObject>>(
  intersection: TIntersection,
) {
  const left = intersection.def.left;
  const right = intersection.def.right;

  // Merge the shapes
  const mergedShape = { ...left.def.shape, ...right.def.shape };
  const checks = [...(left.def.checks ?? []), ...(right.def.checks ?? [])] as z.core.$ZodCheck<
    Record<string, unknown>
  >[];

  // Keep object-level checks, including matching password confirmations.
  return z.object(mergedShape).check(...checks) as unknown as TIntersection extends ZodIntersection<
    infer TLeft,
    infer TRight
  >
    ? TLeft extends ZodObject
      ? TRight extends ZodObject
        ? ZodObject<TLeft["shape"] & TRight["shape"]>
        : never
      : never
    : never;
}
