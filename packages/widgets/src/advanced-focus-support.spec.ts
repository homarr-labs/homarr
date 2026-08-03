import { describe, expect, test } from "vitest";

import { supportsAdvancedFocus } from "./definition";
import { widgetImports } from ".";

const compactOnlyWidgetKinds = [
  "app",
  "bazarr",
  "beszelSystemGrid",
  "beszelSystemStats",
  "beszelSystemTable",
  "coolify",
  "dnsHoleControls",
  "dnsHoleSummary",
  "iframe",
  "indexerManager",
  "mediaRequests-requestList",
  "mediaRequests-requestStats",
  "minecraftServerStatus",
  "networkControllerSummary",
  "notebook",
  "notifications",
  "paperlessNgx",
  "patchmon",
  "releases",
  "rssFeed",
  "stockPrice",
  "systemDisks",
  "video",
  "vpn",
] as const;

describe("advanced focus support", () => {
  test("is reserved for widgets with a distinct advanced experience", () => {
    const actualCompactOnlyKinds = Object.entries(widgetImports)
      .filter(([, widgetImport]) => !supportsAdvancedFocus(widgetImport.definition))
      .map(([kind]) => kind)
      .toSorted();

    expect(actualCompactOnlyKinds).toEqual([...compactOnlyWidgetKinds].toSorted());
  });
});
