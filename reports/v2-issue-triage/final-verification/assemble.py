import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent
BASE = ROOT.parent
load = lambda p: json.loads(p.read_text())
baseline = load(BASE / 'verification/assessments.json')
pending = load(ROOT / 'pending.json')
followups = []
for area in ['auth', 'integrations', 'browser']:
    rows = load(ROOT / area / 'results.json')
    for row in rows:
        row['artifact'] = f'{area}/results.json'
    followups.extend(rows)
proxy_path = ROOT / 'integrations/proxy-4766.json'
if proxy_path.exists():
    proxy = load(proxy_path)
    proxy['artifact'] = 'integrations/proxy-4766.json'
    followups = [proxy if r['number'] == 4766 else r for r in followups]
expected = {x['number'] for x in pending}
assert len(followups) == 20 and {x['number'] for x in followups} == expected
assert not any('pending-provider' in r['outcome'] for r in followups)
by_id = {x['number']: x for x in followups}
rows = []
for original in baseline:
    r = dict(original)
    r['previous_status'] = r['status']
    r['implementation_coverage'] = 'none-established'
    if r['status'] == 'addressed-in-v2':
        r['status'] = 'addressed'
        r['implementation_coverage'] = 'full'
    elif r['status'] == 'partially-addressed':
        r['status'] = 'addressed'
        r['implementation_coverage'] = 'partial'
    if r['number'] in by_id:
        f = by_id[r['number']]
        r['final_verification'] = f
        proposed = f['suggested_status']
        # Partial runtime coverage is not a demonstrated partial implementation fix.
        if r['number'] in [6438, 6271]:
            r['status'] = 'needs-verification'
            r['classification_note'] = 'Controlled subset passed; no causal fix for the reported memory failure was established. Agent partial describes test coverage, not a resolved requirement.'
        elif proposed in ['addressed-in-v2', 'addressed-in-pending-parent-fix', 'addressed']:
            r['status'] = 'addressed'
            r['implementation_coverage'] = 'full'
        elif proposed in ['partially-addressed', 'partial']:
            r['status'] = 'addressed'
            r['implementation_coverage'] = 'partial'
        elif proposed in ['needs-verification', 'not-addressed']:
            r['status'] = proposed
        else:
            raise ValueError((r['number'], proposed))
        r['summary'] = ' '.join(f['checks'][-2:])
        r['verification_outcome'] = f['outcome']
        r['remaining'] = '\n'.join(f.get('remaining', []))
        r['confidence'] = f['confidence']
    if r['number'] == 4738:
        r['status'] = 'needs-verification'
        r['implementation_coverage'] = 'none-established'
        r['classification_note'] = 'The reporter explicitly says a fresh board already worked in the affected old release; only one existing board failed. Fresh-board persistence does not resolve that failure.'
    if r['number'] == 4406:
        r['implementation_coverage'] = 'partial'
        r['confidence'] = 'medium'
        r['classification_note'] = 'Code-flow configuration path verified; original Cloudflare profile/claim failure was not reproduced.'
    if r['number'] == 6850 and r['status'] == 'addressed':
        r['requires_local_fixes'] = True
    if r['number'] == 6559:
        r['status'] = 'addressed'
        r['implementation_coverage'] = 'full'
        r['requires_local_fixes'] = True
        r['remaining'] = 'Local pagination fix must land in release/v2. Provider-capped historical releases remain unavailable; ordinary API errors still propagate. Five new regression cases plus nine existing tests passed.'
    if r['number'] == 4965:
        r['requires_local_fixes'] = True
    if r['number'] == 962:
        r.update(status='addressed', implementation_coverage='partial', requires_local_fixes=True, confidence='high')
        r['summary'] = 'Local V2 fix separates nested settings menus by depth, wraps them in narrow containers, and keeps collapsed menus on their card. Four menu targets passed browser hit testing in mobile/desktop fixtures.'
        r['remaining'] = 'At one column and four nested levels, ancestor collapse controls can cover the center of the deepest expand button. Settings menus work, but the whole collapse-control layout is not fully resolved. One-row, one-column, four-level menus remain overlapping; all four stay inside their cards after the final bounds refinement. Original migrated board was unavailable.'
        r['final_verification'] = {'artifact':'parent/REVIEW.md', 'checks':['Production candidate: wide mobile/desktop and one-column mobile plus collapsed mobile/desktop settings controls all 4/4 within-card and correctly hit-tested.', 'Deepest collapsed settings menu opens Edit item with Title Depth 3.'], 'outcome':'partial implementation verified'}
    if r['number'] == 3675:
        r['requires_local_fixes'] = True
        r['summary'] += ' Local fix installs signal traps before migrations and tracks the migration child: SIGTERM during migration exits cleanly in 0.205 seconds; failed migration aborts startup; final ready runtime exits cleanly in 0.666 seconds.'
        r['remaining'] = 'Docker fixtures passed; the original Podman/deployment and pathological child processes that ignore SIGTERM were not exercised.'
    rows.append(r)
