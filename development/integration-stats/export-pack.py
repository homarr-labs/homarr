#!/usr/bin/env python3
"""Cold-export the isolated stats Compose project to a portable bind-mount ZIP staging directory.

Credentials and data are written only to the supplied private destination, never Git.
Run after validators and dashboard seeding finish. Requires Docker and redis-cli.
"""
import argparse, concurrent.futures, hashlib, json, os, pathlib, shutil, sqlite3, subprocess, tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination', type=pathlib.Path)
parser.add_argument('--database', type=pathlib.Path, required=True)
parser.add_argument('--environment', type=pathlib.Path, required=True)
parser.add_argument('--project', default='homarr-stats-live')
parser.add_argument('--redis-port', type=int, default=16388)
args = parser.parse_args()
os.umask(0o077)
root = args.destination.resolve()
root.mkdir(mode=0o700, parents=True, exist_ok=False)
for part in ['archives','config','homarr','private']:(root/part).mkdir()
def run(command):return subprocess.check_output(command, text=True)
ids=run(['docker','ps','-aq','--filter',f'label=com.docker.compose.project={args.project}']).split()
if not ids:raise RuntimeError('No task containers found')
containers=json.loads(run(['docker','inspect',*ids]))
config={'name':'homarr-stats-pack','services':{},'networks':{'default':{},'stats':{}}}
records=[]
config_modes={}
# These services keep application data in writable image layers in the original harness.
layer_paths={'caddy':['/config/caddy','/data/caddy'], 'netdata':['/etc/netdata','/var/lib/netdata','/var/cache/netdata','/var/log/netdata']}
image_cache={}
for c in containers:
 service=c['Config']['Labels']['com.docker.compose.service']
 image=c['Image']
 if image not in image_cache:image_cache[image]=json.loads(run(['docker','image','inspect',image]))[0]
 digests=image_cache[image]['RepoDigests'];pinned=digests[0] if digests else c['Config']['Image']
 # Resolve a generic amd64 child manifest when the local image is CPU-variant specific.
 if image_cache[image].get('Variant'):
  manifests=json.loads(run(['docker','manifest','inspect','--verbose',pinned]))
  if isinstance(manifests,list):
   for candidate in manifests:
    descriptor=candidate['Descriptor'];platform=descriptor.get('platform',{})
    if platform.get('os')=='linux' and platform.get('architecture')=='amd64' and not platform.get('variant'):
     pinned=pinned.split('@')[0]+'@'+descriptor['digest'];break
 spec={'image':pinned,'platform':'linux/amd64','environment':{},'volumes':[],'restart':'unless-stopped'}
 for entry in c['Config']['Env']:
  key,_,value=entry.partition('=');spec['environment'][key]=value.replace('$','$$')
 for key,field in [('command','Cmd'),('entrypoint','Entrypoint'),('user','User'),('working_dir','WorkingDir')]:
  if c['Config'].get(field):
   value=c['Config'][field]
   if isinstance(value,list):value=[part.replace('$','$$') for part in value]
   elif isinstance(value,str):value=value.replace('$','$$')
   spec[key]=value
 ports=[]
 for port,bindings in (c['HostConfig']['PortBindings'] or {}).items():
  target,protocol=port.split('/')
  for binding in bindings or []:ports.append({'target':int(target),'published':binding['HostPort'],'host_ip':'127.0.0.1','protocol':protocol})
 if ports:spec['ports']=ports
 spec['networks']={}
 for name,network in c['NetworkSettings']['Networks'].items():
  network_key='default'
  if name==args.project:network_key='stats'
  spec['networks'][network_key]={'aliases':list(dict.fromkeys([service,*(network.get('Aliases') or [])]))}
 for key,field in [('shm_size','ShmSize'),('cap_add','CapAdd'),('cap_drop','CapDrop'),('security_opt','SecurityOpt')]:
  if c['HostConfig'].get(field):spec[key]=c['HostConfig'][field]
 health=c['Config'].get('Healthcheck')
 if health:
  spec['healthcheck']={'test':[part.replace('$','$$') for part in health['Test']]}
  for name in ['Interval','Timeout','StartPeriod','StartInterval']:
   if health.get(name):
    snake={'StartPeriod':'start_period','StartInterval':'start_interval'}.get(name,name.lower())
    spec['healthcheck'][snake]=f'{health[name]}ns'
  if health.get('Retries'):spec['healthcheck']['retries']=health['Retries']
 if c['HostConfig'].get('Tmpfs'):spec['tmpfs']=[path+':'+options for path,options in c['HostConfig']['Tmpfs'].items()]
 if c['HostConfig'].get('ReadonlyRootfs'):spec['read_only']=True
 mounts=list(c['Mounts'])
 for target in layer_paths.get(service,[]):
  if not any(m['Destination']==target for m in mounts):mounts.append({'Type':'layer','Destination':target,'RW':True})
 for index,mount in enumerate(mounts):
  if mount['Type']=='tmpfs':continue
  key=f'{service}-{index}'
  target=mount['Destination']
  if mount['Type']=='bind' and pathlib.Path(mount['Source']).is_file():
   relative=f'config/{key}-{pathlib.Path(mount["Source"]).name}'
   shutil.copy2(mount['Source'],root/relative)
   config_modes[relative]=(root/relative).stat().st_mode & 0o777
  else:
   relative=f'data/{key}'
   record={'key':key,'service':service,'target':target,'archive':f'archives/{key}.tar.gz','destination':relative,'type':mount['Type'],'container':c['Id']}
   if mount['Type']=='volume':record['source']=mount['Name']
   if mount['Type']=='bind':record['source']=mount['Source']
   records.append(record)
  spec['volumes'].append({'type':'bind','source':'./'+relative,'target':target,'read_only':not mount['RW'],'bind':{'create_host_path':False}})
 config['services'][service]=spec
