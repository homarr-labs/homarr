export type CatalogFixtureId = "ready" | "needsSetup" | "noConnection" | "error";
export type CatalogInteractionId = "default" | "selected" | "loading" | "disabled";
export type ResponseFixtureId = "loading" | "success" | "failure";

export interface CatalogStateFixture {
  id: CatalogFixtureId;
  label: string;
  status: string;
  description: string;
  color: "green" | "yellow" | "gray" | "red";
}

export const catalogStateFixtures: readonly CatalogStateFixture[] = [
  {
    id: "ready",
    label: "Ready service",
    status: "Ready",
    description: "Configured and available to three widgets.",
    color: "green",
  },
  {
    id: "needsSetup",
    label: "Service needing setup",
    status: "Needs setup",
    description: "Credentials or a service URL are still required.",
    color: "yellow",
  },
  {
    id: "noConnection",
    label: "Standalone feature",
    status: "No connection required",
    description: "This feature works without a configured integration.",
    color: "gray",
  },
  {
    id: "error",
    label: "Unreachable service",
    status: "Connection failed",
    description: "The saved connection could not be reached.",
    color: "red",
  },
];

export const catalogInteractionFixtures: readonly { id: CatalogInteractionId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "selected", label: "Selected" },
  { id: "loading", label: "Loading" },
  { id: "disabled", label: "Disabled" },
];

export const responseStateFixtures = [
  {
    id: "loading",
    label: "Loading",
    title: "Checking response",
    description: "The parser is waiting for the integration response.",
  },
  {
    id: "success",
    label: "Success",
    title: "Response accepted",
    description: "The upstream payload matched the integration contract.",
    payload: { status: "ok", service: "fixture-service", version: "2.0" },
  },
  {
    id: "failure",
    label: "Failure",
    title: "Response rejected",
    description: "The upstream payload failed schema validation and stays isolated from the widget.",
    payload: { status: 503, message: "Service unavailable" },
  },
] as const;
