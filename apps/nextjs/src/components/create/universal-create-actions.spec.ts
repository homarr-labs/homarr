import { describe, expect, test } from "vitest";

import type { RankedUniversalCreateAction } from "./universal-create-actions";
import { filterAndRankUniversalCreateActions, getUniversalCreateActionDefinitions } from "./universal-create-actions";

describe("getUniversalCreateActionDefinitions", () => {
  test("only exposes actions allowed without a board context", () => {
    const actions = getUniversalCreateActionDefinitions({
      hasBoardContext: false,
      permissions: ["board-create", "integration-create"],
    });

    expect(actions.map(({ key }) => key)).toEqual(["integration", "board"]);
  });

  test("places globally-created apps in the library group", () => {
    const actions = getUniversalCreateActionDefinitions({ hasBoardContext: false, permissions: ["app-create"] });

    expect(actions).toEqual([expect.objectContaining({ key: "app", group: "library" })]);
  });

  test("keeps board content actions available without global create permissions", () => {
    const actions = getUniversalCreateActionDefinitions({ hasBoardContext: true, permissions: [] });

    expect(actions.map(({ key }) => key)).toEqual(["widget", "app", "container"]);
  });

  test("exposes the complete surface to administrators on a board", () => {
    const actions = getUniversalCreateActionDefinitions({
      hasBoardContext: true,
      permissions: ["admin", "app-create", "integration-create", "board-create"],
    });

    expect(actions.map(({ key }) => key)).toEqual([
      "widget",
      "app",
      "integration",
      "container",
      "board",
      "workshop",
      "customWidget",
    ]);
  });
});

describe("filterAndRankUniversalCreateActions", () => {
  const actions = [
    { key: "widget", group: "currentBoard", priority: 100, name: "Add widget", description: "Add content" },
    {
      key: "integration",
      group: "library",
      priority: 80,
      name: "Connect service",
      description: "Create an integration",
      keywords: ["provider"],
    },
    { key: "board", group: "boards", priority: 60, name: "Create board", description: "Start a dashboard" },
  ] satisfies RankedUniversalCreateAction[];

  test("uses product priority when no search is entered", () => {
    expect(filterAndRankUniversalCreateActions(actions, "").map(({ key }) => key)).toEqual([
      "widget",
      "integration",
      "board",
    ]);
  });

  test("ranks a name prefix ahead of a description or keyword match", () => {
    const results = filterAndRankUniversalCreateActions(actions, "create");

    expect(results.map(({ key }) => key)).toEqual(["board", "integration"]);
  });

  test("matches keywords and removes unrelated actions", () => {
    expect(filterAndRankUniversalCreateActions(actions, "provider").map(({ key }) => key)).toEqual(["integration"]);
  });
});
