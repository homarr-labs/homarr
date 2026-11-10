import type { RouterOutputs } from "@homarr/api";

import { createHealthSystemFixtures } from "./fixtures";

type Board = RouterOutputs["board"]["getBoardByName"];
type Placement = { xOffset: number; yOffset: number; width: number; height: number };

/** A native board fixture, derived without writing boards or integrations to the database. */
export function createHealthDashboardFixture(baseline: Board): Board {
  const boardId = "health-monitoring-preview";
  const sectionId = boardId + "-main";
  const baseLayoutId = boardId + "-base";
  const mobileLayoutId = boardId + "-mobile";
  const systems = createHealthSystemFixtures().filter((system) => system.kind !== "mock");

  function item(
    id: string,
    integrationIds: string[],
    base: Placement,
    mobile: Placement,
    options: Record<string, unknown> = {},
  ): Board["items"][number] {
    return {
      id,
      kind: "healthMonitoring",
      integrationIds,
      options,
      advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
      layouts: [
        { ...base, layoutId: baseLayoutId, sectionId },
        { ...mobile, layoutId: mobileLayoutId, sectionId },
      ],
    };
  }

  return {
    ...baseline,
    id: boardId,
    name: boardId,
    pageTitle: "Infrastructure",
    isPublic: true,
    creatorId: null,
    creator: null,
    userPermissions: [],
    groupPermissions: [],
    primaryColor: "#6f9aff",
    secondaryColor: "#3bc9db",
    itemRadius: "md",
    opacity: 100,
    customCss: "",
    backgroundImageUrl: null,
    layouts: [
      {
        id: mobileLayoutId,
        name: "Mobile",
        role: "mobile",
        breakpoint: 0,
        columnCount: 3,
        leftGutterColumnCount: 0,
        rightGutterColumnCount: 0,
      },
      {
        id: baseLayoutId,
        name: "Base",
        role: "base",
        breakpoint: 768,
        columnCount: 12,
        leftGutterColumnCount: 0,
        rightGutterColumnCount: 0,
      },
    ],
    sections: [{ id: sectionId, kind: "empty", xOffset: 0, yOffset: 0 }],
    items: [
      item(
        "health-dashboard-fleet",
        systems.map((system) => system.id),
        { xOffset: 0, yOffset: 0, width: 8, height: 4 },
        { xOffset: 0, yOffset: 0, width: 3, height: 3 },
      ),
      item(
        "health-dashboard-nas",
        systems.filter((system) => system.kind === "synology").map((system) => system.id),
        { xOffset: 8, yOffset: 0, width: 4, height: 2 },
        { xOffset: 0, yOffset: 3, width: 3, height: 2 },
      ),
      item(
        "health-dashboard-storage",
        systems.filter((system) => system.kind === "glances").map((system) => system.id),
        { xOffset: 8, yOffset: 2, width: 4, height: 2 },
        { xOffset: 0, yOffset: 5, width: 3, height: 2 },
      ),
      item(
        "health-dashboard-cluster",
        ["fixture-proxmox"],
        { xOffset: 0, yOffset: 4, width: 12, height: 3 },
        { xOffset: 0, yOffset: 7, width: 3, height: 3 },
        { defaultTab: "cluster" },
      ),
    ],
  };
}