# Preserve explicit dependency/health ordering from Compose source configs when available.
for c in containers:
 service=c['Config']['Labels']['com.docker.compose.service']
 raw=c['Config']['Labels'].get('com.docker.compose.depends_on','')
 dependencies={}
 for item in filter(None,raw.split(',')):
  pieces=item.split(':');name=pieces[0]
  if name in config['services']:dependencies[name]={'condition':pieces[1] if len(pieces)>1 else 'service_started'}
 if dependencies:config['services'][service]['depends_on']=dependencies
config['services']['homarr-cache']={'image':'redis:7-alpine','platform':'linux/amd64','ports':[{'target':6379,'published':str(args.redis_port),'host_ip':'127.0.0.1'}],'volumes':[{'type':'bind','source':'./data/homarr-cache','target':'/data','bind':{'create_host_path':False}}]}
helper=json.loads(run(['docker','image','inspect','redis:7-alpine']))[0]['RepoDigests'][0]
config['services']['homarr-cache']['image']=helper
running=[c['Id'] for c in containers if c['State']['Running']]
def export(record):
 if record['type']=='redis':return
 destination=root/record['archive']
 with destination.open('wb') as output:
  if record['type'] in ['bind','volume']:
   mount=f'type={record["type"]},src={record["source"]},dst=/source,readonly'
   subprocess.run(['docker','run','--rm','--network','none','--entrypoint','tar','--mount',mount,helper,'czf','-','-C','/source','.'],stdout=output,stderr=subprocess.PIPE,check=True)
  else:
   copy=subprocess.Popen(['docker','cp',record['container']+':'+record['target']+'/.','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   result=subprocess.run(['gzip','-1'],stdin=copy.stdout,stdout=output,stderr=subprocess.PIPE)
   copy.stdout.close();error=copy.stderr.read();code=copy.wait()
   if code or result.returncode:raise RuntimeError('Layer export failed: '+record['key'])
 subprocess.run(['gzip','-t',str(destination)],check=True)
try:
 subprocess.run(['docker','stop','--time','30',*running],check=True,stdout=subprocess.DEVNULL)
 # Homarr must be stopped by the caller during this export window.
 cache=root/'private/cache-export';cache.mkdir()
 subprocess.run(['redis-cli','-h','127.0.0.1','-p',str(args.redis_port),'--rdb',str(cache/'dump.rdb')],check=True,stdout=subprocess.DEVNULL)
 with tarfile.open(root/'archives/homarr-cache.tar.gz','w:gz') as tar:tar.add(cache/'dump.rdb',arcname='dump.rdb')
 shutil.rmtree(cache)
 records.append({'key':'homarr-cache','archive':'archives/homarr-cache.tar.gz','destination':'data/homarr-cache','type':'redis'})
 with sqlite3.connect(args.database) as source,sqlite3.connect(root/'homarr/db.sqlite') as destination:
  source.backup(destination)
  if destination.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('SQLite integrity check failed')
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(export,records))
finally:
 subprocess.run(['docker','start',*running],check=True,stdout=subprocess.DEVNULL)
shutil.copyfile(args.environment,root/'private/homarr.env')
# Export the actual tracked + nonignored source tree, including the recovered validation harness.
files=run(['git','ls-files','--cached','--others','--exclude-standard','-z']).split('\0')
with tarfile.open(root/'homarr/source.tar.gz','w:gz') as archive:
 for path in dict.fromkeys(filter(None,files)):
  if pathlib.Path(path).is_file():archive.add(path,arcname=path,recursive=False)
(root/'config-modes.json').write_text(json.dumps(config_modes,indent=2)+'\n')
(root/'compose.json').write_text(json.dumps(config,indent=2)+'\n')
# Remove machine-local source identifiers from the public restore manifest.
for r in records:
 for key in ['source','container','target']:r.pop(key,None)
(root/'backup-manifest.json').write_text(json.dumps(records,indent=2)+'\n')
shutil.copyfile(pathlib.Path(__file__).with_name('restore-pack.py'),root/'restore.py')
print(f'Exported {len(config["services"])} services and {len(records)} data archives to {root}')
