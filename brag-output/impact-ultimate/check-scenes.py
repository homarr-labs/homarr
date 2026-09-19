from pathlib import Path
import subprocess,concurrent.futures
r=Path(__file__).parent
scenes={'intro':'0,2,5','workshop':'1,3,6','custom':'1,5,7.5,10','statistics':'1,3,5','integrations':'1,4,7','assistant':'1,4,7','header':'1,3,6','ending':'0.5,1.5,3.5'}
def check(item):
 name,at=item
 with (r/f'{name}-check.log').open('w') as log:
  p=subprocess.run(['node','/home/habs/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/dist/cli.js','check',str(r/name),'--at',at,'--snapshots'],stdout=log,stderr=subprocess.STDOUT)
 return name,p.returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(check,scenes.items()))
print(results,flush=True)
if any(code for _,code in results):raise SystemExit(1)
