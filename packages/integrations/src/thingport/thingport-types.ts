import { z } from "zod/v4";

export const thingportSummarySchema = z.object({
  model_count: z.number(),
  collection_count: z.number(),
  category_count: z.number(),
  author_count: z.number(),
});

export const thingportModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumb_url: z.string().nullable(),
  view_count: z.number(),
  print_count: z.number(),
  created_at: z.string(),
});

export const thingportFeaturedSchema = z.object({
  print: z
    .object({
      id: z.string(),
      name: z.string(),
      thumb_url: z.string().nullish(),
      view_count: z.number(),
      print_count: z.number(),
      category_name: z.string().nullish(),
      author: z.object({ name: z.string().nullable(), handle: z.string().nullable() }).nullish(),
      plates: z
        .object({
          id: z.string(),
          filename: z.string(),
          url: z.string(),
          thumb_url: z.string().nullish(),
          preview_glb_url: z.string().nullish(),
        })
        .array(),
    })
    .nullable(),
});

export const thingportSearchSchema = z.object({
  models: z
    .object({
      id: z.string(),
      name: z.string(),
      thumb_url: z.string().nullish(),
      category_name: z.string().nullish(),
      author: z.object({ name: z.string().nullable(), handle: z.string().nullable() }).nullish(),
    })
    .array(),
  collections: z.object({ id: z.string(), name: z.string() }).array(),
  tags: z.object({ tag: z.string(), count: z.number() }).array(),
});

export const thingportActivityKinds = ["import", "upload", "download", "slicer", "delete"] as const;
export type ThingportActivityKind = (typeof thingportActivityKinds)[number];

export const thingportActivitySchema = z.object({
  days: z
    .object({
      date: z.string(),
      // Plain string keys, so a kind added to Thingport later is dropped instead of failing the parse.
      counts: z.record(z.string(), z.number()),
    })
    .array(),
  total: z.number(),
  years: z.number().array(),
});

export const thingportModelLists = ["recentlyAdded", "topViewed", "topPrinted"] as const;
export type ThingportModelList = (typeof thingportModelLists)[number];

export interface ThingportLibraryStats {
  modelCount: number;
  collectionCount: number;
  categoryCount: number;
  authorCount: number;
  links: {
    models: string;
    collections: string;
    categories: string;
    authors: string;
  };
}

export interface ThingportModel {
  id: string;
  name: string;
  href: string;
  thumbnailUrl: string | null;
  viewCount: number;
  printCount: number;
  createdAt: string;
}

export type ThingportMeshFormat = "glb" | "stl";

export interface ThingportFeaturedModel {
  id: string;
  name: string;
  href: string;
  thumbnailUrl: string | null;
  author: string | null;
  category: string | null;
  viewCount: number;
  printCount: number;
  /** A mesh the browser can draw: the server's pre-rendered GLB, or the plate itself when it is an STL. */
  mesh: { url: string; format: ThingportMeshFormat } | null;
}

export interface ThingportSearchResult {
  name: string;
  link: string;
  image?: string;
  text?: string;
}

export interface ThingportActivityDay {
  date: string;
  counts: Partial<Record<ThingportActivityKind, number>>;
}

export interface ThingportActivity {
  /** Only days with activity. */
  days: ThingportActivityDay[];
  total: number;
  /** From the year the user registered to this one, newest first. */
  years: number[];
  profileUrl: string;
}
