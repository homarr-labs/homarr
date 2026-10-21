#!/usr/bin/env python3
"""Measure one existing worker container from the host; no injected worker process."""
import argparse
import datetime
import json
import pathlib
import statistics
import subprocess
import time


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True)


def numbers(text):
    return {key: int(value) for key, value in (line.split() for line in text.splitlines())}


def memory_process(pid):
    directory = pathlib.Path('/proc') / str(pid)
    status = directory.joinpath('status').read_text()
    fields = {}
    for line in status.splitlines():
        if line.startswith(('Name:', 'Uid:', 'VmRSS:')):
            key, value = line.split(':', 1)
            fields[key] = value.strip()
    result = {'pid': pid, 'name': fields.get('Name'), 'uid': fields.get('Uid')}
    result['rssBytes'] = int(fields.get('VmRSS', '0 kB').split()[0]) * 1024
    result['pssBytes'] = None
    try:
        for line in directory.joinpath('smaps_rollup').read_text().splitlines():
            if line.startswith('Pss:'):
                result['pssBytes'] = int(line.split()[1]) * 1024
    except OSError:
        pass
    return result


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('container')
parser.add_argument('--phase', required=True)
parser.add_argument('--seconds', type=int, default=60)
parser.add_argument('--output', type=pathlib.Path, required=True)
args = parser.parse_args()
if args.output.exists():
    parser.error('Output already exists; choose a new path to preserve evidence')
if not 1 <= args.seconds <= 300:
    parser.error('--seconds must be 1..300')
info = json.loads(docker('inspect', args.container))[0]
if not info['State']['Running']:
    parser.error('Container must already be running')
image = json.loads(docker('image', 'inspect', info['Image']))[0]
pid = info['State']['Pid']
group = None
for line in pathlib.Path(f'/proc/{pid}/cgroup').read_text().splitlines():
    if line.startswith('0::'):
        group = pathlib.Path('/sys/fs/cgroup') / line.split('::', 1)[1].lstrip('/')
if group is None or not group.joinpath('memory.current').is_file():
    parser.error('This focused collector requires readable Linux cgroup v2 counters')
result = {
    'schemaVersion': 1, 'phase': args.phase,
    'container': args.container, 'imageId': info['Image'], 'imageBytes': image['Size'],
    'architecture': image['Architecture'],
    'requestedSeconds': args.seconds,
    'hostConfig': {key: info['HostConfig'].get(key) for key in ['Memory','MemorySwap','NanoCpus','PidsLimit']},
    'publishedPorts': info['NetworkSettings']['Ports'],
    'effectiveLimits': {name: group.joinpath(name).read_text().strip() for name in ['memory.max','memory.swap.max','cpu.max','pids.max']},
    'metricDefinitions': {
        'workingSetBytes': 'cgroup memory.current minus memory.stat inactive_file, matching Linux Docker CLI accounting',
        'rssBytes': 'Sum of resident process pages; includes shared pages and is not added to cgroup usage',
        'pssBytes': 'Sum of proportional process pages, null if any process cannot be read',
        'peak': 'Maximum sampled value in this phase, not guaranteed instantaneous maximum',
    },
    'samples': [], 'failure': None,
}
start = time.monotonic()
try:
    while True:
        current = int(group.joinpath('memory.current').read_text())
        stat = numbers(group.joinpath('memory.stat').read_text())
        cpu = numbers(group.joinpath('cpu.stat').read_text())
        pids = [int(value) for value in group.joinpath('cgroup.procs').read_text().split()]
        processes = []
        missing_pids = []
        for process in pids:
            try:
                processes.append(memory_process(process))
            except (FileNotFoundError, ProcessLookupError):
                missing_pids.append(process)
        rss = None
        if not missing_pids:
            rss = sum(process['rssBytes'] for process in processes)
        pss = None
        if processes and not missing_pids and all(process['pssBytes'] is not None for process in processes):
            pss = sum(process['pssBytes'] for process in processes)
        sample = {
            'unixMs': time.time() * 1000, 'elapsedSeconds': time.monotonic() - start,
            'cgroupCurrentBytes': current, 'inactiveFileBytes': stat['inactive_file'],
            'workingSetBytes': max(0, current - stat['inactive_file']),
            'rssBytes': rss, 'pssBytes': pss,
            'expectedPids': pids, 'missingPids': missing_pids,
            'cpuUsageUsec': cpu['usage_usec'],
            'swapBytes': int(group.joinpath('memory.swap.current').read_text()),
            'memoryStat': {key: stat.get(key) for key in ['anon','file','kernel','sock','shmem','pagetables','active_file','inactive_file']},
            'processes': processes,
        }
        result['samples'].append(sample)
        remaining = args.seconds - (time.monotonic() - start)
        if remaining <= 0:
            break
        time.sleep(min(1, remaining))
except BaseException as error:
    result['failure'] = type(error).__name__ + ': ' + str(error)
    raise
finally:
    result['memoryEvents'] = None
    try:
        result['memoryEvents'] = numbers(group.joinpath('memory.events').read_text())
    except OSError:
        pass
    result['endState'] = None
    result['restartCount'] = None
    try:
        end = json.loads(docker('inspect', args.container))[0]
        result['endState'] = {key: end['State'].get(key) for key in ['Running','OOMKilled','ExitCode']}
        result['restartCount'] = end['RestartCount']
    except subprocess.CalledProcessError:
        pass
    samples = result['samples']
    summary = {}
    for field in ['workingSetBytes','cgroupCurrentBytes','rssBytes','pssBytes']:
        values = [sample[field] for sample in samples if sample[field] is not None]
        if values:
            summary[field] = {'medianMiB': statistics.median(values)/1048576, 'minMiB': min(values)/1048576, 'maxMiB': max(values)/1048576}
        else:
            summary[field] = None
    if len(samples) > 1:
        summary['averageCpuCores'] = (samples[-1]['cpuUsageUsec'] - samples[0]['cpuUsageUsec'])/1000000/(samples[-1]['elapsedSeconds'] - samples[0]['elapsedSeconds'])
    result['summary'] = summary
    result['sampleCount'] = len(samples)
    result['finishedAtUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as stream:
        stream.write(json.dumps(result, indent=2)+'\n')
    print(json.dumps({'phase': args.phase, 'sampleCount': len(samples), 'failure': result['failure'], 'summary': summary}))
