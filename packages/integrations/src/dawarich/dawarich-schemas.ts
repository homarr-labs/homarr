import {z} from "zod/v4";

export const dawarichStatisticsSchema = z.object({
    "totalDistanceKm": z.number(),
    "totalPointsTracked": z.number(),
    "totalReverseGeocodedPoints": z.number(),
    "totalCountriesVisited": z.number(),
    "totalCitiesVisited": z.number()
});

export const dawarichPlacesSchema = z.array(z.object({

    "id": z.number(),
    "name": z.string(),
    "latitude": z.number(),
    "longitude": z.number(),
    "source": z.string().optional(),
    "icon": z.string().nullable(),
    "color": z.string().nullable(),
    "visits_count": z.number(),
    "created_at": "2024-07-29T15:51:28.071Z",
    "tags": [
        {
            "id": z.number(),
            "name": z.string(),
            "icon": z.string(),
            "color": z.string()
        }
    ]
}));