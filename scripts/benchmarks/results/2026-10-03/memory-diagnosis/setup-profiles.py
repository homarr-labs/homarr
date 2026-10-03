from pathlib import Path
import subprocess,json,os
root=Path('/home/habs/.codex/worktrees/84a3/homarr');out=Path('/tmp/homarr-bun-memory-diagnosis');env={**os.environ,'DOCKER_HOST':'unix:///run/user/1000/docker.sock'}
probe=r'''const fs = require('node:fs');
const bun = !!process.versions.bun;
const started = Date.now();
const heapStats = bun ? require('bun:jsc').heapStats : null;
const v8 = bun ? null : require('node:v8');
const dump = (event) => {
 const data = {event,elapsedMs:Date.now()-started,pid:process.pid,engine:bun?'bun':'node',memory:process.memoryUsage(),heap:bun?heapStats():v8.getHeapStatistics()};
 console.log('[DEBUG-bun-memory]'+JSON.stringify(data));
};
let forced=false;
setInterval(()=>{
 if(!forced && fs.existsSync('/appdata/memory-gc-trigger')) {
  forced=true; dump('before-forced-gc');
  if(bun) Bun.gc(true); else global.gc();
  dump('after-forced-gc');
 }
 dump('sample');
},3000).unref();
dump('preload');
'''
images={'baseline':'sha256:4828b7cda6824059c8e3b3948a2028f678eb011dda8dfc9c34d39b5c794fe659','candidate':'sha256:7397ff992d374dd07d52ade59f1ccfc810a3e2bf934df9384e8cc547ee859148'}
records={}
for label,image in images.items():
 context=out/('profile-image-'+label);context.mkdir(exist_ok=True);context.joinpath('memory-probe.cjs').write_text(probe)
 with context.joinpath('original-run.sh').open('wb') as f:subprocess.run(['docker','run','--rm','--entrypoint','cat',image,'/app/run.sh'],stdout=f,env=env,check=True)
 content=context.joinpath('original-run.sh').read_text()
 if label=='baseline':content=content.replace('node apps/nextjs/server.js','node --expose-gc --require /app/memory-probe.cjs apps/nextjs/server.js')
 else:content=content.replace('bun apps/nextjs/server.js','bun --preload /app/memory-probe.cjs apps/nextjs/server.js')
 context.joinpath('run.sh').write_text(content)
 parent_tag=f'homarr:bun-memory-parent-{label}'; subprocess.run(['docker','tag',image,parent_tag],env=env,check=True)
 context.joinpath('Dockerfile').write_text(f'FROM {parent_tag}\nCOPY memory-probe.cjs /app/memory-probe.cjs\nCOPY run.sh /app/run.sh\nLABEL dev.homarr.memory-control="instrumented-default"\n')
 subprocess.run(['docker','build','-q','-t',f'homarr:bun-memory-profile-{label}',str(context)],env=env,check=True)
 inspect=json.loads(subprocess.check_output(['docker','image','inspect',f'homarr:bun-memory-profile-{label}'],env=env))[0]
 records[label]={'parent_image':image,'image':inspect['Id'],'labels':inspect['Config']['Labels']}
out.joinpath('profile-images.json').write_text(json.dumps(records,indent=2)+'\n')
# Temporary local profiler keeps the real fixture, then forces one GC after workload.
source=root.joinpath('scripts/benchmarks/docker-runtime.mts').read_text()
needle='  checkpoints.push(await captureCheckpointAsync(containerId, "workload"));'
assert source.count(needle)==1
source=source.replace(needle,needle+'\n  await execFileAsync("docker", ["exec", "--user", "1000", containerId, "touch", "/appdata/memory-gc-trigger"]);')
needle='  const containerLogs = await execFileAsync("docker", ["logs", containerId]);'
source=source.replace(needle,needle+'\n  await writeFile(path.join(outputDirectory, "heap-profile.jsonl"), containerLogs.stdout.split("\\n").filter((line) => line.includes("[DEBUG-bun-memory]")).map((line) => line.slice(line.indexOf("[DEBUG-bun-memory]") + "[DEBUG-bun-memory]".length)).join("\\n") + "\\n");')
root.joinpath('scripts/benchmarks/docker-runtime-memory-diagnostic.mts').write_text(source)
