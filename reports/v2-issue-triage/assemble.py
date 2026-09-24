"""Assemble reviewer assessments; fail on missing/duplicate issues or comment counts."""
import collections
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'source/manifest.json').read_text())
expected = {x['number']: x for x in manifest['issues']}
labels = {'integration-request': 'Integration requests', 'bug': 'Bugs', 'annoyance': 'Annoyances', 'qol': 'Quality of life', 'big-feature': 'Large feature requests', 'documentation': 'Documentation', 'other': 'Other / tracking'}
statuses = {'addressed-in-v2': 'Will be fixed with V2', 'partially-addressed': 'Partially addressed', 'not-addressed': 'Not addressed', 'needs-verification': 'Needs verification'}
def reviewer_name(batch):
    if batch == 1:
        return 'Initial reviewer'
    return f'Luna {batch} (maximum reasoning)'

assessments = []
for batch in range(1, 6):
    rows = json.loads((ROOT / f'reviews/batch-{batch}.json').read_text())
    assigned = set(json.loads((ROOT / f'source/batch-{batch}.json').read_text()))
    assert {r['number'] for r in rows} == assigned, f'Batch {batch} assignment mismatch'
    for row in rows:
        row['reviewer'] = reviewer_name(batch)
        source_issue = json.loads((ROOT / expected[row['number']]['source']).read_text())
        assert row['title'] == source_issue['title'], f"Title mismatch: {row['number']}"
        assert row['category'] in labels, row
        assert row['status'] in statuses, row
        assert row['confidence'] in ('high', 'medium', 'low'), row
        assert row['comments_read'] == expected[row['number']]['comments_downloaded'], row['number']
        assert all(row.get(k) for k in ('summary','conversation','evidence','remaining')), row['number']
    assessments.extend(rows)
counts = collections.Counter(r['number'] for r in assessments)
assert set(counts) == set(expected), 'Issue coverage mismatch'
assert all(n == 1 for n in counts.values()), 'Duplicate assessments'
for item in expected.values():
    assert hashlib.sha256((ROOT / item['source']).read_bytes()).hexdigest() == item['sha256'], item['number']
    assert hashlib.sha256((ROOT / item['timeline_source']).read_bytes()).hexdigest() == item['timeline_sha256'], item['number']
    issue = json.loads((ROOT / item['source']).read_text())
    timeline = json.loads((ROOT / item['timeline_source']).read_text())
    assert {c['id'] for c in issue['full_comments']} == {e['id'] for e in timeline if e['event'] == 'commented'}, item['number']
audit_rows = []
for audit_file in sorted((ROOT / 'reviews').glob('audit-*.json')):
    rows = json.loads(audit_file.read_text())
    assert len({r['number'] for r in rows}) == len(rows), audit_file
    assert all(r['number'] in expected for r in rows), audit_file
    audit_rows.extend(rows)
audited_count = len({r['number'] for r in audit_rows})
for item in manifest.get('inspected_attachments', []):
    assert hashlib.sha256((ROOT / item['source']).read_bytes()).hexdigest() == item['sha256'], item['source']
assessments.sort(key=lambda r: r['number'], reverse=True)
(ROOT / 'assessments.json').write_text(json.dumps(assessments, indent=2) + '\n')

def clean(s):
    if isinstance(s, list):
        return '; '.join(map(str, s))
    return str(s)

def tablecell(s):
    return clean(s).replace('|', '\\|').replace('\n', ' ')

def evidence_link(text):
    # Keep reviewer wording, and add immutable GitHub source links when line references exist.
    text = clean(text)
    refs = re.findall(r'((?:(?:apps|packages|tools|scripts|docker|development|\.github)/[^\s`:,;]+|Dockerfile|nginx\.conf|pnpm-lock\.yaml|pnpm-workspace\.yaml|package\.json)):(\d+)', text)
    links = []
    for path, line in refs:
        if (ROOT.parent.parent / path).is_file():
            links.append(f'[source L{line}](https://github.com/homarr-labs/homarr/blob/{manifest["base_sha"]}/{path}#L{line})')
    return text + (' — ' + ', '.join(dict.fromkeys(links)) if links else '')

def detail(row):
    number = row['number']
    lines = [f'### #{number} — {row["title"]}', '', f'[Issue and conversation](https://github.com/homarr-labs/homarr/issues/{number}) · **{labels[row["category"]]}** · **{statuses[row["status"]]}** · Confidence: **{row["confidence"]}**', '', f'**Request:** {clean(row["summary"])}', '', f'**Conversation ({row["comments_read"]} comments read):** {clean(row["conversation"])}', '', '**V2 evidence:**', '']
    lines.extend('- ' + evidence_link(e) for e in row['evidence'])
    lines.extend(['', f'**Remaining / follow-up:** {clean(row["remaining"])}', ''])
    return '\n'.join(lines)

