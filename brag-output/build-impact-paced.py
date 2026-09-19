from pathlib import Path
import shutil,re,json
R=Path(__file__).resolve().parent; old=R/'impact-workshop'; out=R/'impact-paced';out.mkdir(exist_ok=True)
for scene in ['intro','assistant']:
 p=out/scene;p.mkdir(exist_ok=True)
 for f in ['package.json','hyperframes.json']:shutil.copy(old/scene/f,p/f)
 if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
 s=(old/scene/'index.html').read_text().replace('55 INTEGRATIONS','87 INTEGRATIONS').replace('<p>A social experiment, powered by the Homarr provider.</p>','')
 (p/'index.html').write_text(s)
for scene in ['workshop','integrations','custom','widgets','statistics','ending']:
 p=out/scene
 if not p.exists():p.symlink_to('../impact-workshop/'+scene,target_is_directory=True)
def retime(t):
 if t<46:return t
 if t<56:return 46+(t-46)/1.5
 return t-10/3
chapters=[[retime(t),label] for t,label in json.loads((old/'storyboard.json').read_text())]
(out/'storyboard.json').write_text(json.dumps(chapters,indent=2))
s=(old/'index.html').read_text().replace('120 seconds','117 seconds').replace('?v=11','?v=12').replace('../impact-create/','../impact-workshop/')
s=re.sub(r'<div><button.*?</div>','<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{label}</button>' for t,label in chapters)+'</div>',s)
s=s.replace('The intro marquee shows a slower selection from the 55-integration catalog.','The intro count includes the 55 existing integrations and 32 additions: 87 total. The marquee shows a selection. Drag-and-drop and Cmd-click demonstration chapters run at 1.5×; their sound cues follow the new timing.')
(out/'index.html').write_text(s)
for filename in ['check-scenes.py','render-scenes.py']:
 s=(old/filename).read_text()
 if filename=='check-scenes.py':s=re.sub(r"scenes=\{.*?\}","scenes={'intro':'0,3,6','assistant':'1,4,8'}",s)
 else:s=re.sub(r"names=\[.*?\]","names=['intro','assistant']",s)
 (out/filename).write_text(s)
s=(old/'mix-music.py').read_text().replace('duration=120;n=rate*duration','duration=7000/60;n=round(rate*duration)')
start=s.index('cues=[]');end=s.index('for cue in cues:')
s=s[:start]+'''cues=[]
for item in json.loads((R/'impact-workshop/sound-cues.json').read_text()):
 item=dict(item);t=item['time']
 if 46<=t<56:t=46+(t-46)/1.5
 elif t>=56:t-=10/3
 item['time']=t;cues.append(item)
'''+s[end:]
s=s.replace("filters='[0:a]atrim=duration=120","filters=f'[0:a]atrim=duration={duration}").replace('st=116:d=4','st={duration-4}:d=4').replace('st=119.3:d=0.7','st={duration-.7}:d=0.7').replace("'TIKS accents for 120 seconds.'","'TIKS accents for',duration,'seconds.'")
(out/'mix-music.py').write_text(s)
s=(old/'verify.cjs').read_text().replace('/impact-workshop/','/impact-paced/').replace('|more data for custom widgets/i','|more data for custom widgets|social experiment/i').replace('result.duration!==120','Math.abs(result.duration-7000/60)>.05')
s=s.replace("['New widgets',77,2500],['Statistics',85,2500],['Customized header',97,3600],['Workshop · Merch',111,4500]","['New drag-and-drop',48,2400],['Cmd-click multi-select',51,2600],['New widgets',74,2500],['Statistics',82,2500],['Customized header',94,3600],['Workshop · Merch',108,4500]")
s=s.replace("await p.screenshot({path:__dirname+'/intro-first-browser.png'});","if(!(await p.locator('.integrations-heading').innerText()).startsWith('87 INTEGRATIONS'))throw Error('Wrong total integration count');\nawait p.screenshot({path:__dirname+'/intro-first-browser.png'});")
(out/'verify.cjs').write_text(s)
print('Created 87-integration / 1.5x revision:',out)
