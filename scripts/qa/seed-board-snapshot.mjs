import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Local synthetic fixtures only. Refuse to touch an existing database.
const root = path.resolve(import.meta.dirname, "../..");
const output = path.resolve(process.argv[2] ?? "/tmp/homarr-board-snapshot-fixtures");
const filename = path.join(output, "seed.sqlite");
if (existsSync(filename)) throw new Error(`Fixture database already exists: ${filename}`);
mkdirSync(output, { recursive: true });
const db = new DatabaseSync(filename);
const migrations = path.join(root, "packages/db/migrations/sqlite");
const journal = JSON.parse(readFileSync(path.join(migrations, "meta/_journal.json"), "utf8"));
db.exec("PRAGMA foreign_keys = OFF");
db.exec("BEGIN TRANSACTION");
for (const entry of journal.entries) db.exec(readFileSync(path.join(migrations, `${entry.tag}.sql`), "utf8"));
db.exec("COMMIT TRANSACTION");
db.exec("PRAGMA foreign_keys = ON");

const insert = (table, values) => {
  const keys = Object.keys(values);
  const columns = keys.map((key) => `"${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}"`).join(", ");
  db.prepare(`INSERT INTO "${table}" (${columns}) VALUES (${keys.map(() => "?").join(", ")})`).run(
    ...Object.values(values),
  );
};
const serialized = (json) => JSON.stringify({ json });
const require = createRequire(path.join(root, "package.json"));
const password = randomBytes(24).toString("base64url");
const userId = "snapshot-qa-owner";
insert("user", {
  id: userId,
  name: "snapshotqa",
  password: await require("bcrypt").hash(password, 10),
  completedBoardTour: 1,
  completedManageTour: 1,
});
insert("group", { id: "snapshot-qa-admin", name: "Synthetic Administrators", position: 0 });
insert("group", { id: "everyone", name: "Everyone", position: 1 });
insert("groupPermission", { groupId: "snapshot-qa-admin", permission: "admin" });
insert("groupMember", { groupId: "snapshot-qa-admin", userId });
insert("onboarding", { id: "snapshot-qa-onboarding", step: "finish" });
insert("serverSetting", { settingKey: "analytics", value: serialized({ enableGeneral: false, instanceId: null }) });
insert("serverSetting", {
  settingKey: "board",
  value: serialized({
    homeBoardId: "qa-mixed",
    mobileHomeBoardId: "qa-mixed",
    enableStatusByDefault: false,
    forceDisableStatus: true,
  }),
});
insert("serverSetting", { settingKey: "user", value: serialized({ enableGravatar: false }) });
insert("iconRepository", { id: "snapshot-qa-icons", slug: "local" });
insert("icon", {
  id: "snapshot-qa-png",
  name: "Synthetic icon.png",
  url: "/logo/logo.png",
  checksum: "synthetic-png",
  iconRepositoryId: "snapshot-qa-icons",
});
insert("icon", {
  id: "snapshot-qa-svg",
  name: "Synthetic icon.svg",
  url: `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#228be6"/></svg>').toString("base64")}`,
  checksum: "synthetic-svg",
  iconRepositoryId: "snapshot-qa-icons",
});

const fixtures = [];
const board = (slug, columns, left = 0, right = 0, custom = {}) => {
  const id = `qa-${slug}`;
  insert("board", { id, name: id, isPublic: 1, creatorId: userId, disableStatus: 1, ...custom });
  insert("boardUserPermission", { boardId: id, userId, permission: "full" });
  const layouts = [
    {
      id: `${id}-mobile`,
      name: "Mobile",
      columnCount: 3,
      leftGutterColumnCount: 0,
      rightGutterColumnCount: 0,
      breakpoint: 0,
      role: "mobile",
    },
    {
      id: `${id}-base`,
      name: "Base",
      columnCount: columns,
      leftGutterColumnCount: left,
      rightGutterColumnCount: right,
      breakpoint: 768,
      role: "base",
    },
  ];
  for (const layout of layouts) insert("layout", { ...layout, boardId: id });
  const roots = {};
  for (const [lane, xOffset] of [
    ["main", 0],
    ["left", -1],
    ["right", 1],
  ]) {
    roots[lane] = `${id}-${lane}`;
    insert("section", { id: roots[lane], boardId: id, kind: "empty", xOffset, yOffset: 0 });
  }
  let itemCount = 0;
  const item = (kind, options, placement, mobilePlacement, lane = "main", advanced = {}) => {
    const itemId = `${id}-item-${++itemCount}`;
    insert("item", {
      id: itemId,
      boardId: id,
      kind,
      options: serialized(options),
      advancedOptions: serialized(advanced),
    });
    for (const [index, layout] of layouts.entries()) {
      let position = mobilePlacement;
      let sectionId = roots[lane] ? roots.main : lane;
      if (index === 1) {
        position = placement;
        sectionId = roots[lane] ?? lane;
      }
      insert("item_layout", {
        itemId,
        layoutId: layout.id,
        sectionId,
        xOffset: position[0],
        yOffset: position[1],
        width: position[2],
        height: position[3],
      });
    }
    return itemId;
  };
  const app = (label, placement, mobilePlacement, lane = "main") => {
    const appId = `${id}-app-${itemCount + 1}`;
    insert("app", {
      id: appId,
      name: label,
      description: "Synthetic application",
      iconUrl: "/logo/logo.png",
      href: "/boards/qa-mixed",
    });
    return item(
      "app",
      { appId, pingEnabled: false, openInNewTab: false, layout: "row", descriptionDisplayMode: "normal" },
      placement,
      mobilePlacement,
      lane,
    );
  };
  const container = (name, placement, mobilePlacement, parent, options = {}) => {
    const sectionId = `${id}-container-${name}`;
    insert("section", {
      id: sectionId,
      boardId: id,
      kind: "container",
      options: serialized({ title: name, collapsible: true, showLabel: true, ...options }),
    });
    insert("section_layout", {
      sectionId,
      layoutId: layouts[1].id,
      parentSectionId: parent ?? roots.main,
      xOffset: placement[0],
      yOffset: placement[1],
      width: placement[2],
      height: placement[3],
    });
    insert("section_layout", {
      sectionId,
      layoutId: layouts[0].id,
      parentSectionId: parent ?? roots.main,
      xOffset: mobilePlacement[0],
      yOffset: mobilePlacement[1],
      width: mobilePlacement[2],
      height: mobilePlacement[3],
    });
    return sectionId;
  };
  fixtures.push({ id, columns, left, right, layouts: layouts.map((layout) => layout.id) });
  return { id, roots, item, app, container };
};

