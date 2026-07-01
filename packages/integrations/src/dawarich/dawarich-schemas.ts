import { z } from "zod/v4";

export const dawarichStatisticsSchema = z.object({
  totalDistanceKm: z.number(),
  totalPointsTracked: z.number(),
  totalReverseGeocodedPoints: z.number(),
  totalCountriesVisited: z.number(),
  totalCitiesVisited: z.number(),
});

export const dawarichPlaceTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
});

export const dawarichPlaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  source: z.string().optional(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  visits_count: z.number(),
  created_at: z.string(),
  tags: z.array(dawarichPlaceTagSchema),
});

export const dawarichPlacesSchema = z.array(dawarichPlaceSchema);