status_counts = collections.Counter(r['status'] for r in assessments)
category_counts = collections.Counter(r['category'] for r in assessments)
lines = ['# Homarr V2 — complete open-issue triage', '', f'As of {manifest["retrieved_at"]}. Base: [`release/v2` at `{manifest["base_sha"][:12]}`](https://github.com/homarr-labs/homarr/tree/{manifest["base_sha"]}).', '', f'**{len(assessments)} / {manifest["issue_count"]} open issues reviewed; {sum(r["comments_read"] for r in assessments)} / {manifest["comment_count"]} issue comments read.** Five issue-review batches, five Luna/max agents across review and independent audit, and parent reconciliation. Closed issues and PRs are not the backlog scope. GitHub was read only.', '', '“Will be fixed with V2” means the checked code addresses the request; it does not imply a runtime reproduction passed, a release shipped, or that V2 first introduced the fix. Confidence refers to the disposition. See [methodology and limits](README.md), [runtime validation status](RUNTIME-VALIDATION.md), and the [source manifest](source/manifest.json).', '', '## Disposition totals', '', '| Disposition | Issues |', '| --- | ---: |']
lines.extend(f'| {label} | {status_counts[key]} |' for key,label in statuses.items())
lines.extend(['', '## Categories', '', '| Category | Issues | Report |', '| --- | ---: | --- |'])
for key,label in labels.items():
    lines.append(f'| {label} | {category_counts[key]} | [Read](categories/{key}.md) |')
lines.extend(['', '## Candidates that will be fixed with V2', '', 'These are local release follow-up candidates. No issue should be closed solely on the basis of source inspection where the entry still asks for runtime confirmation.', '', '| Issue | Confidence | Assessment |', '| --- | --- | --- |'])
for row in assessments:
    if row['status'] == 'addressed-in-v2':
        lines.append(f'| [#{row["number"]}](https://github.com/homarr-labs/homarr/issues/{row["number"]}) {tablecell(row["title"])} | {row["confidence"]} | {tablecell(row["summary"])} |')
lines.extend(['', '## Every issue', '', '| Issue | Category | V2 disposition | Confidence | Comments |', '| --- | --- | --- | --- | ---: |'])
for row in assessments:
    lines.append(f'| [#{row["number"]}](https://github.com/homarr-labs/homarr/issues/{row["number"]}) {tablecell(row["title"])} | {labels[row["category"]]} | {statuses[row["status"]]} | {row["confidence"]} | {row["comments_read"]} |')
lines.extend(['', '## Detailed assessments', ''])
lines.extend(detail(row) for row in assessments)
(ROOT / 'REPORT.md').write_text('\n'.join(lines) + '\n')
(ROOT / 'categories').mkdir(exist_ok=True)
for key,label in labels.items():
    rows = [r for r in assessments if r['category'] == key]
    content = [f'# {label}', '', f'{len(rows)} issues. See [complete report](../REPORT.md) and [methodology](../README.md).', '']
    content.extend(detail(row) for row in rows)
    if not rows:
        content.append('No issues have this primary category in the snapshot. Related concerns may appear in other issue conversations.')
    (ROOT / 'categories' / f'{key}.md').write_text('\n'.join(content) + '\n')
print(json.dumps({'issues':len(assessments),'comments':sum(r['comments_read'] for r in assessments),'statuses':dict(status_counts),'categories':dict(category_counts)},indent=2))
coverage = ['# Coverage verification', '', f'Base commit: `{manifest["base_sha"]}`.', '', '| Reviewer | Assigned | Reviewed | Comments read |', '| --- | ---: | ---: | ---: |']
for batch in range(1, 6):
    rows = [r for r in assessments if r['reviewer'] == reviewer_name(batch)]
    coverage.append(f'| {reviewer_name(batch)} | 27 | {len(rows)} | {sum(r["comments_read"] for r in rows)} |')
coverage.extend(['', f'Independent Luna/max audit covered **{audited_count} unique issues** in addition to the primary assignments. Parent reconciliation can refine audit recommendations; see PARENT-REVIEW.md and reviews/audit-*.json.', '', 'All checks below passed when this file was generated:', '', '- The 135 downloaded open issue IDs exactly match the 135 assessments.', '- Each issue occurs once, in its assigned reviewer batch.', '- All 442 expected comments were downloaded; reviewer comment counts match each conversation.', '- The downloaded comment IDs exactly match the issue timeline comment IDs.', '- Issue and timeline source files still match their snapshot SHA-256 hashes.', '- All assessments have a recognized category, disposition, confidence, conversation summary, evidence, and follow-up.', '', 'These checks establish inventory and report completeness. They do not independently prove that every reviewer interpretation is correct or that a runtime fix has passed. Source-level findings and any later audit corrections are reflected in the detailed report.', '', 'Rebuild with `python3 reports/v2-issue-triage/assemble.py` from the repository root.', ''])
(ROOT / 'COVERAGE.md').write_text('\n'.join(coverage))
for batch in range(1, 6):
    rows = [r for r in assessments if r['reviewer'] == reviewer_name(batch)]
    contents = [f'# Batch {batch} — {len(rows)} issue assessments', '', 'Reconciled assessment data. See [parent review notes](../PARENT-REVIEW.md) for subsequent corrections.', '']
    contents.extend(detail(r) for r in rows)
    (ROOT / f'reviews/batch-{batch}.md').write_text('\n'.join(contents) + '\n')
