export const releaseV2QaBoardAccessValues = ["none", "view", "modify", "full"] as const;

export type ReleaseV2QaBoardAccess = (typeof releaseV2QaBoardAccessValues)[number];
export type ReleaseV2QaPacketBoardAccess = Record<string, Record<string, Record<string, ReleaseV2QaBoardAccess>>>;

export interface ReleaseV2QaCoverageAccessManifest {
  boards: { id: string }[];
  packets: { id: string; boards: string[]; personas: string[] }[];
  personas: string[];
}

export const releaseV2QaPacketBoardAccess = {
  "preflight-01": {},
  "preflight-02": {
    "Avery Admin": { "qa-grid-24": "full", "qa-permissions-public": "full" },
    "Rowan Owner": { "qa-grid-24": "full", "qa-permissions-public": "full" },
    "Vivian Viewer": { "qa-grid-24": "view", "qa-permissions-public": "view" },
    "Nolan Outsider": { "qa-grid-24": "none", "qa-permissions-public": "none" },
  },
  "preflight-03": {},
  "board-01": {
    "Rowan Owner": { "qa-grid-24": "full" },
  },
  "board-02": {
    "Eden Editor": { "qa-scroll-lab": "modify" },
  },
  "board-03": {
    "Casey Chaos": { "qa-dense-collisions": "modify" },
  },
  "board-04": {
    "Rowan Owner": { "qa-nested-containers": "full" },
  },
  "board-05": {
    "Morgan Mobile": { "qa-layout-boundaries": "modify" },
  },
  "board-06": {
    "Brooke Minimalist": { "qa-icons-bookmarks": "modify" },
  },
  "board-07": {
    "Rowan Owner": { "qa-permissions-public": "full" },
    "Eden Editor": { "qa-permissions-public": "modify" },
    "Vivian Viewer": { "qa-permissions-public": "view" },
    "Nolan Outsider": { "qa-permissions-public": "none" },
  },
  "board-08": {
    "Avery Admin": { "qa-download-upload": "full" },
  },
  "board-09": {
    "Kira Keyboard": { "qa-grid-24": "modify" },
  },
  "widgets-01": {
    "Brooke Minimalist": { "qa-widgets-01": "modify" },
  },
  "widgets-02": {
    "Cora Creator": { "qa-widgets-02": "modify" },
  },
  "widgets-03": {
    "Cora Creator": { "qa-widgets-03": "modify" },
  },
  "widgets-04": {
    "Ingrid Infra": { "qa-widgets-04": "modify" },
  },
  "widgets-05": {
    "Ingrid Infra": { "qa-widgets-05": "modify" },
  },
  "widgets-06": {
    "Ingrid Infra": { "qa-widgets-06": "modify" },
  },
  "widgets-07": {
    "Ingrid Infra": { "qa-widgets-07": "modify" },
  },
  "widgets-08": {
    "Ingrid Infra": { "qa-widgets-08": "modify" },
  },
  "widgets-09": {
    "Maya Media": { "qa-widgets-09": "modify" },
  },
  "widgets-10": {
    "Maya Media": { "qa-widgets-10": "modify" },
  },
  "widgets-11": {
    "Ingrid Infra": { "qa-widgets-11": "modify" },
  },
  "widgets-12": {
    "Ash Assistant": { "qa-widgets-12": "modify", "qa-custom-widget-assistant": "modify" },
    "Cora Creator": { "qa-widgets-12": "modify", "qa-custom-widget-assistant": "modify" },
  },
  "core-v2-01": {
    "Cora Creator": { "qa-custom-widget-assistant": "modify" },
  },
  "core-v2-02": {
    "Ash Assistant": { "qa-custom-widget-assistant": "modify" },
  },
  "core-v2-03": {},
  "core-v2-04": {
    "Avery Admin": { "qa-permissions-public": "full" },
    "Nolan Outsider": { "qa-permissions-public": "none" },
  },
  "core-v2-05": {
    "Ingrid Infra": { "qa-widgets-07": "modify" },
  },
  "core-v2-06": {
    "Kira Keyboard": { "qa-grid-24": "modify" },
  },
  "core-v2-07": {
    "Vivian Viewer": { "qa-custom-widget-assistant": "view", "qa-permissions-public": "view" },
  },
  "core-v2-08": {
    "Casey Chaos": { "qa-custom-widget-assistant": "modify", "qa-widgets-12": "modify" },
  },
  "whole-product-01": {
    "Avery Admin": { "qa-grid-24": "full" },
    "Nora Newcomer": { "qa-grid-24": "modify" },
  },
  "whole-product-02": {
    "Rowan Owner": { "qa-grid-24": "full", "qa-custom-widget-assistant": "full" },
  },
  "whole-product-03": {
    "Eden Editor": { "qa-scroll-lab": "modify", "qa-layout-boundaries": "modify" },
  },
  "whole-product-04": {
    "Vivian Viewer": { "qa-permissions-public": "view" },
    "Nolan Outsider": { "qa-permissions-public": "none" },
  },
  "whole-product-05": {
    "Morgan Mobile": { "qa-layout-boundaries": "modify", "qa-widgets-01": "modify" },
  },
  "whole-product-06": {
    "Maya Media": { "qa-widgets-04": "modify", "qa-widgets-05": "modify" },
  },
  "whole-product-07": {
    "Ingrid Infra": {
      "qa-widgets-07": "modify",
      "qa-widgets-08": "modify",
      "qa-widgets-09": "modify",
      "qa-widgets-10": "modify",
      "qa-widgets-11": "modify",
    },
  },
  "whole-product-08": {
    "Cora Creator": { "qa-custom-widget-assistant": "modify" },
    "Ash Assistant": { "qa-custom-widget-assistant": "modify" },
  },
  "whole-product-09": {
    "Kira Keyboard": {
      "qa-grid-24": "full",
      "qa-download-upload": "full",
      "qa-custom-widget-assistant": "full",
    },
    "Casey Chaos": {
      "qa-grid-24": "full",
      "qa-download-upload": "full",
      "qa-custom-widget-assistant": "full",
    },
  },
  "performance-01": {
    "Avery Admin": { "qa-grid-24": "full", "qa-widgets-12": "full" },
  },
  "performance-02": {
    "Rowan Owner": { "qa-dense-collisions": "full", "qa-nested-containers": "full" },
  },
  "performance-03": {
    "Ingrid Infra": { "qa-widgets-04": "modify", "qa-widgets-07": "modify", "qa-widgets-12": "modify" },
    "Maya Media": { "qa-widgets-04": "modify", "qa-widgets-07": "modify", "qa-widgets-12": "modify" },
  },
  "performance-04": {
    "Casey Chaos": {
      "qa-grid-24": "modify",
      "qa-custom-widget-assistant": "modify",
      "qa-widgets-12": "modify",
    },
  },
} as const satisfies ReleaseV2QaPacketBoardAccess;

