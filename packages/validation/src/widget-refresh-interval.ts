import { z } from "zod/v4";

export const widgetRefreshIntervalPresets = [1, 2, 5, 10, 30, 60] as const;

export const widgetRefreshIntervalSchema = z.number().int().min(1).max(3600);
