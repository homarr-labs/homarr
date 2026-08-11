import { z } from "zod/v4";

const quillDeltaOperationSchema = z.object({
  insert: z.unknown().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const quillDeltaSchema = z.object({
  ops: z.array(quillDeltaOperationSchema),
});

export type QuillDelta = z.infer<typeof quillDeltaSchema>;

const toPlainTextOperations = (value: string): QuillDelta["ops"] => [
  { insert: value.endsWith("\n") ? value : `${value}\n` },
];

export const parseStoredOperations = (content?: string | null): QuillDelta["ops"] => {
  if (!content) return [{ insert: "\n" }];

  try {
    const parsedDelta = quillDeltaSchema.safeParse(JSON.parse(content));
    if (parsedDelta.success) return parsedDelta.data.ops;
  } catch {
    return toPlainTextOperations(content);
  }

  return toPlainTextOperations(content);
};

export const stringifyDelta = (delta: unknown): string => {
  const parsedDelta = quillDeltaSchema.safeParse(delta);
  return JSON.stringify(parsedDelta.success ? parsedDelta.data : { ops: [{ insert: "\n" }] });
};

export const storedContentToPlainText = (content?: string | null): string =>
  parseStoredOperations(content)
    .map(({ insert }) => (typeof insert === "string" ? insert : ""))
    .join("")
    .trim();
