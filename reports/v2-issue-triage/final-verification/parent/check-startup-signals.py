import json,subprocess,time, pathlib
root=pathlib.Path.cwd();out=root/'reports/v2-issue-triage/final-verification/parent';image='homarr:v2-issue-triage-439b2082'
def docker(*args):return subprocess.check_output(['docker',*args],text=True).strip()
results=[]
for mode,code in [('slow','console.log("FIXTURE_MIGRATION_STARTED"); setInterval(()=>{},1000);'),('failed','process.exit(23);')]:
 name='homarr-triage-signals-'+mode
 fixture=out/f'migration-{mode}.cjs';fixture.write_text(code+'\n')
 docker('create','--name',name,'--label','homarr.triage=final-verification','--cpus','1','--memory','512m',image)
 try:
  docker('cp',str(root/'scripts/run.sh'),name+':/app/run.sh')
  docker('cp',str(fixture),name+':/app/db/migrations/sqlite/migrate.cjs')
  docker('start',name)
  start=time.monotonic()
  while time.monotonic()-start<10:
   logs=docker('logs',name)
   if 'FIXTURE_MIGRATION_STARTED' in logs or docker('inspect','--format','{{.State.Running}}',name)=='false':break
   time.sleep(.1)
  if mode=='slow':
   assert 'FIXTURE_MIGRATION_STARTED' in logs
   started=time.monotonic();docker('stop','--time','3',name);elapsed=time.monotonic()-started
  else:elapsed=time.monotonic()-start
  state=json.loads(docker('inspect',name))[0]['State'];logs=docker('logs',name)
  expected=0 if mode=='slow' else 1
  assert state['ExitCode']==expected,(mode,state,logs)
  if mode=='slow':assert elapsed<3 and 'Shutdown complete.' in logs
  else:assert 'DB migrations failed' in logs and 'Starting internal Redis' not in logs
  results.append({'mode':mode,'seconds':elapsed,'exit_code':state['ExitCode'],'logs':logs})
 finally:docker('rm','-f','-v',name)
(out/'startup-signals.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