assert len(rows) == 136 and len({r['number'] for r in rows}) == 136
(ROOT/'assessments.json').write_text(json.dumps(rows, indent=2)+'\n')
counts = Counter(r['status'] for r in rows)
addressed = [r for r in rows if r['status']=='addressed']
partial = [r for r in addressed if r['implementation_coverage']=='partial']
def link(r): return f"[#{r['number']}](https://github.com/homarr-labs/homarr/issues/{r['number']})"
def clean(s): return str(s).replace('|','\\|').replace('\n',' ')
def table(items):
    return '\n'.join(['| Issue | Category | Disposition | Coverage | Confidence |','|---|---|---|---|---|']+[f"| {link(r)} {clean(r['title'])} | {r['category']} | {r['status']} | {r['implementation_coverage']} | {r['confidence']} |" for r in items])
def details(r):
    text = f"\n## {link(r)} — {r['title']}\n\n**{r['status']} · {r['implementation_coverage']} · confidence: {r['confidence']}**\n\n{r['summary']}\n"
    if r.get('conversation'): text += f"\nConversation: {r['conversation']}\n"
    if r.get('classification_note'): text += f"\nParent reconciliation: {r['classification_note']}\n"
    if r.get('remaining'): text += f"\nRemaining limits: {r['remaining']}\n"
    if r.get('requires_local_fixes'): text += '\n**Requires the local fixes to land in release/v2 before claiming this release resolution.**\n'
    f = r.get('final_verification')
    if f:
        text += '\nChecks:\n\n' + '\n'.join('- '+str(c) for c in f.get('checks',[]))+'\n'
        text += f"\nEvidence: [{f['artifact']}]({f['artifact']}).\n"
    else:
        text += f"\nInherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #{r['number']}.\n"
    return text
header = f'''# V2 final issue verification — 18 September 2026

**{counts['addressed']} addressed (including {len(partial)} partial implementations), {counts['not-addressed']} not addressed, {counts['needs-verification']} still require original-environment verification.**

All **20/20** previously unresolved verification cases received an additional investigation. The complete backlog snapshot remains **136 issues / 448 comments**; this is not a claim that all 136 were runtime tested or that all 20 were reproduced in their original environments. Full conversations and source classifications remain linked through the previous report.

The worktree is based on freshly fetched `origin/release/v2` at `439b208283c2e80dd399fcb2a83e1661bb0c099f`, plus twelve local changed/new source/test files. Final production image: `homarr:v2-triage-verified-bounds`, `sha256:d576f31095aa85ccae02180fd86390c5ab749b7b3fbc76dce56a9bf60fa23c28`. [Source hashes and validation](parent/candidate-sources.json) distinguish this candidate from the unmodified V2 image used by several agents. No dev banner was used as V2 evidence.

Per the requested reporting convention, partial implementations count as **addressed**, with remaining requirements retained below. Partial test coverage or a failed reproduction does not itself establish a partial implementation fix. In particular, short synthetic memory/reconnect checks do not resolve the production OOM or TrueNAS host-memory reports.

[All 20 follow-ups](20-VERIFICATIONS.md) · [Fix review](parent/REVIEW.md) · [PR description draft](PR-DESCRIPTION.md) · [Closing list](CLOSING-ISSUES.md) · [Coverage](COVERAGE.md)

## Fixes and validation

- Nested container settings menus: depth-aware placement, narrow wrapping, collapsed-card positioning. Remaining expand-control overlap is explicitly retained.
- LDAP: preserve escaped/percent DN values, escape filter values, request the configured group lookup attribute.
- GitHub releases: retain fetched pages when the subsequent page hits GitHub's explicit 1000-result cap; ordinary API errors remain errors.
- OIDC logout: suppress the competing session-cache document reload while preserving cache invalidation and old-session subtree removal.
- Startup shutdown: install traps before migrations and terminate the tracked migration child; failed migrations still abort startup.
- **30 focused tests passed** (13 LDAP, 14 release-provider, 3 session-scope); auth, request-handler and Next.js typechecks passed. Focused lint had zero errors and existing warnings. Production build and diff whitespace check passed.
- Pre-logout-fix candidate browser menu checks (before the final minimum-size bounds refinement) passed for wide mobile/desktop, narrow mobile, and collapsed narrow mobile/desktop. Four settings targets were on-card and correctly hit-tested in each. Deepest collapsed Edit opened the correct item. A failed expand-center click is retained as a limitation, not a passing assertion. On the final image, tall narrow mobile/desktop controls remained 4/4 reachable; all four minimum-size menus stayed on-card but the deepest two overlapped. See parent/menu-results.json.
- Migration SIGTERM exited cleanly in 0.205 s; the final ready image exited cleanly in 0.666 s. These Docker checks do not certify every Podman/environment variant.

## Every issue

'''
(ROOT/'REPORT.md').write_text(header+table(rows)+'\n'+''.join(details(r) for r in rows))
(ROOT/'20-VERIFICATIONS.md').write_text('# All 20 additional verifications\n\nEvery assigned case is included once. A completed verification attempt may still require unavailable provider, device, payload, or endurance evidence.\n\n'+table([r for r in rows if r['number'] in expected])+'\n'+''.join(details(r) for r in rows if r['number'] in expected))
(ROOT/'categories').mkdir(exist_ok=True)
for cat in sorted({r['category'] for r in rows}):
    selected=[r for r in rows if r['category']==cat]
    # Category documents use the central report for correctly rooted evidence links.
    (ROOT/'categories'/f'{cat}.md').write_text(f'# {cat}\n\n'+table(selected)+'\n\nDetailed conversations, evidence and limits: [complete report](../REPORT.md).\n')
