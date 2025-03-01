import SuperJSON from "superjson";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { initialOldmarrImportSettings } from "../settings";

const boardSelectionMapSchema = z.map(z.string(), z.boolean());

export const importInitialOldmarrInputSchema = zfd.formData({
  file: zfd.file(),
  settings: zfd.json(initialOldmarrImportSettings),
  boardSelections: zfd.text().transform((value) => {
    const map = boardSelectionMapSchema.parse(SuperJSON.parse(value));
    return map;
  }),
  token: zfd.text().nullable().optional(),
});
