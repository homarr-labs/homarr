from pathlib import Path
import json,re,shutil,html
R=Path(__file__).resolve().parent;O=R/'impact-direct';O.mkdir(exist_ok=True)
scenes=['intro','workshop','integrations','custom','assistant','statistics','header','ending']
for name in scenes:
 source=R/'impact-workshop'/name
 if name in ['intro','assistant']:source=R/'impact-paced'/name
 p=O/name;p.mkdir(exist_ok=True)
 for f in ['package.json','hyperframes.json','index.html']:shutil.copy(source/f,p/f)
 if not(p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
# Feature-first language follows the release blog; concepts remain labeled.
replacements={
'workshop':{'WORKSHOP · START HERE':'COMMUNITY WORKSHOP','Missing a widget?':'Community Workshop','Share, download and use community Custom Widgets and Custom CSS.':'Publish and install Custom Widgets and Custom CSS. Update community submissions.','Find it on the Workshop.':'Publish. Install. Update.','Publish your creations. Install what the community builds.':'Vote, comment and report submissions.'},
'custom':{'Create it with Custom Widgets!':'Custom Widgets v2','Use data from your services and their APIs. Build it yourself, or ask Homarr Assistant.':'Build with JSX, API requests, actions and typed settings. Test in the workbench.','What would you build?':'Custom Widgets v2','Turn service data into the view you want on your dashboard.':'Examples: filament stock, home inventory and meal planning.','Illustrative concepts · Build your own, share it, or ask the agent.':'Illustrative concepts · API data rendered in your widget.','Service API → data → your widget':'Live widget on a Homarr dashboard'},
'integrations':{'More building blocks for your dashboard — and the Custom Widgets you create.':'Connect 32 more services. Use their API data in Custom Widgets.','Basic statistics for now. Build the views you are missing with Custom Widgets.':'Basic statistics are included. Custom Widgets can display data from these services.'},
'assistant':{'Your Custom Widget, fast. On us.':'Homarr Assistant','A super-fast, free way to create your Custom Widget: ask Homarr Assistant.':'Build Custom Widgets. Use tools for boards, apps, integrations and Docker.','Create with Assistant.':'Create widgets with Assistant.','Bring your own API key, or let us cover your first requests.':'Bring your own API key or use the free Homarr provider.'},
'header':{'Put your header to work.':'Header customization','Your controls, your order':'Control placement','Keep the boards and controls you use within reach.':'Links and controls can occupy left, center or right header zones.'},
'statistics':{'Inspect your services at a glance.':'Statistics','Group metrics by integration, from health checks to inventory and downloads.':'View metrics grouped by integration: health checks, inventory and downloads.'}}
for name,changes in replacements.items():
 p=O/name/'index.html';s=p.read_text()
 for before,after in changes.items():
  assert before in s,(name,before)
  s=s.replace(before,after)
 p.write_text(s)
# Crop the existing authentic dashboard screenshot to the Pokédex bounds.
p=O/'custom/index.html';s=p.read_text().replace('</style>','''
.custom-editor{left:75px;top:395px;width:925px;height:560px}
.custom-running{left:1050px;top:365px;width:760px;height:602px}
.custom-running img{position:absolute;width:270.69%;height:auto;max-width:none;left:-1.897%;top:-4.58%;object-fit:fill}
.custom-chip{right:110px;top:990px;font-size:22px}
</style>''');p.write_text(s)
# Short, readable finale: retain the promised prize, donation thanks and confetti.
p=O/'ending/index.html';s=p.read_text().replace('data-duration="13"','data-duration="7"').replace('t:13,duration:13','t:7,duration:7').replace('scaleX:1,duration:13','scaleX:1,duration:7')
s=s.replace('<strong>Top 5 best submissions</strong> at the end of the year will get exclusive Homarr merch.','<strong>Top 5 Workshop submissions</strong><br>Exclusive Homarr merch at year’s end.')
s=s.replace('We’re giving back because you gave us so much money through donations.','Funded by your donations. Thank you.')
s=s.replace("duration:.7},1.0)","duration:.5},.3)").replace("duration:.6},2.4)","duration:.5},.55)").replace("duration:.6},3.0)","duration:.5},.75)")
p.write_text(s)
# Two vertical marquees: left up, right down; both open outward.
p=O/'intro/index.html';s=p.read_text()
s=re.sub(r'<div class="release-note">.*?</div>','',s)
s=re.sub(r'<div class="marquees">.*?<div class="wipe">','<div class="wipe">',s)
s=s.replace('height:725px','height:955px').replace('top:735px;font-size:17px','top:1015px;font-size:23px')
s=s.replace('Your dashboard, in context.','Boards, widgets and Docker tools.').replace('Arrange the header your way.','Board links and feature shortcuts.').replace('Built by you. Running in Homarr.','JSX and API data on the board.')
s=s.replace('<img src="assets/dashboard-cut/custom-dashboard.png" alt="">','<img class="pokedex-intro" src="assets/dashboard-cut/custom-dashboard.png" alt="">')
s=s.replace('data-duration="7"','data-duration="9"').replace('duration:7,','duration:9,').replace('},6.73);','},8.73);')
s=s.replace('</style>','''
.card-image:has(.pokedex-intro){position:relative}.card-image .pokedex-intro{position:absolute;width:270.69%;height:auto;max-width:none;left:-1.897%;top:-4.58%}
.integration-curtain{position:absolute;top:0;width:960px;height:1080px;z-index:30;background:#141418;overflow:hidden}
.curtain-left{left:0}.curtain-right{left:960px}.curtain-content{position:absolute;top:0;left:44px;width:872px;display:grid;grid-template-columns:repeat(4,206px);gap:16px}
.all-row{display:flex;gap:16px;width:max-content;flex-shrink:0}
.all-item{width:206px;height:120px;flex-shrink:0;background:#2b2530;border:1px solid #95657f;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px}
.all-item img{width:56px;height:56px;object-fit:contain}.all-item span{font-size:18px;color:#fff;text-align:center;max-width:204px}
.all-item img[src$="/ultimate/integrations/4.svg"],.all-item img[src$="/ultimate/integrations/7.svg"],.all-item img[src$="/ultimate/integrations/24.svg"]{filter:invert(1)}
</style>''')
old=(R/'impact-paced/intro/index.html').read_text()
existing=[{'asset':a,'name':html.unescape(n)} for a,n in re.findall(r'<img src="(assets/integrations/[^"]+)" alt=""><span>(.*?)</span>',old)]
new=json.loads((R/'impact-ultimate/new-integrations.json').read_text());xs=existing+new
assert len(xs)==87 and len({x['name'] for x in xs})==87
(O/'opening-integrations.json').write_text(json.dumps(xs,indent=2))
curtains=''
for side,index in [('left',0),('right',1)]:
 items=xs[index::2]
 tiles=''.join(f'<div class="all-item"><img src="{x["asset"]}" alt=""><span data-layout-allow-overlap>{html.escape(x["name"])}</span></div>' for x in items)
 curtains+=f'<div class="integration-curtain curtain-{side}" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion><div class="curtain-content" data-count="{len(items)}" data-layout-allow-overflow>{tiles}</div></div>'
s=s.replace('<div class="mesh"></div>', '<div class="intro-base" style="position:absolute;inset:0" data-layout-allow-occlusion data-layout-allow-overlap><div class="mesh"></div>')
s=s.replace('<div class="wipe"></div>','</div>'+curtains+'<div class="wipe"></div>')
s=re.sub(r"tl.fromTo\('\.release-note'.*?;\n",'',s)
s=re.sub(r"tl.fromTo\('\.row-[012]'.*?;\n",'',s)
s=s.replace("window.__timelines['workshop-intro']=tl;","""
tl.fromTo('.integration-curtain',{y:1120},{y:0,duration:.55,ease:'power3.out'},.1);
tl.fromTo('.curtain-left .curtain-content',{y:36},{y:-436,duration:4,ease:'none'},.6);
tl.fromTo('.curtain-right .curtain-content',{y:-436},{y:36,duration:4,ease:'none'},.6);
tl.to('.curtain-left',{x:-980,duration:2.2,ease:'power2.inOut'},4.8);
tl.to('.curtain-right',{x:980,duration:2.2,ease:'power2.inOut'},4.8);
window.__timelines['workshop-intro']=tl;
""")
s=s.replace('data-layout-allow-occlusion>', 'data-layout-allow-occlusion data-layout-allow-overlap>')
for cls in ['wordmark','line line-one','line line-two']:
 s=s.replace(f'class="{cls}"',f'class="{cls}" data-layout-allow-overlap')
p.write_text(s)

# Retain unchanged compact widget scene.
p=O/'widgets'
if not p.exists():p.symlink_to('../impact-workshop/widgets',target_is_directory=True)
chapters=json.loads((R/'impact-paced/storyboard.json').read_text())
chapters=[[t+2 if t>=7 else t,{'Missing a widget?':'Community Workshop','Create a Custom Widget':'Custom Widgets v2','Widget ideas':'Custom Widget examples','Assistant · Fast + free':'Homarr Assistant'}.get(label,label)] for t,label in chapters]
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
page=(R/'impact-paced/index.html').read_text();page=re.sub(r'<p style="padding:14px.*?</p>','',page)
page=page.replace('Impact — Missing a widget?','Homarr v2 — Feature overview').replace('117 seconds','113 seconds').replace('?v=12','?v=13').replace('../impact-workshop/','../impact-paced/')
page=re.sub(r'<h1>.*?</h1><p>.*?</p>','<h1>Homarr v2 — Feature overview · 113 seconds</h1><p>Community Workshop, Custom Widgets v2, 32 new integrations, Assistant and board editing. All 87 integrations scroll in two vertical marquees: left up, right down. Both slide outward to reveal the opening. Go Funk + TIKS, 1080p60.</p>',page)
page=re.sub(r'<div><button.*?</div>','<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{label}</button>' for t,label in chapters)+'</div>',page)
page=page.replace('The intro count includes the 55 existing integrations and 32 additions: 87 total. The marquee shows a selection.','The intro count is 87 (55 existing + 32 additions). Its full-screen transition shows all 87 integrations; the opening title has no bottom marquee. The Pokédex is cropped from the original dashboard screenshot. Copy follows the release blog, with PR #6863 preview additions labeled separately. The finale is seven seconds.')
(O/'index.html').write_text(page)
for filename in ['check-scenes.py','render-scenes.py']:
 s=(R/'impact-workshop'/filename).read_text()
 if filename=='check-scenes.py':s=re.sub(r'scenes=\{.*?\}',"scenes={'intro':'0,1,3,4.6,5.9,7.2,8.5','workshop':'1,4','integrations':'2,6','custom':'2,5,8,11','assistant':'1,4,8','statistics':'2,5','header':'2,5','ending':'1,3,6.5'}",s)
 else:s=re.sub(r'names=\[.*?\]',f'names={scenes!r}',s)
 (O/filename).write_text(s)
s=(R/'impact-paced/mix-music.py').read_text().replace('duration=7000/60','duration=6760/60')
a=s.index('cues=[]');b=s.index('for cue in cues:')
s=s[:a]+'''cues=[]
for item in json.loads((R/'impact-paced/sound-cues.json').read_text()):
 item=dict(item);t=item['time']
 if t<7:t*=9/7
 elif t<103+2/3:t+=2
 else:t=105+2/3+(t-(103+2/3))*7/13
 item['time']=t;cues.append(item)
for t in [.1,4.8]:cues.append({'time':t,'sound':'swoosh','gain':.9,'pan':0})
'''+s[b:]
s=s.replace('st={duration-4}:d=4','st={duration-2}:d=2')
(O/'mix-music.py').write_text(s)
print('Built feature-first cut, 112.667 seconds; all 87 integrations in opening curtains.')
