import { describe, expect, test } from "vitest";

import { supportsAdvancedFocus } from "./definition";
import { widgetImports } from ".";

const advancedFocusWidgetKinds = [
  "anchorNote",
  "archiveTeamWarrior",
  "audioStats",
  "bazarr",
  "beszelAlerts",
  "beszelSystemGrid",
  "beszelSystemTable",
  "bookmarks",
  "calendar",
  "clock",
  "coolify",
  "downloads",
  "firewall",
  "healthMonitoring",
  "immich-albumCarousel",
  "immich-serverStats",
  "indexerManager",
  "mediaMissing",
  "mediaReleases",
  "mediaServer",
  "mediaTranscoding",
  "networkControllerStatus",
  "networkControllerSummary",
  "notebook",
  "notifications",
  "patchmon",
  "releases",
  "rssFeed",
  "smartHome-entityState",
  "smartHome-executeAutomation",
  "speedtestTracker",
  "stockPrice",
  "systemDisks",
  "systemResources",
  "timetable",
  "tracearr",
  "traefik",
  "umami",
  "ups",
  "uptimeKuma",
  "weather",
  "wud",
] as const;

describe("advanced focus support", () => {
  test("is reserved for widgets with a distinct advanced experience", () => {
    const actualAdvancedFocusKinds = Object.entries(widgetImports)
      .filter(([, widgetImport]) => supportsAdvancedFocus(widgetImport.definition))
      .map(([kind]) => kind)
      .toSorted();

    expect(actualAdvancedFocusKinds).toEqual([...advancedFocusWidgetKinds].toSorted());
  });
});
