import subprocess, pathlib, json, time, os, concurrent.futures
root=pathlib.Path('/home/habs/.codex/worktrees/5fcf/homarr')
out=root/'audit-evidence/2026-10-11/validation'
changed=subprocess.check_output(['git','diff','--name-only','origin/dev...HEAD'],cwd=root,text=True).splitlines()
source=[p for p in changed if p.endswith(('.ts','.tsx','.mjs'))]
fmt=[p for p in changed if p.endswith(('.ts','.tsx','.mjs','.json'))]
tests=[
 'packages/api/src/router/test/integration/integration-router.spec.ts',
 'packages/auth/permissions/test/integration-query-permissions.spec.ts',
 'packages/auth/providers/test/ldap-authorization.spec.ts',
 'packages/auth/providers/test/ldap-client.spec.ts',
 'packages/custom-widgets/src/test/component-registry.spec.ts',
 'packages/custom-widgets/src/test/component-catalog.spec.ts',
 'packages/custom-widgets/src/test/jsx-policy.spec.ts',
 'packages/custom-widgets/src/test/runtime.spec.tsx',
 'packages/custom-widgets/src/test/request-deadline.spec.ts',
 'packages/custom-widgets/src/test/server-policy.spec.ts',
]
for p in tests: assert (root/p).is_file(),p
jobs=[
 ('format', ['mise','exec','--','bun','x','--no-install','oxfmt','--check',*fmt]),
 ('lint', ['mise','exec','--','bun','x','--no-install','oxlint',*source]),
 ('architecture', ['mise','exec','--','node','packages/custom-widgets/scripts/check-architecture.mjs']),
 ('catalog-parity', ['mise','exec','--','node','--import','tsx','audit-evidence/2026-10-11/compare-runtime-projection.ts']),
 ('typecheck-api', ['mise','exec','--','bun','run','--filter','@homarr/api','typecheck']),
 ('typecheck-auth', ['mise','exec','--','bun','run','--filter','@homarr/auth','typecheck']),
 ('typecheck-custom-widgets', ['mise','exec','--','bun','run','--filter','@homarr/custom-widgets','typecheck']),
 ('typecheck-nextjs', ['mise','exec','--','bun','run','--filter','@homarr/nextjs','typecheck']),
 ('focused-existing-tests', ['mise','exec','--','node','node_modules/vitest/vitest.mjs','run','--project','api-node','--project','auth-ldap-node','--project','custom-widgets-node','--project','dom','--maxWorkers','2',*tests]),
]
env=dict(os.environ,CI='true',NODE_ENV='development',DB_DRIVER='better-sqlite3',DB_URL=':memory:',SECRET_ENCRYPTION_KEY='0'*64)
def run(job):
 name,args=job;start=time.time()
 r=subprocess.run(args,cwd=root,env=env,capture_output=True,text=True)
 (out/(name+'.log')).write_text(r.stdout+r.stderr)
 record={'check':name,'args':args,'exit_code':r.returncode,'seconds':round(time.time()-start,3)}
 print(json.dumps(record),flush=True)
 return record
# Measurements are finished. Limit validation to two concurrent processes.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 records=list(pool.map(run,jobs))
(out/'results.json').write_text(json.dumps(records,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in records))
