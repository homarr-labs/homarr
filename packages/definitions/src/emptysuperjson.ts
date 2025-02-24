import superjson from "superjson";

export const emptySuperJSON = superjson.stringify({});
export type EmptySuperJSON = typeof emptySuperJSON;
