import { describe, expect, it } from "vitest";

import { integrationKinds } from "@homarr/definitions";

import { integrationLoaderKinds } from "./creator";

describe("integration creator", () => {
  it("should have a loader for every IntegrationKind", () => {
    expect(new Set(integrationLoaderKinds)).toEqual(new Set(integrationKinds));
  });
});
