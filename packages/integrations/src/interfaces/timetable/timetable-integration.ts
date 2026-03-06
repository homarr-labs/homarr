import type { Stadion, Timetable, TimetableOptions } from "./timetable-types";

export interface TimetableIntegration {
  searchStationsAsync(query: string): Promise<Stadion[]>;
  getTimetableAsync(options: TimetableOptions): Promise<Timetable>;
}
