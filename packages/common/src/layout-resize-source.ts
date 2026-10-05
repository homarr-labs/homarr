import { z } from "zod/v4";

import type { GridAlgorithmItem } from "./grid-algorithm";

const geometrySchema = z.object({
  columnCount: z.number().int().positive(),
  leftGutterColumnCount: z.number().int().nonnegative(),
  rightGutterColumnCount: z.number().int().nonnegative(),
});
const elementSchema = z.object({
  id: z.string(),
  type: z.enum(["item", "section"]),
  sectionId: z.string(),
  xOffset: z.number().int().nonnegative(),
  yOffset: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const resizeSourceSchema = z.object({
  geometry: geometrySchema,
  elements: z.array(elementSchema),
  projectedGeometry: geometrySchema,
  projectedElements: z.array(elementSchema),
});

type LayoutGeometry = z.infer<typeof geometrySchema>;
export interface LayoutResizeSource {
  geometry: LayoutGeometry;
  elements: GridAlgorithmItem[];
}

const geometryKey = (geometry: LayoutGeometry) =>
  JSON.stringify([geometry.columnCount, geometry.leftGutterColumnCount, geometry.rightGutterColumnCount]);
const elementsKey = (elements: readonly GridAlgorithmItem[]) =>
  JSON.stringify(
    elements
      .map((element) => [
        element.id,
        element.type,
        element.sectionId,
        element.xOffset,
        element.yOffset,
        element.width,
        element.height,
      ])
      .toSorted((first, second) => String(first[0]).localeCompare(String(second[0]))),
  );

/** Keep the pre-resize arrangement only while the projected placements remain untouched. */
export const getLayoutResizeSource = (
  geometry: LayoutGeometry,
  elements: GridAlgorithmItem[],
  serializedSource?: string | null,
): LayoutResizeSource => {
  if (serializedSource) {
    try {
      const parsed = resizeSourceSchema.safeParse(JSON.parse(serializedSource));
      if (
        parsed.success &&
        geometryKey(parsed.data.projectedGeometry) === geometryKey(geometry) &&
        elementsKey(parsed.data.projectedElements) === elementsKey(elements)
      ) {
        return { geometry: parsed.data.geometry, elements: parsed.data.elements };
      }
    } catch {
      // Malformed or obsolete history must never prevent resizing the current layout.
    }
  }
  return { geometry, elements };
};

export const serializeLayoutResizeSource = (
  source: LayoutResizeSource,
  projectedGeometry: LayoutGeometry,
  projectedElements: GridAlgorithmItem[],
): string | null => {
  if (geometryKey(source.geometry) === geometryKey(projectedGeometry)) return null;
  return JSON.stringify({ ...source, projectedGeometry, projectedElements });
};
