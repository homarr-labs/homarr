import { describe, expect, test } from "vitest";

import { supportsAdvancedFocus } from "./definition";
import { widgetImports } from ".";

const advancedFocusWidgetKinds = [
  "anchorNote",
  "archiveTeamWarrior",
  "audioStats",
  "bazarr",
  "bookmarks",
  "calendar",
  "coolify",
  "downloads",
  "firewall",
  "healthMonitoring",
  "immich-albumCarousel",
  "immich-serverStats",
  "mediaMissing",
  "mediaReleases",
  "mediaServer",
  "mediaTranscoding",
  "networkControllerStatus",
  "networkControllerSummary",
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
