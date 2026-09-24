"""Assemble a revision-aware follow-up without altering the original triage snapshot."""
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
base = json.loads((ROOT / 'assessments.json').read_text())
deltas = {r['number']: r for r in json.loads((HERE / 'delta.json').read_text())}
checks = {}
for filename in ['ui.json', 'auth/auth.json', 'integrations/integrations.json', 'features.json', 'platform/platform.json']:
    path = HERE / filename
    if not path.exists():
        raise SystemExit(f'Missing completed review: {filename}')
    for row in json.loads(path.read_text()):
        assert row['number'] not in checks, f'Duplicate reviewer {row["number"]}'
        row['artifact'] = filename
        checks[row['number']] = row
latest = {r['number']: r for r in json.loads((HERE / 'latest-delta.json').read_text())}
new = json.loads((HERE / 'updated-6853.json').read_text())
base.append(dict(number=6853,title=new['title'],category='qol',status='addressed-in-v2',confidence='high',summary='V2 adds sanitized Markdown/HTML notification rendering, permission-gated Gotify deletion, and a dedicated open-service button instead of whole-card clickthrough.',conversation='The request contains three requirements: formatted content, delete/dismiss controls, and configurable or dedicated clickthrough. No comments were present.',comments_read=0,evidence=['packages/widgets/src/notifications/notification-body.tsx','packages/widgets/src/notifications/component.tsx','packages/api/src/router/widgets/notifications.ts','packages/integrations/src/gotify/gotify-integration.ts'],remaining='Validate formatting and deletion against a real Gotify deployment.'))
run = json.loads((HERE / 'run.json').read_text())
rows=[]
for original in sorted(base,key=lambda r:-r['number']):
    n=original['number']; delta=deltas.get(n); check=checks.get(n); extra=latest.get(n)
    row=dict(original)
    row['baseline_status']=original['status']
    row['baseline_revision']=run['baseline_revision'] if n!=6853 else run['revision']
    row['delta_review']=delta
    row['verification']=check
    row['latest_delta']=extra
    for layer in [delta,check,extra]:
        if layer:
            row['status']=layer.get('suggested_status',row['status'])
            row['confidence']=layer.get('suggested_confidence',row['confidence'])
    row['verification_outcome']=check['outcome'] if check else 'source-only'
    rows.append(row)
now=[json.loads(line) for line in (HERE/'open-inventory.jsonl').read_text().splitlines()]
assert {r['number'] for r in rows}=={r['number'] for r in now}
assert len(rows)==len({r['number'] for r in rows})==136
assert len(deltas)==135
assert set(checks)<=set(r['number'] for r in rows)
comments=0
for row in rows:
    n=row['number']; updated=HERE/f'updated-{n}.json'
    path=ROOT/f'source/{n}.json'
    source=json.loads((updated if updated.exists() else path).read_text())
    conversation=source.get('full_comments',[])
    if n==6853: conversation=json.loads((HERE/'comments-6853.json').read_text())
    assert len(conversation)==next(i['comments'] for i in now if i['number']==n),(n,len(conversation))
    row['comments_read_current']=len(conversation); comments+=len(conversation)
