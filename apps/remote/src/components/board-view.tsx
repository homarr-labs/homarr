import { Alert, Button, Group, Loader, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { WorkerConnection } from "../lib/connection";
import { workerRequest } from "../lib/connection";
import { errorMessage } from "../lib/platform";
import { EncryptedMedia, isEncryptedMediaPath, useEncryptedMedia } from "./encrypted-media";
import { Glyph } from "./icons";

export interface BoardSummary {
  id: string;
  name: string;
}
interface BoardSnapshot {
  id: string;
  name: string;
  apps: { id: string; name: string; url: string | null }[];
  widgets: { id: string; title?: string; kind: string; data?: unknown }[];
}

function safeAppHref(value: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password && (url.protocol === "https:" || url.protocol === "http:")) return url.href;
  } catch {
    return;
  }
}

export function BoardView({ connection, boards }: { connection: WorkerConnection; boards: BoardSummary[] }) {
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const { references, media } = useEncryptedMedia(connection, snapshot?.widgets ?? emptyWidgets, boardId);
  useEffect(() => {
    if (!boardId) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setSnapshot(null);
    void workerRequest<BoardSnapshot>(connection, `/remote/boards/${encodeURIComponent(boardId)}`, {
      signal: abort.signal,
    })
      .then((board) => {
        if (!abort.signal.aborted) setSnapshot(board);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [connection, boardId, revision]);
  if (!boards.length)
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Glyph name="server" size={26} />
        </div>
        <h2>No boards available</h2>
        <p>
          This device has no permitted boards yet. Ask the owner for access, or create a board using the worker API.
        </p>
      </div>
    );
  return (
    <>
      <Group justify="space-between" mb="lg">
        <fieldset className="board-tabs" aria-label="Boards">
          {boards.map((board) => (
            <Button
              key={board.id}
              variant={board.id === boardId ? "filled" : "default"}
              size="sm"
              onClick={() => setBoardId(board.id)}
            >
              {board.name}
            </Button>
          ))}
        </fieldset>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<Glyph name="refresh" size={14} />}
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Group>
      {loading && (
        <Group className="state-message">
          <Loader size="xs" />
          <span>Reading your board through the encrypted connection…</span>
        </Group>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {snapshot && (
        <div className="board-grid">
          {snapshot.apps.map((app) => {
            const href = safeAppHref(app.url);
            return (
              <a
                key={app.id}
                className="dashboard-tile dashboard-app"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="app-initial">{app.name.slice(0, 1).toUpperCase()}</span>
                <h3>{app.name}</h3>
                <Glyph name="arrow" size={16} style={{ marginLeft: "auto" }} />
              </a>
            );
          })}
          {snapshot.widgets.map((widget) => (
            <section className="dashboard-tile" key={widget.id}>
              <h3>{widgetLabel(widget.kind, widget.title)}</h3>
              <WidgetValue value={widget.data} boardId={boardId} kind={widget.kind} />
              <EncryptedMedia
                paths={references.get(widget.id) ?? []}
                media={media}
                title={widgetLabel(widget.kind, widget.title)}
              />
            </section>
          ))}
          {!snapshot.apps.length && !snapshot.widgets.length && (
            <Text c="dimmed" size="sm">
              This board is empty.
            </Text>
          )}
        </div>
      )}
    </>
  );
}

const emptyWidgets: BoardSnapshot["widgets"] = [];

function widgetLabel(kind: string, title?: string): string {
  if (title && title !== kind) return title;
  if (kind === "notebook") return "Note";
  if (kind === "clock" || kind === "dateTime") return "Clock";
  if (kind === "bookmarks") return "Bookmarks";
  if (kind === "healthMonitoring") return "Server status";
  return title || kind;
}

function WidgetValue({ value, boardId, kind }: { value: unknown; boardId: string; kind: string }) {
  if (isEncryptedMediaPath(value, boardId)) return null;
  if (value === undefined || value === null)
    return (
      <Text size="xs" c="dimmed">
        No data available
      </Text>
    );
  if (typeof value === "string" || typeof value === "number") return <Text size="lg">{String(value)}</Text>;
  if (typeof value === "object" && !Array.isArray(value)) {
    const data = value as Record<string, unknown>;
    if (typeof data.reason === "string" && ["unconfigured", "unsupported", "unavailable"].includes(String(data.status)))
      return (
        <Text size="sm" c="dimmed">
          {data.reason}
        </Text>
      );
    if (kind === "notebook" && typeof data.content === "string") {
      if (isEncryptedMediaPath(data.content, boardId)) return null;
      return (
        <Text className="widget-note" size="sm">
          {data.content || "This note is empty."}
        </Text>
      );
    }
    if ((kind === "clock" || kind === "dateTime") && typeof data.now === "string") {
      const captured = new Date(data.now);
      if (Number.isFinite(captured.getTime())) return <ClockSnapshot captured={captured} timezone={data.timezone} />;
    }
    if (kind === "bookmarks" && Array.isArray(data.bookmarks)) return <BookmarkLinks values={data.bookmarks} />;
  }
  return (
    <details className="widget-data">
      <summary>Show data</summary>
      <pre>
        {JSON.stringify(
          value,
          (_key, entry: unknown) => {
            if (isEncryptedMediaPath(entry, boardId)) return "[encrypted image]";
            return entry;
          },
          2,
        )}
      </pre>
    </details>
  );
}

function ClockSnapshot({ captured, timezone }: { captured: Date; timezone: unknown }) {
  let zone = "UTC";
  if (typeof timezone === "string" && timezone) zone = timezone;
  let time: string;
  let date: string;
  try {
    time = new Intl.DateTimeFormat(undefined, { timeZone: zone, timeStyle: "short" }).format(captured);
    date = new Intl.DateTimeFormat(undefined, { timeZone: zone, dateStyle: "long" }).format(captured);
  } catch {
    zone = "UTC";
    time = new Intl.DateTimeFormat(undefined, { timeZone: zone, timeStyle: "short" }).format(captured);
    date = new Intl.DateTimeFormat(undefined, { timeZone: zone, dateStyle: "long" }).format(captured);
  }
  return (
    <div className="widget-clock">
      <div className="widget-clock-time">{time}</div>
      <Text size="sm">{date}</Text>
      <Text size="xs" c="dimmed" mt="sm">
        Snapshot · {zone} · use Refresh to update
      </Text>
    </div>
  );
}

function BookmarkLinks({ values }: { values: unknown[] }) {
  const links: { id: string; name: string; href: string }[] = [];
  const ids = new Set<string>();
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const bookmark = value as Record<string, unknown>;
    if (typeof bookmark.href !== "string") continue;
    const href = safeAppHref(bookmark.href);
    if (!href) continue;
    let id = href;
    if (typeof bookmark.id === "string" && bookmark.id) id = bookmark.id;
    if (ids.has(id)) continue;
    ids.add(id);
    let name = new URL(href).hostname;
    if (typeof bookmark.name === "string" && bookmark.name.trim()) name = bookmark.name;
    links.push({ id, name, href });
  }
  if (!links.length)
    return (
      <Text size="sm" c="dimmed">
        No bookmarks yet.
      </Text>
    );
  return (
    <div className="widget-bookmarks">
      {links.map((link) => (
        <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer">
          <span>{link.name}</span>
          <Glyph name="arrow" size={15} />
        </a>
      ))}
    </div>
  );
}
