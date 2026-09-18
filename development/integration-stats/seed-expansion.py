#!/usr/bin/env python3
"""Append connected, validated expansion widgets without changing existing dashboard items."""
import argparse,json,pathlib,sqlite3,time
p=argparse.ArgumentParser(description=__doc__);p.add_argument('database',type=pathlib.Path);p.add_argument('results',type=pathlib.Path);a=p.parse_args()
c=sqlite3.connect(a.database,timeout=30);c.row_factory=sqlite3.Row
catalog={}
for path in a.results.glob('next-*-results.json'):
 for r in json.loads(path.read_text()):
  if r.get('success'):catalog[r['kind']]=r
expected={'sonarr','radarr','lidarr','autobrr','jackett','jellystat','komga','tubearchivist','scrutiny','frigate','netalertx'}
if expected-catalog.keys():p.error('Not validated: '+', '.join(sorted(expected-catalog.keys())))
board=c.execute('SELECT id FROM board WHERE name=?',('dashboard',)).fetchone()['id'];section=c.execute("SELECT id FROM section WHERE board_id=? AND kind='empty'",(board,)).fetchone()['id']
layouts=c.execute('SELECT * FROM layout WHERE board_id=?',(board,)).fetchall()
backup=a.database.with_suffix('.before-expansion-'+str(int(time.time()))+'.sqlite');backup.touch(mode=0o600)
with sqlite3.connect(backup) as target:c.backup(target)
def stats(slug,kinds,width,height,x,y,table=False,rows=False):
 entries=[]
 for kind in kinds:
  source=catalog[kind]
  for metric in source['metrics']:
   entries.append(dict(id=slug+'-'+kind+'-'+metric['key'],integrationId=source['integrationId'],metric=metric['key'],label='',compact=True,hidden=False))
 return (slug,'stats',width,height,x,y,dict(entries=entries,table=table,rows=rows,plain=False,showIcon=True,spacing='xs'),[catalog[k]['integrationId'] for k in kinds])
items=[stats('new-services',sorted(expected-{'sonarr','radarr','lidarr'}),6,3,0,0,table=True),stats('library',['sonarr','radarr','lidarr'],4,3,6,0,rows=True),stats('media',['jellystat','komga','tubearchivist'],6,2,0,3),('jackett','indexerManager',4,2,6,3,dict(openIndexerSiteInNewTab=True),[catalog['jackett']['integrationId']])]
with c:
 c.execute('BEGIN IMMEDIATE')
 for row in c.execute("SELECT id FROM item WHERE board_id=? AND id LIKE 'stats-expansion-%'",(board,)).fetchall():
  for table in ['item_layout','integration_item']:c.execute(f'DELETE FROM {table} WHERE item_id=?',(row['id'],))
  c.execute('DELETE FROM item WHERE id=?',(row['id'],))
 for slug,kind,w,h,x,y,options,ids in items:
  item='stats-expansion-'+slug
  c.execute('INSERT INTO item (id,board_id,kind,options,advanced_options) VALUES (?,?,?,?,?)',(item,board,kind,json.dumps({'json':options}),json.dumps({'json':{'title':'','customCssClasses':[],'borderColor':''}})))
  for integration in ids:c.execute('INSERT INTO integration_item (item_id,integration_id) VALUES (?,?)',(item,integration))
 for layout in layouts:
  start=c.execute('SELECT COALESCE(MAX(y_offset+height),0) FROM item_layout WHERE layout_id=? AND section_id=?',(layout['id'],section)).fetchone()[0]
  for slug,kind,w,h,x,y,options,ids in items:
   px,py,pw=x,start+y,w
   if layout['column_count']<10:px,py,pw=0,start,min(w,layout['column_count']);start+=h
   c.execute('INSERT INTO item_layout VALUES (?,?,?,?,?,?,?)',('stats-expansion-'+slug,section,layout['id'],px,py,pw,h))
print('Appended',len(items),'real expansion widgets; preserved existing dashboard. Backup:',backup)
