import os,subprocess,json,time
from pathlib import Path
root=Path('/tmp/homarr-turbo-cache-pr');out=root/'benchmark-results/turbo-cache/docker';out.mkdir(parents=True,exist_ok=True);env=dict(os.environ,DOCKER_HOST='unix:///run/user/1000/docker.sock');builder='homarr-turbo-validation-20261003'
# Task-owned builder already created by setup.
probe=root/'development/turbo-cache-probe.txt';source=root/'apps/nextjs/src/app/[locale]/layout.tsx';original=source.read_bytes();records=[]
try:
 for phase in ['cold','copy-only','app-source']:
  if phase=='copy-only':probe.write_text('Task-owned COPY invalidation probe; no application input change.\n')
  if phase=='app-source':source.write_bytes(original+b'\n')
  cmd=['docker','buildx','build','--builder',builder,'--load','--progress=plain','--platform=linux/amd64','--tag','homarr:turbo-cache-'+phase,str(root)]
  start=time.monotonic()
  with (out/f'{phase}.log').open('w') as log:p=subprocess.run(cmd,env=env,stdout=log,stderr=subprocess.STDOUT)
  record={'phase':phase,'exitCode':p.returncode,'elapsedSeconds':time.monotonic()-start,'command':cmd};records.append(record);(out/'builds.json').write_text(json.dumps(records,indent=2)+'\n');print(record,flush=True)
  if p.returncode:raise SystemExit(p.returncode)
finally:
 probe.unlink(missing_ok=True);source.write_bytes(original)
context=Path('/tmp/homarr-turbo-cache-size');context.mkdir(exist_ok=True)
(context/'Dockerfile').write_text('FROM node:24.18.0-alpine\nRUN --mount=type=cache,id=homarr-turbo-linux/amd64,target=/cache,sharing=locked du -sk /cache && du -k /cache/*.tar.zst\n')
with (out/'cache-size.log').open('w') as log:subprocess.run(['docker','buildx','build','--builder',builder,'--progress=plain',str(context)],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
print('Docker cache controls complete',flush=True)
