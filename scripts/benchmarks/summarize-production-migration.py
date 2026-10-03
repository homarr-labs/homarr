#!/usr/bin/env python3
"""Summarize independent containers without treating correlated samples as trials."""
import argparse
import json
from pathlib import Path
from statistics import median


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest')
    parser.add_argument('--output')
    args = parser.parse_args()
    source = Path(args.manifest).resolve()
    manifest = json.loads(source.read_text())

    def result(entry):
        path = Path(entry['result'])
        if not path.is_absolute():
            path = source.parent / path
        return json.loads(path.read_text())

    builds = {label: [(entry, result(entry)) for entry in manifest['builds'] if entry['label'] == label and entry['exit_code'] == 0] for label in ['baseline', 'candidate']}
    runtimes = {label: [result(entry) for entry in manifest['runtimes'] if entry['label'] == label and entry['exit_code'] == 0 and entry['result']] for label in ['baseline', 'candidate']}
    lines = ['## Production benchmark', '', f"Baseline `{manifest['revisions']['baseline']}`; candidate `{manifest['revisions']['candidate']}`.",
             '', 'Dedicated builders; cold warmups followed by balanced warm source changes. Cold build timings have one observation per image. Warm rebuilds have two observations per image.',
             '', '| Build metric | Baseline seconds (range) | Candidate seconds (range) |', '|---|---:|---:|']

    def display(values):
        values = [value for value in values if value is not None]
        if not values:
            return '—'
        return f'{median(values):.2f} ({min(values):.2f}–{max(values):.2f}; n={len(values)})'

    for phase, title in [('warmup', 'Cold image build'), ('source-change', 'Warm source rebuild')]:
        values = [[build['build']['wallTimeMs'] / 1000 for entry, build in builds[label] if entry['phase'] == phase] for label in ['baseline', 'candidate']]
        lines.append(f'| {title} | {display(values[0])} | {display(values[1])} |')
        totals = [[entry['wall_seconds'] for entry, build in builds[label] if entry['phase'] == phase] for label in ['baseline', 'candidate']]
        lines.append(f'| {title}: full harness command | {display(totals[0])} | {display(totals[1])} |')
        values = [[build['build']['nextCompileMs'] / 1000 for entry, build in builds[label] if entry['phase'] == phase and build['build']['nextCompileMs'] is not None] for label in ['baseline', 'candidate']]
        lines.append(f'| {title}: Next compile | {display(values[0])} | {display(values[1])} |')
    lines += ['', 'Three fresh containers per image, two CPUs and 1 GiB each, UID/GID 1000. Every run loads the same eight-widget seeded board in 20 fresh authenticated browser contexts, checks widget data, opens search seven times, exercises four management routes and WebSockets, then samples for ten minutes. Browser and excluded ingress proxy traffic are isolated from external providers.',
              '', 'Page figures are medians of each container’s page-sample median, with the range across containers. Memory, startup and cold-search values are descriptive observations from independent containers. The 20 settle samples within each container are correlated; they are not 20 independent memory trials.',
              '', '| Runtime metric | Baseline median (range) | Candidate median (range) |', '|---|---:|---:|']
    metrics = [
        ('Start to ready, seconds', lambda r: r['workload']['startToReadyMs'] / 1000),
        ('Board mounted, ms', lambda r: median(p['boardMountedMs'] for p in r['workload']['pageLoadSamples'])),
        ('TTFB, ms', lambda r: median(p['ttfbMs'] for p in r['workload']['pageLoadSamples'])),
        ('FCP, ms', lambda r: median(p['fcpMs'] for p in r['workload']['pageLoadSamples'])),
        ('LCP, ms', lambda r: median(p['lcpMs'] for p in r['workload']['pageLoadSamples'])),
        ('Widget implementations mounted, ms', lambda r: median(p['widgetImplementationsMountedMs'] for p in r['workload']['pageLoadSamples'])),
        ('Widget data settled, ms', lambda r: median(p['widgetDataSettledMs'] for p in r['workload']['pageLoadSamples'])),
        ('Cold search ready, ms', lambda r: r['workload']['coldSpotlightReadyMs']),
        ('Warm search open, ms', lambda r: median(r['workload']['warmInteractionSamplesMs'])),
        ('WebSocket readiness, ms', lambda r: r['workload']['websocketReadyMs']),
        ('Startup cgroup memory, MiB', lambda r: r['summary']['startupBytes'] / 2**20),
        ('Workload cgroup memory, MiB', lambda r: r['summary']['workloadBytes'] / 2**20),
        ('Settle median cgroup memory, MiB', lambda r: r['summary']['settle']['medianBytes'] / 2**20),
        ('Settle minimum cgroup memory, MiB', lambda r: r['summary']['settle']['minBytes'] / 2**20),
        ('Settle p95 cgroup memory, MiB', lambda r: r['summary']['settle']['p95Bytes'] / 2**20),
        ('Settle maximum cgroup memory, MiB', lambda r: r['summary']['settle']['maxBytes'] / 2**20),
        ('Cgroup peak memory, MiB', lambda r: r['summary']['peakBytes'] / 2**20),
        ('Settle anonymous memory, MiB', lambda r: r['summary']['settle']['anonymous']['medianBytes'] / 2**20),
        ('Settle file memory, MiB', lambda r: r['summary']['settle']['file']['medianBytes'] / 2**20),
        ('Startup-to-workload CPU, seconds', lambda r: r['summary']['cpu']['startupToWorkload']['usageUsec'] / 1e6),
        ('Ten-minute settle CPU, seconds', lambda r: r['summary']['cpu']['workloadToSettled']['usageUsec'] / 1e6),
        ('Workload-to-settle CPU throttling, seconds', lambda r: r['summary']['cpu']['workloadToSettled']['throttledUsec'] / 1e6),
    ]

    def settle_process_pss(runtime, name):
        checkpoints = [c for c in runtime['checkpoints'] if c['name'].startswith('settle-')]
        groups = [[p for p in c['processes'] if name in p['command'] or (name == 'next-server' and p['command'] == 'bun')] for c in checkpoints]
        if any(not group or any(p['pssBytes'] == 0 and p['rssBytes'] > 0 for p in group) for group in groups):
            return None
        return median(sum(p['pssBytes'] for p in group) for group in groups) / 2**20

    def settle_memory_change(runtime):
        checkpoints = [c for c in runtime['checkpoints'] if c['name'].startswith('settle-')]
        return (checkpoints[-1]['container']['currentBytes'] - checkpoints[0]['container']['currentBytes']) / 2**20

    metrics.append(('First-to-last settle memory change, MiB', settle_memory_change))
    metrics.append(('Final Redis allocator used memory, MiB', lambda r: r['checkpoints'][-1]['redis']['usedMemoryBytes'] / 2**20))

    for name in ['next-server', 'redis-server', 'nginx']:
        title = 'Settle application-server PSS, MiB' if name == 'next-server' else f'Settle {name} PSS, MiB'
        metrics.append((title, lambda r, name=name: settle_process_pss(r, name)))
    for title, metric in metrics:
        values = [[metric(runtime) for runtime in runtimes[label]] for label in ['baseline', 'candidate']]
        lines.append(f'| {title} | {display(values[0])} | {display(values[1])} |')
    for route in ['/manage', '/manage/apps', '/manage/integrations', '/manage/settings']:
        values = [[next(r['durationMs'] for r in runtime['workload']['routeTimings'] if r['path'] == route) for runtime in runtimes[label]] for label in ['baseline', 'candidate']]
        lines.append(f'| {route} route navigation, ms | {display(values[0])} | {display(values[1])} |')
    lines += ['', '| Validation | Baseline | Candidate |', '|---|---:|---:|']
    for title, metric in [('Claim-eligible runtime runs', lambda r: int(r['claimEligible'])), ('Fresh dashboard loads', lambda r: len(r['workload']['pageLoadSamples'])), ('Settle checkpoints', lambda r: r['workload']['settleSampleCount']), ('Widget errors', lambda r: r['workload']['widgetErrorCount'])]:
        values = [sum(metric(r) for r in runtimes[label]) for label in ['baseline', 'candidate']]
        lines.append(f'| {title} | {values[0]} | {values[1]} |')
    lines += ['', 'These compare complete migrations, including different dependency graphs and base-image packages. They do not isolate the JavaScript engine. Unreadable process PSS is omitted, never interpreted as zero memory. Cold builds and runtime diagnostics are not claims of statistical significance. Eligibility and raw per-run data remain authoritative.', '']
    text = '\n'.join(lines)
    if args.output:
        Path(args.output).write_text(text)
    else:
        print(text)


if __name__ == '__main__':
    main()