const accessRank: Record<ReleaseV2QaBoardAccess, number> = {
  none: 0,
  view: 1,
  modify: 2,
  full: 3,
};

export const getReleaseV2QaExpectedBoardAccess = (
  packetAccess: ReleaseV2QaPacketBoardAccess,
): Record<string, Record<string, ReleaseV2QaBoardAccess>> => {
  const expected: Record<string, Record<string, ReleaseV2QaBoardAccess>> = {};
  for (const personaAccess of Object.values(packetAccess)) {
    for (const [persona, boards] of Object.entries(personaAccess)) {
      const expectedBoards = (expected[persona] ??= {});
      for (const [board, access] of Object.entries(boards)) {
        const current = expectedBoards[board];
        if (!current || accessRank[access] > accessRank[current]) expectedBoards[board] = access;
      }
    }
  }

  return Object.fromEntries(
    Object.entries(expected)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([persona, boards]) => [
        persona,
        Object.fromEntries(Object.entries(boards).toSorted(([left], [right]) => left.localeCompare(right))),
      ]),
  );
};

const duplicateValues = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

export const validateReleaseV2QaPacketBoardAccess = (
  manifest: ReleaseV2QaCoverageAccessManifest,
  packetAccess: ReleaseV2QaPacketBoardAccess,
): string[] => {
  const errors: string[] = [];
  const packetIds = manifest.packets.map((packet) => packet.id);
  const accessPacketIds = Object.keys(packetAccess);
  for (const duplicate of new Set(duplicateValues(packetIds))) errors.push(`duplicate coverage packet ${duplicate}`);
  for (const packetId of packetIds) {
    if (!(packetId in packetAccess)) errors.push(`${packetId}: board access assignment is missing`);
  }
  for (const packetId of accessPacketIds) {
    if (!packetIds.includes(packetId)) errors.push(`${packetId}: board access assignment is not a coverage packet`);
  }

  const knownPersonas = new Set(manifest.personas);
  const knownBoards = new Set(manifest.boards.map((board) => board.id));
  for (const packet of manifest.packets) {
    const assignedAccess = packetAccess[packet.id] ?? {};
    const expectedPersonas = packet.boards.length === 0 ? [] : packet.personas;
    for (const persona of expectedPersonas) {
      if (!(persona in assignedAccess)) errors.push(`${packet.id}: ${persona} board access assignment is missing`);
    }
    for (const persona of Object.keys(assignedAccess)) {
      if (!knownPersonas.has(persona)) errors.push(`${packet.id}: unknown persona ${persona}`);
      if (!packet.personas.includes(persona)) errors.push(`${packet.id}: unassigned persona ${persona}`);
      const assignedBoards = assignedAccess[persona] ?? {};
      for (const board of packet.boards) {
        if (!(board in assignedBoards)) errors.push(`${packet.id}: ${persona} access to ${board} is missing`);
      }
      for (const [board, access] of Object.entries(assignedBoards)) {
        if (!knownBoards.has(board)) errors.push(`${packet.id}: unknown board ${board}`);
        if (!packet.boards.includes(board)) errors.push(`${packet.id}: unassigned board ${board}`);
        if (!releaseV2QaBoardAccessValues.includes(access)) {
          errors.push(`${packet.id}: invalid ${persona} access to ${board}: ${String(access)}`);
        }
      }
    }
    if (packet.boards.length === 0 && Object.keys(assignedAccess).length > 0) {
      errors.push(`${packet.id}: board-less packet must not assign board access`);
    }
  }

  return errors;
};
