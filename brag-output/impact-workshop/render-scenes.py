from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess
R=Path(__file__).resolve().parent
cli='/home/habs/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/dist/cli.js'
names=['integrations','assistant','widgets','statistics','ending']
def render(name):
 with (R/f'{name}-render.log').open('w') as f:
  p=subprocess.run(['node',cli,'render',str(R/name),'--fps','60','--quality','delivery','--workers','3','--output',str(R/f'{name}-silent.mp4')],stdout=f,stderr=subprocess.STDOUT)
 print(name,p.returncode,flush=True)
 return p.returncode
with ThreadPoolExecutor(max_workers=2) as pool: codes=list(pool.map(render,names))
raise SystemExit(any(codes))
