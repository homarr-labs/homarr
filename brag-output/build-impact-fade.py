from pathlib import Path
import json,re,shutil,html
R=Path(__file__).resolve().parent;S=R/'impact-direct';O=R/'impact-fade';O.mkdir(exist_ok=True)
for name in ['intro','widgets','ending']:
 p=O/name;p.mkdir(exist_ok=True)
 for f in ['index.html','hyperframes.json','package.json']:shutil.copy(S/name/f,p/f)
 if not(p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
for name in ['workshop','integrations','custom','assistant','statistics','header']:
 p=O/name
 if not p.exists():p.symlink_to('../impact-direct/'+name,target_is_directory=True)
for name in ['storyboard.json','opening-integrations.json']:shutil.copy(S/name,O/name)
# One continuous field, independently phased columns, no moving panels.
p=O/'intro/index.html';s=p.read_text()
a=s.index('.integration-curtain{');b=s.index('</style>',a)
s=s[:a]+'''
.integration-field{position:absolute;inset:0;z-index:30;background:#141418;overflow:hidden}
.integration-column{position:absolute;top:0;width:206px;display:flex;flex-direction:column;gap:16px}
.all-item{width:206px;height:120px;flex-shrink:0;background:#2b2530;border:1px solid #95657f;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px}
.all-item img{width:56px;height:56px;object-fit:contain}.all-item span{font-size:18px;color:#fff;text-align:center;max-width:204px}
.all-item img[src$="/ultimate/integrations/4.svg"],.all-item img[src$="/ultimate/integrations/7.svg"],.all-item img[src$="/ultimate/integrations/24.svg"]{filter:invert(1)}
'''+s[b:]
xs=json.loads((O/'opening-integrations.json').read_text());field='<div class="integration-field" data-layout-allow-occlusion data-layout-allow-overlap>'
phases=[14,219,39,384,194,128,297,235]
for col in range(8):
 items=xs[col::8];period=len(items)*136;initial=-period-phases[col]
 field+=f'<div class="integration-column column-{col}" style="left:{52+col*230}px" data-initial="{initial}" data-layout-allow-overflow data-layout-allow-overlap>'
 for cycle in range(3):
  for x in items:field+=f'<div class="all-item"><img src="{x["asset"]}" alt=""><span data-layout-allow-overlap>{html.escape(x["name"])}</span></div>'
 field+='</div>'
field+='</div>'
a=s.index('<div class="integration-curtain');b=s.index('<div class="wipe">',a);s=s[:a]+field+s[b:]
a=s.index("tl.fromTo('.integration-curtain'");b=s.index("window.__timelines['workshop-intro']=tl;",a)
s=s[:a]+"""
Array.from(document.querySelectorAll('.integration-column')).forEach((column,i)=>{const start=Number(column.dataset.initial);let distance=-1440;if(i%2)distance=1440;tl.fromTo(column,{y:start},{y:start+distance,duration:9,ease:'none'},0);});
tl.fromTo('.integration-field',{opacity:1},{opacity:0,duration:2,ease:'sine.inOut'},4.4);
"""+s[b:];p.write_text(s)
# The video inherits the Timer card's entrance, just like the other previews.
p=O/'widgets/index.html';s=p.read_text();video=re.search(r'<video id="timer-demo".*?</video>',s).group(0);s=s.replace(video,'')
s=s.replace('<span class="widget-type">TIMER + POMODORO</span>','<span class="widget-type">TIMER + POMODORO</span>'+video)
s=s.replace('<section id="widgets-scene" class="clip" data-start="0" data-duration="8" data-track-index="0">','<section id="widgets-scene" class="widgets-stage">')
s=s.replace('</style>','.widgets-stage{position:absolute;inset:0;overflow:hidden}.wc-timer .compact-timer{left:35px;top:142px}</style>');p.write_text(s)
# Keep the short outro, but state the giveaway and end with the requested CTA.
p=O/'ending/index.html';s=p.read_text().replace('See you on the Workshop.','Workshop merch giveaway.')
s=s.replace('<strong>Top 5 Workshop submissions</strong><br>Exclusive Homarr merch at year’s end.','Our <strong>five favorite Workshop submissions</strong> win exclusive Homarr merch at year’s end.')
s=s.replace('Stay tuned.','Better get cooking if you want to wear some dope lobster merch.')
s=s.replace('</style>','''
.ending-title{font-size:72px}.ending-prize{top:405px;font-size:42px;line-height:1.4}
.ending-sub{top:665px;font-size:43px;line-height:1.3;max-width:1100px}
.ending-thanks{top:930px;font-size:26px}
</style>''');p.write_text(s)
for filename in ['check-scenes.py','render-scenes.py']:
 s=(S/filename).read_text()
 if filename=='check-scenes.py':s=re.sub(r'scenes=\{.*?\}',"scenes={'intro':'0,1.5,4,5.4,6.5,8','widgets':'0,0.2,0.5,1,4','ending':'1,3,6.5'}",s)
 else:s=re.sub(r'names=\[.*?\]',"names=['intro','widgets','ending']",s)
 (O/filename).write_text(s)
s=(S/'mix-music.py').read_text().replace('for t in [.1,4.8]','for t in [.1,4.4]').replace("'gain':.9","'gain':.45");(O/'mix-music.py').write_text(s)
s=(S/'index.html').read_text();s=re.sub(r'<p style="padding:14px.*?</p>','',s);s=s.replace('?v=13','?v=14').replace('../impact-paced/','../impact-direct/')
s=s.replace('All 87 integrations scroll in two vertical marquees: left up, right down. Both slide outward to reveal the opening.','All 87 integrations scroll in eight independently offset columns, alternating up and down, then fade out. Timer enters with its card. The finale explains the Workshop merch giveaway.')
s=s.replace('The finale is seven seconds.','The finale is seven seconds, with a giveaway for our five favorite Workshop submissions and the lobster-merch CTA. The opening fades out instead of opening to the sides.')
(O/'index.html').write_text(s)
print('Built fade revision: eight offset vertical columns, synchronized Timer card, explicit giveaway CTA.')
