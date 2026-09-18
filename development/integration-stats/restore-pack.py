#!/usr/bin/env python3
"""Verify and restore this private snapshot into local bind directories; never overwrite existing data."""
import hashlib,json,pathlib,subprocess,sys,tarfile
root=pathlib.Path(__file__).resolve().parent
checks=json.loads((root/'checksums.json').read_text())
for relative,expected in checks.items():
 path=root/relative
 if not path.resolve().is_relative_to(root):sys.exit('Unsafe checksum path')
 digest=hashlib.sha256()
 with path.open('rb') as source:
  for chunk in iter(lambda:source.read(1024*1024),b''):digest.update(chunk)
 if digest.hexdigest()!=expected:sys.exit('Checksum mismatch: '+relative)
print('All checksums verified.')
for relative,mode in json.loads((root/'config-modes.json').read_text()).items():
 path=root/relative
 if not path.resolve().is_relative_to(root/'config'):sys.exit('Unsafe configuration path')
 path.chmod(mode)
if (root/'data').exists() or (root/'homarr/source').exists():sys.exit('Refusing to overwrite existing data/source directories. Extract the pack into a fresh directory.')
records=json.loads((root/'backup-manifest.json').read_text())
for record in records:
 destination=root/record['destination'];archive=root/record['archive']
 if not destination.resolve().is_relative_to(root/'data') or not archive.resolve().is_relative_to(root/'archives'):sys.exit('Unsafe manifest path')
 with tarfile.open(archive,'r:gz') as tar:
  for member in tar:
   path=pathlib.PurePosixPath(member.name)
   if path.is_absolute() or '..' in path.parts:sys.exit('Unsafe archive member: '+member.name)
config=json.loads((root/'compose.json').read_text());helper=config['services']['homarr-cache']['image']
subprocess.run(['docker','pull','--platform','linux/amd64',helper],check=True)
(root/'data').mkdir(mode=0o700)
for i,record in enumerate(records,1):
 destination=root/record['destination'];destination.mkdir(mode=0o700)
 with (root/record['archive']).open('rb') as archive:
  subprocess.run(['docker','run','--rm','-i','--read-only','--network','none','--platform','linux/amd64','--entrypoint','tar','--mount',f'type=bind,src={destination},dst=/restore',helper,'xzf','-','-C','/restore'],stdin=archive,check=True)
 print(f'Restored {i}/{len(records)}: {record["key"]}',flush=True)
source=root/'homarr/source';source.mkdir()
with tarfile.open(root/'homarr/source.tar.gz','r:gz') as tar:tar.extractall(source,filter='data')
print('Restored all data as local binds with original ownership/modes. Follow README.md to start.')