closing='\n'.join(f"Closes #{r['number']}" for r in sorted(addressed,key=lambda r:r['number'],reverse=True))
(ROOT/'CLOSING-ISSUES.md').write_text(f'# Proposed closing list\n\n{len(addressed)} addressed issues, including {len(partial)} partial implementations under the requested convention. See PR-PUBLISHING-NOTES.md before using.\n\n'+closing+'\n')
pr = load(ROOT/'release-pr-before.json')
appendix = f'''\n\n## V2 issue triage — 18 September 2026

Reviewed all 136 open issues and 448 comments in the captured backlog. All 20 cases previously marked as needing verification received an additional investigation against release/v2 `439b20828` or its local fixed candidate.

{len(addressed)} issues are addressed, including {len(partial)} partial implementations. Partial means V2 delivers part of the request; the remaining limitations are listed below. {counts['not-addressed']} are not addressed and {counts['needs-verification']} remain unverified in their original environments.

Validation: production build, 30 focused LDAP/release-provider/session-scope tests, three package/app typechecks, controlled provider fixtures, nested-container browser checks, and migration/ready-state shutdown checks. Synthetic upstreams and a 51-second memory soak do not certify real-provider or long-term memory behavior.

### Addressed issues

'''+table(addressed)+'''\n\n### Remaining requirements on addressed issues

'''+ '\n'.join(f"- #{r['number']}: {clean(r['remaining'])}" for r in addressed if r.get('remaining'))+'''\n\n### Still open / not claimed as fixed

'''+ '\n'.join(f"- #{r['number']} — {r['status']}: {clean(r['title'])}" for r in rows if r['status']!='addressed')+'''\n\n### Close with this release

'''+closing+'\n'
(ROOT/'PR-DESCRIPTION.md').write_text(pr['body'].rstrip()+appendix)
(ROOT/'PR-PUBLISHING-NOTES.md').write_text('''# Publishing prerequisites

This is a local draft. No issue, PR, label, comment or branch on GitHub was modified.

1. Land the local fixes in release/v2 and run the required CI checks before publishing their resolution claims. The draft intentionally describes the completed local candidate, not the current remote branch alone.
2. PR #6545 currently targets `feat/onboarding-rebuild`; the repository default branch is `dev`. Retarget the release PR to `dev` before relying on its closing keywords. No retarget was performed.
3. The draft preserves the existing PR description verbatim, then appends the triage. Its older dated release checklist is historical and has not been re-certified by this issue audit.
4. Each addressed issue has its own closing keyword, including partial implementations as explicitly requested. The remaining requirements stay visible. Unverified and unaddressed issues have no new closing keywords.

GitHub interprets these keywords when the PR targets the default branch: [official closing-keyword documentation](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).
''')
(ROOT/'COVERAGE.md').write_text(f'''# Coverage

- Backlog: 136 unique issues, 448 comments, inherited from [conversation manifest](../verification/conversation-manifest.json); original bodies and paginated comments are in ../source/ and refreshed snapshots in ../verification/.
- New verification: 20 unique assignments; 20 results; no missing or duplicate IDs.
- IDs: {', '.join(str(n) for n in sorted(expected))}.
- Classification: {dict(counts)}; {len(partial)} partial implementations are included in addressed.
- Initial assignments: auth 4, integrations 6, browser 10; Luna/max runtime agents. A subsequent controlled TLS-proxy retest replaces the initial #4766 blocked result without adding a duplicate issue. Earlier complete conversation review used five Luna/max reviewers in waves.
- Product candidate: twelve source/test hashes match the built candidate; source and image identity are in parent/candidate-sources.json.
- All Markdown categories and closing keywords are generated from the same 136-row final assessments.json.
- No GitHub mutations. Local fixes are uncommitted and not yet part of origin/release/v2.
''')
print(json.dumps({'counts':dict(counts),'partial':len(partial),'followups':len(followups),'pr_body_characters':len((ROOT/'PR-DESCRIPTION.md').read_text())},indent=2))
