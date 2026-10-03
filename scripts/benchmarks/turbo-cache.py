#!/usr/bin/env python3
"""Measure real Turbo cache invalidation and compiled-artifact restoration."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', type=Path, default=Path.cwd())
parser.add_argument('--baseline-ref', default='139f6dd201eab63fd7b3812e312d6c1d32e5da82')
parser.add_argument('--turbo', type=Path)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = args.repo.resolve()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, CI='true', SKIP_ENV_VALIDATION='true')
turbo = args.turbo or root / 'node_modules/.bin/turbo'
command = [str(turbo.resolve()), 'run']

def hashes():
    completed = subprocess.run(command + ['lint', 'format', 'typecheck', 'build', '--filter=@homarr/common', '--filter=@homarr/nextjs', '--filter=@homarr/docs', '--filter=@homarr/cli', '--dry=json'], cwd=root, env=env, text=True, capture_output=True, check=True)
    return {task['taskId']: task['hash'] for task in json.loads(completed.stdout)['tasks']}

configs = ['turbo.json', 'apps/nextjs/turbo.json', 'apps/docs/turbo.json', 'packages/cli/turbo.json', 'packages/db/turbo.json']
saved_configs = {file: (root / file).read_bytes() if (root / file).exists() else None for file in configs}
checks = [
    ('package.json', '@homarr/nextjs#build', 'version', True),
    ('packages/core/src/infrastructure/db/env.ts', '@homarr/cli#build', 'source', True),
    ('packages/core/src/infrastructure/db/env.ts', '@homarr/db#build', 'source', True),
    ('tooling/typescript/base.json', '@homarr/cli#build', 'compiler', True),
    ('packages/core/src/infrastructure/db/env.ts', '@homarr/common#typecheck', 'source', True),
    ('tooling/typescript/base.json', '@homarr/common#typecheck', 'compiler', True),
    ('.oxlintrc.json', '@homarr/common#lint', 'newline', True),
    ('.oxfmtrc.json', '@homarr/common#format', 'newline', True),
    ('static-data/contributors.json', '@homarr/nextjs#build', 'newline', True),
    ('tools/motion-reel/three/lab-types.ts', '@homarr/docs#build', 'newline', True),
    ('static-data/contributors.json', '@homarr/cli#build', 'newline', False),
    ('packages/core/src/cache-invalidation-probe.spec.tsx', '@homarr/nextjs#build', 'test', False),
]

def restore(path, content):
    if content is None:
        path.unlink(missing_ok=True)
    else:
        path.write_bytes(content)

try:
    for stage in ['before', 'after']:
        for file, content in saved_configs.items():
            if stage == 'before':
                completed = subprocess.run(['git', 'show', f'{args.baseline_ref}:{file}'], cwd=root, capture_output=True)
                content = completed.stdout if completed.returncode == 0 else None
            restore(root / file, content)
        before = hashes()
        records = []
        for file, task, mode, expected in checks:
            path = root / file
            original = path.read_bytes() if path.exists() else None
            if mode == 'test' and original is not None:
                raise RuntimeError(f'Refusing to replace existing probe file: {path}')
            try:
                if mode == 'source':
                    path.write_bytes(original + b'\nexport const turboCacheProbe: true = true;\n')
                elif mode == 'compiler':
                    data = json.loads(original)
                    data['compilerOptions']['noPropertyAccessFromIndexSignature'] = True
                    path.write_text(json.dumps(data, indent=2) + '\n')
                elif mode == 'version':
                    data = json.loads(original)
                    data['version'] = '0.0.0-cache-probe'
                    path.write_text(json.dumps(data, indent=2) + '\n')
                elif mode == 'test':
                    path.write_text('export const ignoredBuildTest = true;\n')
                else:
                    path.write_bytes(original + b'\n')
                after = hashes()
                records.append({'input': file, 'task': task, 'expectedInvalidation': expected, 'actualInvalidation': before[task] != after[task], 'beforeHash': before[task], 'afterHash': after[task]})
            finally:
                restore(path, original)
        (out / f'invalidation-{stage}.json').write_text(json.dumps(records, indent=2) + '\n')
        if stage == 'after' and not all(record['expectedInvalidation'] == record['actualInvalidation'] for record in records):
            raise RuntimeError('Cache invalidation failed')
finally:
    for file, content in saved_configs.items():
        restore(root / file, content)

artifacts = ['packages/cli/cli.cjs', 'packages/db/migrations/sqlite/migrate.cjs', 'packages/db/migrations/postgresql/migrate.cjs']
saved_artifacts = {file: (root / file).read_bytes() if (root / file).exists() else None for file in artifacts}
records = []
try:
    with tempfile.TemporaryDirectory(prefix='homarr-turbo-cache-') as cache:
        for phase in ['cold', 'warm', 'restore']:
            if phase == 'restore':
                for file in artifacts:
                    (root / file).unlink()
            start = time.monotonic()
            completed = subprocess.run(command + ['build', '--filter=@homarr/cli', '--filter=@homarr/db', '--cache=local:rw', '--cache-dir=' + cache, '--summarize'], cwd=root, env=env, text=True, capture_output=True)
            elapsed = time.monotonic() - start
            (out / f'artifacts-{phase}.log').write_text(completed.stdout + completed.stderr)
            if completed.returncode:
                raise RuntimeError(f'{phase} build failed, see saved log')
            summary_path = max((root / '.turbo/runs').glob('*.json'), key=lambda path: path.stat().st_mtime_ns)
            summary = json.loads(summary_path.read_text())
            tasks = [{'taskId': task['taskId'], 'hash': task['hash'], 'cache': task.get('cache'), 'execution': task.get('execution')} for task in summary['tasks'] if task.get('command')]
            records.append({'phase': phase, 'elapsedSeconds': elapsed, 'tasks': tasks, 'artifacts': {file: {'sha256': hashlib.sha256((root / file).read_bytes()).hexdigest(), 'bytes': (root / file).stat().st_size} for file in artifacts}})
        if not all(record['artifacts'] == records[0]['artifacts'] for record in records):
            raise RuntimeError('Restored artifacts differ')
        for record in records[1:]:
            if not record['tasks'] or not all(task['cache']['status'] == 'HIT' for task in record['tasks']):
                raise RuntimeError(f"Expected all real builds cached in {record['phase']}")
        if not all(task['cache']['status'] == 'MISS' for task in records[0]['tasks']):
            raise RuntimeError('Cold build unexpectedly cached')
finally:
    for file, content in saved_artifacts.items():
        restore(root / file, content)
    (out / 'artifact-restoration.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps({'invalidation': 'PASS', 'artifactRestoration': 'PASS', 'records': records}, indent=2))
