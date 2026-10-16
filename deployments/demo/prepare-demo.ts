import { Database } from "bun:sqlite";
import { existsSync, writeFileSync } from "node:fs";

// The regular worker migrations already seed Homarr's real DEMO_MODE data.
// Make one small sample board once, without resetting later user edits.
const marker = "/appdata/.remote-demo-prepared";
const db = new Database("/appdata/db/db.sqlite", { strict: true });
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
if (!existsSync(marker)) {
  const board = db
    .query<{ id: string }, []>(`SELECT board.id FROM board JOIN user ON user.id=board.creator_id
    WHERE user.name='demo' AND board.name='default'`)
    .get();
  if (board) {
    db.transaction(() => {
      db.query("UPDATE board SET name='Demo-dashboard',page_title='Homarr headless demo' WHERE id=?").run(board.id);
      db.query(
        "DELETE FROM item WHERE board_id=? AND kind NOT IN ('clock','notebook','bookmarks','healthMonitoring')",
      ).run(board.id);
      const welcome = {
        json: {
          title: "Welcome to your private demo",
          showToolbar: false,
          allowReadOnlyCheck: true,
          content:
            "Try Homarr without the dashboard server\n\nThis is sample data from a separate demo worker. Your real Homarr data is untouched.\n\nOpen a dashboard, create a view-only link, then revoke it to see sharing work. You can also invite another device.\n\nThe relay carries encrypted messages. The hosted frontend reads only what your worker allows.",
        },
      };
      db.query("UPDATE item SET options=? WHERE board_id=? AND kind='notebook'").run(JSON.stringify(welcome), board.id);
      // Remove only the ownerless board created by the same fresh demo seed,
      // so the small sample board is the first board opened by the remote UI.
      db.query("DELETE FROM board WHERE name='dashboard' AND creator_id IS NULL AND id!=?").run(board.id);
    })();
  }
  writeFileSync(marker, "Prepared real Homarr demo seed\n", { mode: 0o600 });
}
const counts = db
  .query<{ boards: number; apps: number; widgets: number }, []>(`SELECT
  (SELECT COUNT(*) FROM board) AS boards,
  (SELECT COUNT(*) FROM app) AS apps,
  (SELECT COUNT(*) FROM item) AS widgets`)
  .get();
console.log(
  `Demo data ready: ${counts?.boards ?? 0} dashboards, ${counts?.apps ?? 0} apps, ${counts?.widgets ?? 0} widgets.`,
);
db.close();
