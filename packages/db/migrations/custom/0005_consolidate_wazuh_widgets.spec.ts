/** @vitest-environment node */

import { parse, stringify } from "superjson";
import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { eq } from "@homarr/db";
import { createDb } from "@homarr/db/test";

import { boards, items, users } from "../../schema";
import { convertLegacyWazuhOptions, migrateWazuhWidgetsAsync } from "./0005_consolidate_wazuh_widgets";

describe("convertLegacyWazuhOptions", () => {
  test("renames top list options and pins the view", () => {
    expect(convertLegacyWazuhOptions("wazuhTopList", { kind: "sourceIps", limit: 12, range: "7d" })).toEqual({
      topKind: "sourceIps",
      topLimit: 12,
      range: "7d",
      view: "top",
      visibleViews: ["top"],
    });
  });

  test("maps the auth failure hours to the closest range", () => {
    expect(convertLegacyWazuhOptions("wazuhAuthFailures", { hours: 48, limit: 4 })).toEqual({
      authLimit: 4,
      range: "7d",
      view: "authFailures",
      visibleViews: ["authFailures"],
    });
  });

  test("maps the alerts feed options and window", () => {
    expect(convertLegacyWazuhOptions("wazuhAlerts", { minLevel: 12, limit: 40, hours: 24, showRuleId: true })).toEqual({
      alertsMinLevel: 12,
      alertsLimit: 40,
      showRuleId: true,
      range: "24h",
      view: "alerts",
      visibleViews: ["alerts"],
    });
  });

  test("ignores other widgets", () => {
    expect(convertLegacyWazuhOptions("clock", {})).toBeNull();
  });
});

describe("migrateWazuhWidgetsAsync", () => {
  test("converts legacy widgets and pins the alerts feed to the alerts tab", async () => {
    const db = createDb();
    const userId = createId();
    const boardId = createId();
    const agentsId = createId();
    const alertsId = createId();
    await db.insert(users).values({ id: userId });
    await db.insert(boards).values({ id: boardId, name: "wazuh", creatorId: userId });
    await db.insert(items).values([
      { id: agentsId, boardId, kind: "wazuhAgents" as WidgetKind, options: stringify({ sortBy: "name" }) },
      { id: alertsId, boardId, kind: "wazuhAlerts" as WidgetKind, options: stringify({ minLevel: 10 }) },
    ]);

    await migrateWazuhWidgetsAsync(db);

    const agents = await db.query.items.findFirst({ where: eq(items.id, agentsId) });
    const alerts = await db.query.items.findFirst({ where: eq(items.id, alertsId) });
    expect(agents?.kind).toBe("wazuh");
    expect(parse(agents?.options ?? "")).toEqual({ agentSortBy: "name", view: "agents", visibleViews: ["agents"] });
    expect(alerts?.kind).toBe("wazuh");
    expect(parse(alerts?.options ?? "")).toEqual({ alertsMinLevel: 10, view: "alerts", visibleViews: ["alerts"] });
  });
});
