import os,json,subprocess
from pathlib import Path
root=Path('/home/habs/.codex/worktrees/84a3/homarr');out=Path('/tmp/homarr-bun-memory-diagnosis');env={**os.environ,'DOCKER_HOST':'unix:///run/user/1000/docker.sock'}
context=out/'serial-jit-image';context.mkdir(exist_ok=True);context.joinpath('Dockerfile').write_text('FROM homarr:bun-memory-parent-candidate\nENV BUN_JSC_useConcurrentJIT=0\nLABEL dev.homarr.memory-control="serial-jit"\n')
subprocess.run(['docker','build','-q','-t','homarr:bun-memory-serial-jit',str(context)],env=env,check=True)
records=[]
for label,image in [('no-preload','homarr:bun-memory-no-preload'),('serial-jit','homarr:bun-memory-serial-jit')]:
 inspect=json.loads(subprocess.check_output(['docker','image','inspect',image],env=env))[0];record={'label':label,'image':inspect['Id'],'parent_image':'sha256:7397ff992d374dd07d52ade59f1ccfc810a3e2bf934df9384e8cc547ee859148','source':'diagnostic runtime configuration only','settle_ms':120000};records.append(record)
 out.joinpath('controls.json').write_text(json.dumps(records,indent=2)+'\n')
 dest=root/'benchmark-results/bun-memory-diagnosis'/label
 probe={**env,'RUNTIME_BENCHMARK_PROXY_IMAGE':'sha256:4828b7cda6824059c8e3b3948a2028f678eb011dda8dfc9c34d39b5c794fe659','RUNTIME_BENCHMARK_IMAGE':inspect['Id'],'RUNTIME_BENCHMARK_SHA':inspect['Config']['Labels']['org.opencontainers.image.revision'],'RUNTIME_BENCHMARK_SOURCE_FINGERPRINT':inspect['Config']['Labels']['dev.homarr.source-fingerprint'],'RUNTIME_BENCHMARK_SETTLE_MS':'120000','RUNTIME_BENCHMARK_SAMPLE_INTERVAL_MS':'10000','RUNTIME_BENCHMARK_PAGE_ITERATIONS':'20','RUNTIME_BENCHMARK_LCP_OBSERVATION_MS':'5000','RUNTIME_BENCHMARK_INTERACTION_ITERATIONS':'7','RUNTIME_BENCHMARK_REQUIRE_READY_MARKERS':'true','RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_POLICY':'preload-only','RUNTIME_BENCHMARK_WIDGET_KINDS':'clock,countdown,downloads,notebook,healthMonitoring,systemResources,systemDisks,bookmarks','RUNTIME_BENCHMARK_OUTPUT_DIR':str(dest)}
 with out.joinpath(label+'.log').open('w') as log:proc=subprocess.run(['/tmp/homarr-bun/bin/bun','scripts/benchmarks/docker-runtime.mts'],cwd=root,env=probe,stdout=log,stderr=subprocess.STDOUT)
 record['exit_code']=proc.returncode;out.joinpath('controls.json').write_text(json.dumps(records,indent=2)+'\n')
 print(label,'completed',proc.returncode,flush=True)
 if proc.returncode:raise SystemExit(proc.returncode)
