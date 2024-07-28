export interface MediaRequestStats {
  values: NumericMediaRequestStat[];
}

interface NumericMediaRequestStat {
  name: "approved" | "pending" | "declined" | "shows" | "movies" | "total";
  value: number;
}
