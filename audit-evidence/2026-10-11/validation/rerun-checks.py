import os, pathlib, subprocess, json, time, socket, tempfile
root=pathlib.Path('/home/habs/.codex/worktrees/5fcf/homarr')
out=root/'audit-evidence/2026-10-11/validation'
env=dict(os.environ,NODE_ENV='development',DB_DRIVER='better-sqlite3',DB_URL=':memory:',SECRET_ENCRYPTION_KEY='0'*64)
for key in ['CI','DISABLE_REDIS_LOGS','REDIS_USERNAME','REDIS_PASSWORD','REDIS_TLS_CA']:
 env.pop(key,None)
def run(name,args):
 started=time.time();r=subprocess.run(args,cwd=root,env=env,capture_output=True,text=True,timeout=150)
 (out/(name+'.log')).write_text(r.stdout+r.stderr)
 item={'check':name,'args':args,'exit_code':r.returncode,'seconds':round(time.time()-started,3)}
 print(json.dumps(item),flush=True);return item
records=[]
with tempfile.TemporaryDirectory(prefix='homarr-audit-redis-') as tmp:
 with socket.socket() as port_probe:
  port_probe.bind(('127.0.0.1',0));port=port_probe.getsockname()[1]
 redis_log=open(pathlib.Path(tmp)/'redis.log','w')
 redis=subprocess.Popen(['redis-server','--bind','127.0.0.1','--port',str(port),'--dir',tmp,'--save','','--appendonly','no','--maxmemory','64mb','--maxmemory-policy','noeviction'],stdout=redis_log,stderr=subprocess.STDOUT)
 try:
  ready=False
  for _ in range(100):
   if redis.poll() is not None: raise RuntimeError('Owned temporary Redis exited before readiness')
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.1) as client:
     client.sendall(b'*1\r\n$4\r\nPING\r\n');ready=client.recv(64).startswith(b'+PONG')
    if ready: break
   except OSError: pass
   time.sleep(.02)
  if not ready: raise RuntimeError('Owned temporary Redis did not become ready')
  env.update(REDIS_IS_EXTERNAL='true',REDIS_HOST='127.0.0.1',REDIS_PORT=str(port),REDIS_DATABASE_INDEX='0')
  records.append(run('focused-existing-rerun',['mise','exec','--','node','node_modules/vitest/vitest.mjs','run','--project','api-node','--project','auth-ldap-node','--project','custom-widgets-node','--maxWorkers','2','packages/api/src/router/test/integration/integration-router.spec.ts','packages/auth/providers/test/ldap-authorization.spec.ts','packages/auth/providers/test/ldap-client.spec.ts','packages/custom-widgets/src/test/server-policy.spec.ts']))
 finally:
  redis.terminate()
  try: redis.wait(timeout=5)
  except subprocess.TimeoutExpired: redis.kill();redis.wait()
  redis_log.close()
  records.append({'check':'owned-redis-cleanup','exit_code':0,'pid':redis.pid,'port':port,'exit':redis.returncode,'persistence_disabled':True,'directory_removed_on_exit':True})
  print('Owned temporary Redis stopped.',flush=True)
records.append(run('lint-final',['mise','exec','--','bun','x','--no-install','oxlint',*[p for p in subprocess.check_output(['git','diff','--name-only','origin/dev...HEAD'],cwd=root,text=True).splitlines() if p.endswith(('.ts','.tsx','.mjs'))]]))
records.append(run('format-final',['mise','exec','--','bun','x','--no-install','oxfmt','--check',*[p for p in subprocess.check_output(['git','diff','--name-only','origin/dev...HEAD'],cwd=root,text=True).splitlines() if p.endswith(('.ts','.tsx','.mjs','.json'))]]))
records.append(run('catalog-parity-final',['mise','exec','--','node','--import','tsx','audit-evidence/2026-10-11/compare-runtime-projection.mts']))
records.append(run('typecheck-auth-final',['mise','exec','--','bun','run','--filter','@homarr/auth','typecheck']))
(out/'rerun-results.json').write_text(json.dumps(records,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in records))
