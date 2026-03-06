import z from "zod";

export interface Stadion {
  id: string;
  name: string;
}

export const timetableOptionsSchema = z.object({
  stationId: z.string(),
  limit: z.number().default(10),
});

export type TimetableOptions = z.infer<typeof timetableOptionsSchema>;

export interface TimetableEntry {
  timestamp: Date;
  delay: number;
  line: {
    name: string;
    color: string | null;
  } | null;
  location: string;
  platform: {
    name: string;
    hasChanged: boolean;
  } | null;
}

export interface Timetable {
  stationId: string;
  timestamp: Date;
  entries: TimetableEntry[];
}
