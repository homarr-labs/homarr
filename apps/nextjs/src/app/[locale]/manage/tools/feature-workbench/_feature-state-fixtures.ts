export type CatalogFixtureId = "ready" | "needsSetup" | "noConnection" | "error";
export type CatalogInteractionId = "default" | "selected" | "loading" | "disabled";
export type ResponseFixtureId = "loading" | "success" | "failure";

export interface CatalogStateFixture {
  id: CatalogFixtureId;
  color: "green" | "yellow" | "gray" | "red";
}

export const catalogStateFixtures: readonly CatalogStateFixture[] = [
  { id: "ready", color: "green" },
  { id: "needsSetup", color: "yellow" },
  { id: "noConnection", color: "gray" },
  { id: "error", color: "red" },
];

export const catalogInteractionFixtures: readonly CatalogInteractionId[] = [
  "default",
  "selected",
  "loading",
  "disabled",
];

export const responseStateFixtures = [
  { id: "loading" },
  {
    id: "success",
    payload: { status: "ok", service: "fixture-service", version: "2.0" },
  },
  {
    id: "failure",
    payload: { status: 503, message: "Service unavailable" },
  },
] as const;
