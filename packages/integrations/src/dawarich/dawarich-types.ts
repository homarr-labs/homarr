import { z } from "zod/v4";
import { dawarichPlacesSchema, dawarichStatisticsSchema } from "./dawarich-schemas";

export type DawarichStatistics = z.infer<typeof dawarichStatisticsSchema>;
export type DawarichPlace = z.infer<typeof dawarichPlacesSchema>[number];