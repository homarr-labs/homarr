#!/usr/bin/env python3
"""Seed real-integration Statistics comparisons into an existing SQLite development board."""
import argparse
import datetime
import json
from pathlib import Path
import sqlite3

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("database", type=Path)
parser.add_argument("results_directory", type=Path, help="Private directory containing *-results.json catalogs")
parser.add_argument("--board", default="dashboard")
args = parser.parse_args()
if not args.database.is_file():
    parser.error("Database must already exist")
connection = sqlite3.connect(args.database, timeout=30)
connection.row_factory = sqlite3.Row
board = connection.execute("SELECT id FROM board WHERE name = ?", (args.board,)).fetchone()
if board is None:
    parser.error("Board not found")
section = connection.execute("SELECT id FROM section WHERE board_id = ? AND kind = 'empty'", (board["id"],)).fetchone()
if section is None:
    parser.error("An existing root grid section is required")
layouts = connection.execute("SELECT * FROM layout WHERE board_id = ?", (board["id"],)).fetchall()
if not layouts:
    parser.error("The board has no layouts")

catalogs = {}
for path in sorted(args.results_directory.glob("*-results.json")):
    for result in json.loads(path.read_text()):
        if result.get("success") and result.get("metrics"):
            exists = connection.execute("SELECT id FROM integration WHERE id = ?", (result["integrationId"],)).fetchone()
            if exists:
                catalogs[result["kind"]] = result

# Deliberately varied labels, units, source combinations, and repeated-source metrics.
fields = {
    "spool": ("spoolman", "spools", "Spools"),
    "weight": ("spoolman", "remainingWeight", "Filament"),
    "up": ("gatus", "up", "Healthy"),
    "down": ("gatus", "down", "Down"),
    "targets": ("prometheus", "total", "Targets"),
    "warnings": ("netdata", "warnings", "Warnings"),
    "notes": ("trilium", "notesCount", "Notes"),
    "storage": ("trilium", "dbSize", "Storage"),
    "version": ("trilium", "version", "Version"),
    "locations": ("homebox", "locations", "Locations"),
    "labels": ("homebox", "labels", "Labels"),
    "value": ("homebox", "totalValue", "Total value"),
    "users": ("homebox", "users", "People"),
    "watches": ("changedetection", "totalObserved", "Page watches"),
    "checks": ("healthchecks", "checksUp", "Checks up"),
    "unread": ("miniflux", "unread", "Unread"),
    "bookmarks": ("karakeep", "bookmarks", "Bookmarks"),
    "favorites": ("karakeep", "favorites", "Favorites"),
    "recipes": ("mealie", "recipes", "Recipes"),
    "members": ("mealie", "users", "Members"),
    "games": ("romm", "roms", "Games"),
    "platforms": ("romm", "platforms", "Platforms"),
    "queue": ("fileflows", "queue", "Queued"),
    "processed": ("fileflows", "processed", "Processed"),
}
# slug, width, height, x, y, rows, plain, icons, spacing, compact, fields
variants = [
    ("filament", 1, 2, 0, 0, False, False, True, "xs", False, ["spool", "weight"]),
    ("health-strip", 2, 1, 1, 0, True, True, True, "xs", False, ["up", "down"]),
    ("notes", 2, 2, 3, 0, False, True, True, "xs", True, ["notes", "storage", "version"]),
    ("inventory-rows", 3, 2, 5, 0, True, False, True, "xs", False, ["locations", "labels", "value", "users", "spool", "weight", "notes", "storage"]),
    ("quiet-cards", 2, 2, 8, 0, False, False, False, "xs", True, ["checks", "watches"]),
    ("tall-library", 3, 6, 0, 2, False, False, True, "sm", True, ["notes", "storage", "spool", "weight", "locations", "labels", "bookmarks", "favorites", "recipes", "members", "games", "platforms"]),
    ("library-cards", 3, 2, 3, 2, False, True, True, "xs", False, ["notes", "storage", "bookmarks", "unread"]),
    ("wide-rows", 4, 2, 6, 2, True, False, True, "xs", False, ["up", "down", "targets", "warnings", "checks", "watches", "notes", "storage"]),
    ("large-rows", 6, 2, 3, 4, True, True, True, "sm", True, ["up", "down", "targets", "warnings", "checks", "watches", "notes", "storage", "spool", "weight", "locations", "labels", "bookmarks", "recipes", "games", "queue"]),
    ("no-icon-rows", 3, 2, 3, 6, True, False, False, "xs", False, ["queue", "processed", "games", "platforms", "bookmarks", "favorites", "recipes", "members"]),
    ("spacious-cards", 3, 2, 6, 6, False, False, True, "md", False, ["weight", "value"]),
]
prepared = []
for slug, width, height, x, y, rows, plain, icons, spacing, compact, keys in variants:
    entries = []
    for key in keys:
        kind, metric, label = fields[key]
        catalog = catalogs.get(kind)
        if not catalog or not any(item["key"] == metric for item in catalog["metrics"]):
            parser.error(f"Missing validated real metric: {kind}.{metric}")
        entries.append({"id": f"{slug}-{key}", "integrationId": catalog["integrationId"], "metric": metric, "label": label, "compact": compact, "hidden": False})
    options = {"entries": entries, "rows": rows, "plain": plain, "showIcon": icons, "spacing": spacing}
    style = "cards"
    if rows:
        style = "rows"
    if plain:
        style = "plain " + style
    advanced = {"title": f"{width}×{height} · {style}", "customCssClasses": [], "borderColor": ""}
    prepared.append(("stats-demo-" + slug, width, height, x, y, options, advanced))

backup = args.database.with_name(args.database.stem + ".before-stats-gallery-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f") + ".sqlite")
backup.touch(mode=0o600)
with sqlite3.connect(backup) as destination:
    connection.backup(destination)

with connection:
    connection.execute("BEGIN IMMEDIATE")
    # Touch only this script's own items, never other widgets or integrations.
    owned = connection.execute("SELECT id FROM item WHERE board_id = ? AND id LIKE 'stats-demo-%'", (board["id"],)).fetchall()
    for item in owned:
        connection.execute("DELETE FROM item_layout WHERE item_id = ?", (item["id"],))
        connection.execute("DELETE FROM integration_item WHERE item_id = ?", (item["id"],))
        connection.execute("DELETE FROM item WHERE id = ?", (item["id"],))
    for item_id, width, height, x, y, options, advanced in prepared:
        connection.execute("INSERT INTO item (id, board_id, kind, options, advanced_options) VALUES (?, ?, 'stats', ?, ?)", (item_id, board["id"], json.dumps({"json": options}), json.dumps({"json": advanced})))
        for integration_id in sorted({entry["integrationId"] for entry in options["entries"]}):
            connection.execute("INSERT INTO integration_item (item_id, integration_id) VALUES (?, ?)", (item_id, integration_id))
    for layout in layouts:
        bottom = connection.execute("SELECT COALESCE(MAX(y_offset + height), 0) FROM item_layout WHERE layout_id = ? AND section_id = ?", (layout["id"], section["id"])).fetchone()[0]
        start = bottom
        for item_id, width, height, x, y, options, advanced in prepared:
            px, py, pw = x, start + y, width
            if layout["column_count"] < 10:
                px, py, pw = 0, start, min(width, layout["column_count"])
                start += height
            connection.execute("INSERT INTO item_layout (item_id, section_id, layout_id, x_offset, y_offset, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)", (item_id, section["id"], layout["id"], px, py, pw, height))
print(f"Seeded {len(prepared)} real-data variants on {args.board}; existing widgets preserved.")
print(f"SQLite backup: {backup}")
