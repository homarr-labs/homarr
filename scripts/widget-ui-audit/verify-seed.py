"""Read-only audit of the persisted screenshot seed; no application tests run."""
import collections
import json
import re
import sqlite3
import sys
from pathlib import Path

path = Path(sys.argv[1]).resolve()
connection = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
registry = Path(__file__).resolve().parents[2] / 'packages/definitions/src/widget.ts'
kinds = re.findall(r'"([^"\n]+)"', registry.read_text().split('] as const')[0])
sizes = {(1, 1), (1, 2), (2, 1), (2, 2), (2, 3), (3, 2), (3, 3), (5, 3), (3, 5), (5, 5)}
rows = [dict(row) for row in connection.execute('''
    SELECT b.id AS board_id, b.name AS board_name, i.id AS item_id, i.kind,
           il.width, il.height, il.x_offset AS x, il.y_offset AS y,
           il.section_id AS section_id, l.id AS layout_id, l.column_count AS columns
    FROM board b JOIN item i ON i.board_id = b.id
    JOIN item_layout il ON il.item_id = i.id JOIN layout l ON l.id = il.layout_id
    WHERE b.id LIKE 'widget-ui-audit-%' AND l.role = 'base'
''')]
issues = []
isolated = [row for row in rows if row['board_id'].startswith('widget-ui-audit-assistant-')]
if len(isolated) != 10 or {(row['width'], row['height']) for row in isolated} != sizes:
    issues.append('Isolated Assistant size matrix is incomplete or duplicated')
for row in isolated:
    if row['kind'] != 'assistant' or row['columns'] != 12 or row['x'] != 0 or row['y'] != 0:
        issues.append(f"Invalid isolated Assistant fixture: {row['board_id']}")
rows = [row for row in rows if not row['board_id'].startswith('widget-ui-audit-assistant-')]
by_kind = collections.defaultdict(list)
by_board = collections.defaultdict(list)
for row in rows:
    by_kind[row['kind']].append(row)
    by_board[row['board_id']].append(row)
    if row['columns'] != 12:
        issues.append(f"{row['board_id']}: expected 12 columns")
    if row['x'] < 0 or row['y'] < 0 or row['x'] + row['width'] > 12:
        issues.append(f"{row['item_id']}: outside grid")
for kind in kinds:
    entries = by_kind[kind]
    if len(entries) != 10 or {(r['width'], r['height']) for r in entries} != sizes:
        issues.append(f'{kind}: incomplete or duplicate size matrix')
for kind in set(by_kind) - set(kinds):
    issues.append(f'{kind}: not in widget registry')
for board, entries in by_board.items():
    count = len({r['kind'] for r in entries})
    if not 2 <= count <= 5:
        issues.append(f'{board}: expected 2-5 types, got {count}')
    for index, a in enumerate(entries):
        for b in entries[index + 1:]:
            if a['section_id'] != b['section_id'] or a['layout_id'] != b['layout_id']:
                continue
            if a['x'] < b['x'] + b['width'] and b['x'] < a['x'] + a['width'] and a['y'] < b['y'] + b['height'] and b['y'] < a['y'] + a['height']:
                issues.append(f"Overlap: {a['item_id']} / {b['item_id']}")
print(json.dumps({'boards': len(by_board), 'isolatedAssistantBoards': len(isolated), 'widgetTypes': len(by_kind), 'placements': len(rows), 'issues': issues}, indent=2))
sys.exit(bool(issues))