assert comments==448
(HERE/'assessments.json').write_text(json.dumps(rows,indent=2)+'\n')
status=Counter(r['status'] for r in rows); outcomes=Counter(r['verification_outcome'] for r in rows)
labels={'addressed-in-v2':'Will be fixed with V2','partially-addressed':'Partially addressed','not-addressed':'Not addressed','needs-verification':'Needs verification'}
lines=['# V2 issue verification — 18 September 2026','',f'**136/136 current open issues; 448/448 comments covered.** GitHub was read-only. The original 135-issue snapshot remains preserved in [the baseline report](../REPORT.md). New issue #6853 and six additional comments were included in this follow-up.','',f'Initial runtime build: `{run["revision"]}`. Latest source/build follow-up: `{run.get("latest_revision",run["revision"])}`. Each check below names its actual revision. A result from the initial image is not claimed as execution of changed code in the later image. See [runtime provenance](../RUNTIME-VALIDATION.md), [latest commit audit](latest-delta.md), and [latest runtime smoke](latest-runtime.json).','', 'Five Luna/max agents handled the release delta, auth/API, integrations, UI/features, and platform checks; a sixth audited the subsequently arriving release commit. The parent performed additional browser checks and reconciled all results.','', '## Dispositions','', '| Disposition | Issues |','| --- | ---: |']
lines += [f'| {labels[k]} | {status[k]} |' for k in labels]
lines += ['', '## Verification strength','', '| Outcome | Issues |','| --- | ---: |']
lines += [f'| {k} | {v} |' for k,v in sorted(outcomes.items())]
lines += ['', '**Passed** means the stated check passed, not every platform/version was reproduced. **Partial** means only a bounded flow or synthetic fixture was exercised. **Source-only** includes carry-forward source assessments reviewed against the release delta; it is not runtime proof. **Blocked** preserves missing environments or approval limits. Confidence describes the disposition, not a probability of a fix.','', '## Findings to act on','', '- **#962 remains reproducible:** nested hidden-label container menu buttons overlap; the center of the deeper button targets its parent. [Geometry and hit targets](ui/nested-handle-hit-targets.json), [screenshot](ui/nested-handles.png).','- **#3675 is partial:** ready-state shutdown passed; shutdown during migration timed out and exited137. **#3913** direct UID:GID1234 startup failed on appdata permissions.',
'- **#2911 passed the repeated-drag fixture:** two app tiles moved out of a nested container consecutively, without refreshing edit mode; both placements survived save/reload.','- **#4541/#2861 remain partial:** saved Base-layout membership changes do not automatically update existing Mobile membership. The new #2861 reporter comment confirms the simpler demo now meets their needs.','- MCP discovery, scoped management access, REST provisioning, theme selection, layout persistence and content persistence received bounded runtime checks. Their exact limits are in the entries below.','- External IdP/NAS/browser-specific cases remain conditional. Synthetic WUD, Immich and Unraid responses are explicitly not live-service acceptance.','- Successful backup restore was not executed: automatic approval review rejected database replacement/restart. Export and invalid-ZIP rejection passed.','', '## Complete issue index','', '| Issue | Category | Disposition | Confidence | Verification |','| --- | --- | --- | --- | --- |']
for r in rows:
    title=r['title'].replace('|','\\|').replace('\n',' ')
    lines.append(f'| [#{r["number"]}](#issue-{r["number"]}) {title} | {r["category"]} | {labels[r["status"]]} | {r["confidence"]} | {r["verification_outcome"]} |')
for r in rows:
    n=r['number']; c=r['verification']; d=r['delta_review']; e=r['latest_delta']
    lines += ['',f'<a id="issue-{n}"></a>',f'## #{n} — {r["title"]}','',f'[GitHub issue](https://github.com/homarr-labs/homarr/issues/{n}) · {r["category"]} · **{labels[r["status"]]}** · {r["confidence"]} confidence · {r["comments_read_current"]} comments read','','Baseline/source rationale: '+r['summary'],'',f'Conversation: {r["conversation"]}']
    if d and d['changed_since_baseline']: lines += ['',f'First release refresh: {d["finding"]}']
    if c:
        lines += ['',f'Verification: **{c["outcome"]}**, revision `{c["revision"]}`. {c["method"]}','']+[f'- {x}' for x in c['checks']]
        if c['blockers']: lines += ['', 'Limits / remaining:','']+[f'- {x}' for x in c['blockers']]
        lines += ['',f'[Reviewer evidence]({c["artifact"]})','']+[f'- `{x}`' for x in c['evidence']]
    else: lines += ['', 'Verification: **source-only**. Baseline implementation/conversation assessment rechecked against the release changes; no new runtime claim.', '', f'Remaining: {r["remaining"]}']
    if e: lines += ['',f'Latest release delta (`{e["revision"]}`): {e["finding"]}']
    if n==3140: lines += ['', 'Parent follow-up: [fresh439b notebook UI save/reload and mobile smoke passed](latest-runtime.json). Original Helm/OIDC deployment behavior remains unverified.']
    lines += ['', 'Baseline/source evidence:','']+[f'- `{x}`' for x in r['evidence']]
(HERE/'REPORT.md').write_text('\n'.join(lines)+'\n')
category_dir=HERE/'categories';category_dir.mkdir(exist_ok=True)
for category in sorted({r['category'] for r in rows}):
    content=[f'# {category} — refreshed V2 verification','', '[Complete verification report](../REPORT.md)','', '| Issue | Disposition | Confidence | Verification |','| --- | --- | --- | --- |']
    for r in rows:
        if r['category']==category: content.append(f'| [#{r["number"]} — {r["title"].replace("|","/")}](../REPORT.md#issue-{r["number"]}) | {labels[r["status"]]} | {r["confidence"]} | {r["verification_outcome"]} |')
    (category_dir/f'{category}.md').write_text('\n'.join(content)+'\n')
print(json.dumps(dict(issues=len(rows),comments=comments,detailed_checks=len(checks),statuses=status,outcomes=outcomes),indent=2))
