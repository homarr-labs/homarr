import { z } from "zod";
import type { AnyZodObject, ZodIntersection, ZodObject } from "zod";

export function convertIntersectionToZodObject<TIntersection extends ZodIntersection<AnyZodObject, AnyZodObject>>(
  intersection: TIntersection,
) {
  const { _def } = intersection;

  // Merge the shapes
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mergedShape = { ..._def.left.shape, ..._def.right.shape };

  // Return a new ZodObject
  return z.object(mergedShape) as unknown as TIntersection extends ZodIntersection<infer TLeft, infer TRight>
    ? TLeft extends AnyZodObject
      ? TRight extends AnyZodObject
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ZodObject<TLeft["shape"] & TRight["shape"], any, any, z.infer<TLeft> & z.infer<TRight>>
        : never
      : never
    : never;
}
