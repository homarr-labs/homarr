#!/usr/bin/env python3
"""Verify signed remote artifact restoration in a disposable installed checkout."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import statistics
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--local', action='store_true', help='Verify local restoration without remote credentials')
args = parser.parse_args()
root = Path.cwd()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
credentials = ['TURBO_API', 'TURBO_TEAM', 'TURBO_TOKEN', 'TURBO_REMOTE_CACHE_SIGNATURE_KEY']
if not args.local and not all(os.environ.get(name) for name in credentials):
    parser.error('All four TURBO remote cache credentials are required')
env = dict(os.environ, CI='true', SKIP_ENV_VALIDATION='true', TURBO_TELEMETRY_DISABLED='1', NEXT_TELEMETRY_DISABLED='1')

# A simultaneous CI upload for the same inputs can legitimately have different
# Next profiling metadata or a random build ID. Verify our own uploaded bytes.
if not args.local:
    env['TURBO_TEAM'] += '-benchmark-' + os.environ.get('GITHUB_RUN_ID', str(time.time_ns()))

outputs = {
    '@homarr/nextjs#build': ['apps/nextjs/.next', 'apps/nextjs/next-env.d.ts'],
    '@homarr/nextjs#build:standalone': ['apps/nextjs/.next/standalone'],
    '@homarr/docs#build': ['apps/docs/.next', 'apps/docs/out', 'apps/docs/.source', 'apps/docs/next-env.d.ts'],
    '@homarr/cli#build': ['packages/cli/cli.cjs'],
    '@homarr/db#build': ['packages/db/migrations/sqlite/migrate.cjs', 'packages/db/migrations/postgresql/migrate.cjs'],
}


def fingerprint():
    result = {}
    for task, paths in outputs.items():
        digest = hashlib.sha256()
        count = size = 0
        for relative in paths:
            base = root / relative
            if not base.exists():
                raise RuntimeError(f'Missing build output: {relative}')
            files = sorted(base.rglob('*')) if base.is_dir() else [base]
            for path in files:
                name = path.relative_to(root).as_posix()
                if task == '@homarr/nextjs#build' and '/.next/standalone/' in name:
                    continue
                if '/.next/cache/' in name or '/.next/dev/' in name:
                    continue
                if path.is_symlink():
                    data = os.readlink(path).encode()
                elif path.is_file():
                    data = path.read_bytes()
                else:
                    continue
                digest.update(name.encode() + b'\0' + hashlib.sha256(data).digest())
                count += 1
                size += len(data)
        result[task] = {'sha256': digest.hexdigest(), 'files': count, 'bytes': size}
    return result


def remove_outputs():
    for paths in outputs.values():
        for relative in paths:
            path = root / relative
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink(missing_ok=True)


def sanitize(log):
    for name in credentials:
        value = os.environ.get(name)
        if value:
            log = log.replace(value, '***')
    return log


records = []
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
report = {'source': source, 'platform': env.get('TURBO_PLATFORM'), 'mode': 'local' if args.local else 'signed-remote', 'cacheNamespace': 'isolated-per-run', 'records': records}
try:
    with tempfile.TemporaryDirectory(prefix='homarr-turbo-remote-') as cache:
        filters = ['--filter=' + package for package in sorted({task.split('#')[0] for task in outputs})]
        command = ['bun', 'run', 'turbo', 'run', 'build', 'assemble:standalone', *filters, '--concurrency=2', '--summarize', '--output-logs=errors-only', '--cache-dir=' + cache]
        for phase in ['prime', 'local-restore', 'remote-restore-1', 'remote-restore-2', 'remote-restore-3']:
            if args.local and phase.startswith('remote'):
                continue
            if phase != 'prime':
                remove_outputs()
            policy = 'local:rw,remote:rw'
            if args.local or phase == 'local-restore':
                policy = 'local:rw'
            elif phase.startswith('remote'):
                policy = 'remote:r'
            if phase == 'prime':
                policy = 'local:w' if args.local else 'local:w,remote:w'
            start = time.monotonic()
            completed = subprocess.run(command + ['--cache=' + policy], env=env, text=True, capture_output=True)
            elapsed = time.monotonic() - start
            (out / (phase + '.log')).write_text(sanitize(completed.stdout + completed.stderr))
            if completed.returncode:
                raise RuntimeError(f'{phase} failed; see sanitized log')
            summary_file = max((root / '.turbo/runs').glob('*.json'), key=lambda p: p.stat().st_mtime_ns)
            summary = json.loads(summary_file.read_text())
            tasks = [{key: task.get(key) for key in ['taskId', 'hash', 'cache', 'execution']} for task in summary['tasks'] if task['taskId'] in outputs]
            artifact_sizes = {task['taskId']: sum(p.stat().st_size for p in Path(cache).glob(task['hash'] + '*.tar.zst')) for task in tasks}
            assembly = next((task.get('execution') for task in summary['tasks'] if task['taskId'] == '@homarr/nextjs#assemble:standalone'), None)
            record = {'phase': phase, 'elapsedSeconds': elapsed, 'tasks': tasks, 'assembly': assembly, 'archiveBytes': artifact_sizes, 'outputs': fingerprint()}
            records.append(record)
            if phase != 'prime':
                expected_source = 'REMOTE' if phase.startswith('remote') else 'LOCAL'
                if len(tasks) != len(outputs) or any(task['cache'].get('status') != 'HIT' or task['cache'].get('source') != expected_source for task in tasks):
                    raise RuntimeError(f'{phase}: expected five {expected_source} hits')
                if record['outputs'] != records[0]['outputs']:
                    raise RuntimeError(f'{phase}: restored outputs differ from the original build')
            print(json.dumps({'phase': phase, 'elapsedSeconds': elapsed, 'tasks': tasks, 'archiveBytes': artifact_sizes}), flush=True)
        remote = [r['elapsedSeconds'] for r in records if r['phase'].startswith('remote')]
        if remote:
            report['remoteRestoreMedianSeconds'] = statistics.median(remote)
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
