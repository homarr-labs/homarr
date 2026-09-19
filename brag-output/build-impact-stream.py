from pathlib import Path
import json,re,shutil,html
R=Path(__file__).resolve().parent;S=R/'impact-fade';O=R/'impact-stream';O.mkdir(exist_ok=True)
for name in ['intro','workshop']:
 p=O/name;p.mkdir(exist_ok=True)
 for f in ['index.html','hyperframes.json','package.json']:shutil.copy(S/name/f,p/f)
 if not(p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
for name in ['widgets','ending','integrations','custom','assistant','statistics','header']:
 p=O/name
 if not p.exists():p.symlink_to('../impact-fade/'+name,target_is_directory=True)
for name in ['score.wav','sound-cues.json']:
 if not(O/name).exists():(O/name).symlink_to('../impact-fade/'+name)
for name in ['storyboard.json','opening-integrations.json']:shutil.copy(S/name,O/name)
p=O/'intro/index.html';s=p.read_text()
s=s.replace("Let's talk about Homarr v2",'Announcing Homarr v2').replace("Let's talk",'Announcing')
s=s.replace('<div class="line-mask"><div class="line line-two" data-layout-allow-overlap>about</div></div>','')
s=re.sub(r"tl.fromTo\('\.line-two'.*?;\n",'',s)
s=s.replace('left:72px;top:197px','left:72px;top:314px')
s=s.replace('z-index:30;background:#141418;overflow:hidden','z-index:30;overflow:hidden')
s=s.replace('.integration-field{position:absolute;inset:0;z-index:30;overflow:hidden}', '.integration-field{position:absolute;inset:0;z-index:30;overflow:hidden}.integration-backdrop{position:absolute;inset:0;background:#141418;z-index:0}')
s=s.replace('top:0;width:206px;display:flex','top:0;width:240px;padding:0 17px;display:flex')
xs=json.loads((O/'opening-integrations.json').read_text());field='<div class="integration-field" data-layout-allow-occlusion data-layout-allow-overlap><div class="integration-backdrop" data-layout-allow-occlusion></div>'
phases=[14,83,39,112,58,128,25,99];ends=[6.2,6.5,5.9,6.4,6.1,6.6,6.3,6.0]
for col in range(8):
 items=xs[col::8]
 if col%2:items=items+[items[0]]
 else:items=[items[-1]]+items
 height=len(items)*136-16
 initial=-phases[col];target=-height-24
 if col%2:initial=1080-height+phases[col];target=1104
 field+=f'<div class="integration-column column-{col}" style="left:{col*240}px" data-initial="{initial}" data-target="{target}" data-exit-seconds="{ends[col]}" data-layout-allow-overflow data-layout-allow-occlusion data-layout-allow-overlap>'
 for x in items:field+=f'<div class="all-item"><img src="{x["asset"]}" alt=""><span data-layout-allow-overlap>{html.escape(x["name"])}</span></div>'
 field+='</div>'
field+='</div>'
a=s.index('<div class="integration-field');b=s.index('<div class="wipe">',a);s=s[:a]+field+s[b:]
a=s.index("Array.from(document.querySelectorAll('.integration-column'))");b=s.index("window.__timelines['workshop-intro']=tl;",a)
s=s[:a]+"""tl.fromTo('.integration-backdrop',{opacity:1},{opacity:0,duration:1,ease:'sine.inOut'},3);
Array.from(document.querySelectorAll('.integration-column')).forEach(column=>{tl.fromTo(column,{y:Number(column.dataset.initial)},{y:Number(column.dataset.target),duration:Number(column.dataset.exitSeconds),ease:'none'},0);});
"""+s[b:];p.write_text(s)
p=O/'workshop/index.html';s=p.read_text().replace('Publish and install Custom Widgets and Custom CSS. Update community submissions.','Finally a way to share your custom CSS with the community.');p.write_text(s)
for f in ['check-scenes.py','render-scenes.py']:
 s=(S/f).read_text()
 if f=='check-scenes.py':s=re.sub(r'scenes=\{.*?\}',"scenes={'intro':'0,1.5,3,4.5,6,6.7,8','workshop':'0.5,2,5'}",s)
 else:s=s.replace("names=['intro','widgets','ending']","names=['intro','workshop']")
 (O/f).write_text(s)
s=(S/'finish.py').read_text();a=s.index('segments=');b=s.index('\nassert',a)
s=s[:a]+"segments=[('intro-silent.mp4',0,9),('workshop-silent.mp4',0,7),('../impact-direct/impact.mp4',16,3460/60),('../impact-fade/widgets-silent.mp4',0,8),('../impact-direct/impact.mp4',4900/60,24),('../impact-fade/ending-silent.mp4',0,7)]"+s[b:]
s=s.replace("(5.4,'intro-fade.jpg')","(4.5,'intro-exit.jpg'),(12,'workshop.jpg')")
(O/'finish.py').write_text(s)
s=(S/'index.html').read_text().replace('?v=14','?v=17').replace('../impact-direct/','../impact-fade/')
s=s.replace('then fade out.','then run out of items and clear the top or bottom of the screen.').replace('The opening fades out instead of opening to the sides.','The finite columns exit vertically without fading. The title reads Announcing Homarr v2. Workshop explains sharing custom CSS with the community.')
(O/'index.html').write_text(s)
print('Built finite column revision')
