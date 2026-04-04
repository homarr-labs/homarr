import type { Station, Timetable, TimetableOptions } from "./timetable-types";

export interface TimetableIntegration {
  searchStationsAsync(query: string): Promise<Station[]>;
  getTimetableAsync(options: TimetableOptions): Promise<Timetable>;
}
