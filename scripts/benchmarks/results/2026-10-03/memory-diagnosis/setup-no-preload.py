import os,subprocess,json
from pathlib import Path
out=Path('/tmp/homarr-bun-memory-diagnosis/no-preload-image');out.mkdir(exist_ok=True);env={**os.environ,'DOCKER_HOST':'unix:///run/user/1000/docker.sock'}
image='sha256:7397ff992d374dd07d52ade59f1ccfc810a3e2bf934df9384e8cc547ee859148'
raw=subprocess.check_output(['docker','run','--rm','--entrypoint','cat',image,'/app/apps/nextjs/server.js'],env=env)
needle=b'"preloadEntriesOnStart":true';assert raw.count(needle)==1
out.joinpath('server.js').write_bytes(raw.replace(needle,b'"preloadEntriesOnStart":false'))
out.joinpath('Dockerfile').write_text('FROM homarr:bun-memory-parent-candidate\nCOPY server.js /app/apps/nextjs/server.js\nLABEL dev.homarr.memory-control="no-preload-runtime-config"\n')
subprocess.run(['docker','build','-q','-t','homarr:bun-memory-no-preload',str(out)],env=env,check=True)
inspect=json.loads(subprocess.check_output(['docker','image','inspect','homarr:bun-memory-no-preload'],env=env))[0];out.joinpath('control.json').write_text(json.dumps({'parent_image':image,'image':inspect['Id'],'method':'One serialized Next standalone runtime configuration boolean changed from preloadEntriesOnStart=true to false. Uninstrumented runtime. Diagnostic control, not a source rebuild.','labels':inspect['Config']['Labels']},indent=2)+'\n')