const mixed = board("mixed", 10);
mixed.item("timer", { mode: "timer", timerMinutes: 10 }, [0, 0, 3, 2], [0, 0, 3, 2], "main", {
  title: "Synthetic timer",
});
mixed.app("Synthetic App A", [0, 2, 3, 1], [0, 2, 3, 1]);
mixed.app("Synthetic App B", [3, 0, 3, 1], [0, 3, 3, 1]);
mixed.item(
  "notebook",
  {
    content: "<h2>Synthetic notebook</h2><p>Public fixture text with <strong>bold</strong> content.</p>",
    showToolbar: false,
  },
  [3, 1, 3, 3],
  [0, 4, 3, 3],
);
mixed.item("calendar", {}, [6, 0, 4, 4], [0, 7, 3, 4]);

const nested = board("containers", 12);
const outer = nested.container("Outer", [0, 0, 7, 7], [0, 0, 3, 7]);
const inner = nested.container("Nested", [0, 2, 5, 4], [0, 2, 3, 4], outer);
const scrollable = nested.container("Scrollable", [7, 0, 5, 4], [0, 7, 3, 4], undefined, { scrollable: true });
nested.app("Synthetic nested app", [0, 0, 3, 1], [0, 0, 3, 1], outer);
nested.item("timer", { mode: "timer" }, [0, 0, 3, 2], [0, 0, 3, 2], inner);
nested.app("Synthetic nested lower app", [0, 2, 3, 1], [0, 2, 3, 1], inner);
for (let i = 0; i < 6; i++) nested.app(`Synthetic scroll ${i}`, [0, i, 4, 1], [0, i, 3, 1], scrollable);
const collapsed = nested.container("Collapsed", [7, 5, 5, 3], [0, 11, 3, 3]);
insert("section_collapse_state", { userId, sectionId: collapsed, collapsed: 1 });
nested.item("notebook", { content: "<p>Synthetic hidden note</p>" }, [0, 0, 4, 2], [0, 0, 3, 2], collapsed);

const sidebars = board("sidebars", 14, 2, 2);
sidebars.app("Synthetic left app", [0, 0, 2, 1], [0, 0, 3, 1], "left");
sidebars.item("timer", { mode: "timer" }, [0, 1, 2, 2], [0, 1, 3, 2], "left");
sidebars.item("notebook", { content: "<p>Synthetic main note</p>", showToolbar: false }, [0, 0, 5, 3], [0, 3, 3, 3]);
sidebars.app("Synthetic main app", [0, 3, 5, 1], [0, 6, 3, 1]);
sidebars.app("Synthetic right app", [0, 0, 2, 1], [0, 7, 3, 1], "right");
sidebars.item("timer", {}, [0, 1, 2, 2], [0, 8, 3, 2], "right");

const styled = board("styled", 6, 0, 0, {
  itemRadius: "xs",
  primaryColor: "#228be6",
  secondaryColor: "#40c057",
  opacity: 85,
  customCss:
    '.synthetic-accent { border: 3px solid #845ef7; } [data-testid="board-canvas"] { letter-spacing: 0.15px; }',
});
styled.item("timer", { mode: "pomodoro" }, [0, 0, 3, 3], [0, 0, 3, 3], "main", {
  title: "Synthetic styled timer",
  customCssClasses: ["synthetic-accent"],
});
styled.app("Synthetic styled app", [0, 3, 3, 1], [0, 3, 3, 1]);
styled.item(
  "notebook",
  { content: "<h3>Synthetic list</h3><ul><li>First entry</li><li>Second entry</li></ul>", showToolbar: false },
  [3, 0, 3, 4],
  [0, 4, 3, 4],
);

db.close();
writeFileSync(path.join(output, "credentials.json"), JSON.stringify({ username: "snapshotqa", password }), {
  mode: 0o600,
});
writeFileSync(path.join(output, "fixtures.json"), JSON.stringify(fixtures, null, 2));
console.log(`Created ${fixtures.length} synthetic boards in ${filename}`);
