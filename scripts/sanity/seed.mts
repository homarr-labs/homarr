import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fixtureTime, mobilePlacements, placements, scenarios } from "./fixtures.mts";

const serialized = (json: unknown) => JSON.stringify({ json });

export function seedFixtures(databasePath: string, prefix: string) {
  const db = new DatabaseSync(databasePath, { open: true });
  const insert = (table: string, values: Record<string, string | number | null>) => {
    const keys = Object.keys(values);
    const columns = keys.map((key) => `"${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}"`).join(", ");
    db.prepare(`INSERT INTO "${table}" (${columns}) VALUES (${keys.map(() => "?").join(", ")})`).run(
      ...Object.values(values),
    );
  };

  const userId = `${prefix}-owner`;
  const groupId = `${prefix}-admin`;
  const sessionToken = randomBytes(32).toString("hex");
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
  try {
    insert("user", {
      id: userId,
      name: "Sanity fixture owner",
      provider: "credentials",
      completedBoardTour: 1,
      completedManageTour: 1,
      colorScheme: "dark",
    });
    insert("group", { id: groupId, name: groupId, position: 0 });
    insert("groupPermission", { groupId, permission: "admin" });
    insert("groupMember", { groupId, userId });
    insert("session", {
      sessionToken,
      userId,
      expires: Math.max(Date.now(), Date.parse(fixtureTime)) + 24 * 60 * 60 * 1000,
    });
    // The caller must explicitly identify a disposable fixture database.
    const onboarding = db.prepare('SELECT id FROM "onboarding" LIMIT 1').get();
    if (onboarding) db.prepare('UPDATE "onboarding" SET step = ?').run("finish");
    else insert("onboarding", { id: `${prefix}-onboarding`, step: "finish" });
    for (const scenario of scenarios) {
      const boardId = `${prefix}-${scenario.id}`;
      const layouts = [
        { id: `${boardId}-layout`, name: "Desktop", columnCount: 10, breakpoint: 768, role: "base", placements },
        {
          id: `${boardId}-mobile`,
          name: "Mobile",
          columnCount: 3,
          breakpoint: 0,
          role: "mobile",
          placements: mobilePlacements,
        },
      ];
      const sectionId = (id: string) => `${boardId}-${id}`;
      insert("board", { id: boardId, name: boardId, creatorId: userId, isPublic: 0, disableStatus: 1 });
      insert("boardUserPermission", { boardId, userId, permission: "full" });
      for (const { placements: _placements, ...layout } of layouts) insert("layout", { ...layout, boardId });
      insert("section", { id: sectionId("root"), kind: "empty", boardId, xOffset: 0, yOffset: 0 });
      for (const placement of placements) {
        const options = {
          title: placement.id,
          showLabel: ["labeled", "collapsible"].includes(placement.id),
          collapsible: placement.id === "collapsible",
          scrollable: placement.id === "scrollable",
          showOpenAll: false,
          borderColor: "",
          customCssClasses: [],
        };
        insert("section", { id: sectionId(placement.id), boardId, kind: "container", options: serialized(options) });
      }
      for (const [index, parent, y] of [
        [0, "populated", 0],
        [1, "labeled", 0],
        [2, "scrollable", 0],
        [3, "scrollable", 2],
        [4, "nested-child", 0],
        [5, "large", 0],
      ] as const) {
        const itemId = `${boardId}-clock-${index}`;
        insert("item", {
          id: itemId,
          boardId,
          kind: "clock",
          options: serialized({ is24HourFormat: true, showSeconds: false, showDate: false }),
          advancedOptions: serialized({ title: null, customCssClasses: [], borderColor: "" }),
        });
        for (const layout of layouts)
          insert("item_layout", {
            itemId,
            sectionId: sectionId(parent),
            layoutId: layout.id,
            xOffset: 0,
            yOffset: y,
            width: 1,
            height: 1,
          });
      }
      for (const layout of layouts) {
        for (const placement of layout.placements)
          insert("section_layout", {
            sectionId: sectionId(placement.id),
            parentSectionId: sectionId(placement.parent),
            layoutId: layout.id,
            xOffset: placement.x,
            yOffset: placement.y,
            width: placement.w,
            height: placement.h,
          });
      }
    }
    db.exec("COMMIT");
    return { sessionToken, boardName: (scenarioId: string) => `${prefix}-${scenarioId}` };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function readPersistedPlacement(databasePath: string, boardName: string, id: string) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 5000");
  try {
    return db
      .prepare(
        'SELECT x_offset AS x, y_offset AS y, width AS w, height AS h FROM "section_layout" WHERE section_id = ? AND layout_id = ?',
      )
      .get(`${boardName}-${id}`, `${boardName}-layout`);
  } finally {
    db.close();
  }
}

export function readPersistedCollapse(databasePath: string, boardName: string) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 5000");
  try {
    return db
      .prepare('SELECT collapsed FROM "section_collapse_state" WHERE section_id = ?')
      .get(`${boardName}-collapsible`)?.collapsed;
  } finally {
    db.close();
  }
}
