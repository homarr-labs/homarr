from pathlib import Path
import ast,shutil,json
R=Path(__file__).parent;O=R/'impact-explained';p=O/'composition';p.mkdir(exist_ok=True)
for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,p/f)
if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
tree=ast.parse((R/'build-focused-motion.py').read_text());css=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='css' for t in n.targets))
css+='''.description{position:absolute;left:70px;bottom:65px;width:1740px;font-size:32px;line-height:1.45;z-index:6;background:#141418ed;border-left:4px solid #ff6688;padding:16px 25px}.custom-description{width:555px;font-size:31px;bottom:80px}.chips{top:335px}.chip{font-size:39px}.workbench{top:265px;height:700px}.preview{top:280px;width:620px;height:645px;left:1200px}.editor-video{position:absolute;left:75px;top:280px;width:1770px;height:625px;object-fit:contain}.sidebar-video{position:absolute;left:960px;top:125px;width:830px;height:850px;object-fit:contain;border:2px solid #666;border-radius:20px}.sidebar-copy{position:absolute;left:70px;top:340px;width:730px;font-size:49px;line-height:1.22;font-weight:650}.sidebar-copy small{font-size:29px;font-weight:400;display:block;margin-top:35px;color:#ccc;line-height:1.5}.sidebar-outline{position:absolute;left:1690px;top:150px;width:90px;height:790px;border:3px solid #ff6688;border-radius:20px;z-index:4}.stage-tag{position:absolute;left:75px;top:218px;padding:10px 18px;border:1px solid #685968;border-radius:9px;font-size:30px;z-index:4;background:#28222b}.advanced{left:625px;top:245px;height:660px;width:1180px}.mini-one{top:270px}.mini-two{top:575px}.assistant{top:210px;left:1030px;width:630px;height:710px}.permission{top:325px}.onboarding{left:500px;top:270px;width:1330px;height:725px}.steps{position:absolute;left:75px;top:320px;display:flex;flex-direction:column;gap:24px;font-size:31px}.steps div{padding:15px 20px;border:1px solid #685968;border-radius:10px;background:#28222b}.header-shot{position:absolute;left:710px;top:250px;width:1100px;height:708px;object-fit:contain;border:2px solid #665765;border-radius:20px}.zones{position:absolute;left:80px;top:370px;display:flex;flex-direction:column;gap:28px}.zones div{width:425px;font-size:40px;font-weight:650;background:#2c2430;border-left:5px solid #ff6688;padding:20px 25px}.header-description{width:570px;bottom:80px;font-size:30px}.onboard-description{font-size:29px;bottom:38px}.badge{color:#ff9eae;font-size:24px;position:absolute;right:70px;top:40px}.closing h1{font-size:115px}'''
clips=[];animations=[]
def scene(id,t,d,body,clear=False):
 cl='scene'
 if clear:cl+=' clear'
 clips.append(f'<section id="{id}" class="clip" data-start="{t}" data-duration="{d}" data-track-index="1"><div class="{cl}"><div class="grid" data-layout-allow-overflow></div>{body}</div></section>')
 if id!='end':animations.append(f"tl.fromTo('#{id} .title span',{{y:70,opacity:0,rotation:5}},{{y:0,opacity:1,rotation:0,duration:.45,stagger:.06,ease:'power3.out'}},{t}+.05);")
 animations.append(f"tl.fromTo('#{id} .grid',{{x:0,y:0}},{{x:-100,y:65,duration:{d},ease:'none'}},{t});")
def title(s):return '<div class="top">HOMARR 2.0</div><div class="title">'+''.join('<span>'+w+'&nbsp;</span>' for w in s.split())+'</div>'
def desc(s,extra=''):return f'<div class="description {extra}">{s}</div>'
def panel(path,cls):return f'<div class="panel {cls}"><img src="assets/{path}"></div>'
scene('custom',0,8,title('Custom Widgets v2')+'<div class="badge">BETA</div>'+panel('local-captures/workbench.png','workbench')+'<div class="panel preview"></div><div class="chips"><div class="chip">JSX + settings</div><div class="chip">API requests</div><div class="chip">Live preview</div></div>'+desc('Write JSX, connect API requests, and test the rendered widget before adding it to a board.','custom-description'))
scene('editor',8,8,title('Drag and resize widgets')+'<div class="stage-tag tag-move">Drag to rearrange</div><div class="stage-tag tag-resize">Resize from the tile edges</div>'+desc('Move tiles between positions, then resize them directly on the grid.'),True)
scene('sidebar',16,4,'<div class="top">HOMARR 2.0 / SIDEBARS</div><div class="sidebar-copy">Keep app launchers<br>beside your widgets.<small>Sidebars give apps their own space alongside the main board.</small></div><div class="sidebar-outline"></div>',True)
scene('advanced',20,5,title('Advanced widget views')+panel('local-captures/advanced-downloads.png','advanced')+'<img class="mini mini-one" src="assets/local-captures/downloads-tile.png"><img class="mini mini-two" src="assets/local-captures/timer-tile.png">'+desc('Open a detailed view from a compact widget without leaving the board.'))
scene('agent',25,5,title('Assistant + tools')+panel('local-captures/assistant.png','assistant')+'<div class="permission"><div>Instance data</div><div>Permission-checked tools</div><div>Approval for changes</div></div>'+desc('Inspect instance data and request changes. Tools respect permissions; changes need approval by default.'))
scene('onboarding',30,5,title('New onboarding studio')+panel('explained/onboarding.png','onboarding')+'<div class="steps"><div>Set defaults</div><div>Connect services</div><div>Create a board</div></div>'+desc('A guided setup covers your admin account, service discovery, integrations, and first board.','onboard-description'))
scene('header',35,5,title('Configure the header')+'<img class="header-shot" src="assets/explained/header.png"><div class="zones"><div>Left</div><div>Center</div><div>Right</div></div>'+desc('Choose which controls appear and arrange them in left, center, or right zones.','header-description'))
scene('end',40,3,'<div class="closing"><img src="assets/logo.svg"><h1>Homarr 2.0</h1><p>homarr.dev</p></div>')
media='<div class="drag-bg clip" data-start="8" data-duration="12" data-track-index="0"></div><video id="editor-recording" class="clip editor-video" src="assets/explained/editor.mp4" data-start="8" data-duration="8" data-track-index="0" muted playsinline></video><video id="sidebar-recording" class="clip sidebar-video" src="assets/explained/sidebar.mp4" data-start="16" data-duration="4" data-track-index="0" muted playsinline></video><audio id="original-score" src="assets/explained/score.wav" data-start="0" data-duration="43" data-track-index="4" data-volume="1"></audio>'
particles=''.join(f'<i class="particle" id="p{i}" style="background:{["#ff6688","#8feaff","#ffe291","#a0ffc7"][i%4]}"></i>' for i in range(80))
js="const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};"+''.join(animations)+'''
tl.fromTo('.workbench',{x:1000,y:120,rotation:12,scale:.65},{x:0,y:0,rotation:-2,scale:1,duration:.8,ease:'power4.out'},.1);
tl.fromTo('.chip',{x:-700,rotation:-10,opacity:0},{x:0,rotation:0,opacity:1,duration:.5,stagger:.28,ease:'back.out(1.3)'},.4);
tl.to('.workbench',{scale:.92,x:-50,rotation:1,duration:.6},2.7);
tl.fromTo('.preview',{scale:.2,rotation:12,opacity:0,y:120},{scale:1,rotation:-1,opacity:1,y:0,duration:.65,ease:'back.out(1.2)'},3.1);
tl.to('.preview',{y:-20,rotation:1,duration:1.5,yoyo:true,repeat:1,ease:'sine.inOut'},3.8);
tl.to('#custom .panel',{x:1900,rotation:12,duration:.45,stagger:.08,ease:'power3.in'},7.35);
tl.fromTo('.tag-move',{opacity:1},{opacity:0,duration:.2},11.2);
tl.fromTo('.tag-resize',{opacity:0,y:12},{opacity:1,y:0,duration:.2},11.4);
tl.fromTo('.sidebar-copy',{x:-600,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},16.05);
tl.fromTo('.sidebar-outline',{opacity:0,scale:1.08},{opacity:1,scale:1,duration:.4},16.5);
tl.fromTo('.advanced',{scale:.35,x:-700,rotation:-10},{scale:1,x:0,rotation:0,duration:.7,ease:'back.out(1.1)'},20.05);
tl.fromTo('.mini',{x:-600,rotation:-20},{x:0,rotation:0,duration:.6,stagger:.2,ease:'back.out(1.3)'},20.2);
tl.to('.advanced',{scale:1.035,duration:2,ease:'sine.inOut'},22);
tl.to('#advanced .panel,#advanced .mini',{y:1100,rotation:10,duration:.4,stagger:.05,ease:'power3.in'},24.5);
tl.fromTo('.assistant',{x:1300,rotation:8,scale:.7},{x:0,rotation:0,scale:1,duration:.6,ease:'power4.out'},25.1);
tl.fromTo('.permission div',{x:-650,opacity:0},{x:0,opacity:1,duration:.4,stagger:.35,ease:'back.out(1.3)'},25.3);
tl.to('#agent .panel,#agent .permission',{x:-2000,duration:.4,ease:'power3.in'},29.6);
tl.fromTo('.onboarding',{y:1000,rotation:8,scale:.7},{y:0,rotation:0,scale:1,duration:.65,ease:'power3.out'},30.1);
tl.fromTo('.steps div',{x:-500,opacity:0},{x:0,opacity:1,duration:.4,stagger:.55,ease:'back.out(1.3)'},30.4);
tl.to('.onboarding',{scale:1.035,x:-20,duration:2,ease:'sine.inOut'},32);
tl.to('#onboarding .panel',{x:1900,rotation:8,duration:.4,ease:'power3.in'},34.6);
tl.fromTo('.header-shot',{x:1500,rotation:12},{x:0,rotation:0,duration:.6,ease:'power4.out'},35.1);
tl.fromTo('.zones div',{x:-600,opacity:0},{x:0,opacity:1,duration:.4,stagger:.35,ease:'back.out(1.3)'},35.4);
tl.to('.header-shot',{scale:1.04,duration:2,ease:'sine.inOut'},37);
tl.to('#header .header-shot,#header .zones',{y:-1200,duration:.45,ease:'power3.in'},39.5);
tl.fromTo('.closing',{scale:.3,rotation:-8,opacity:0},{scale:1,rotation:0,opacity:1,duration:.65,ease:'back.out(1.4)'},40);
[8,16,20,25,30,35,40].forEach(t=>tl.fromTo('.wipe',{x:-2300},{x:2300,duration:.45,ease:'power3.inOut'},t-.225));
for(let i=0;i<80;i++){let a=i*137.508*Math.PI/180,r=450+(i%9)*95,x=Math.cos(a)*r,y=Math.sin(a)*r;tl.fromTo('#p'+i,{x:0,y:0,scale:0,rotation:0,opacity:0},{x,y,scale:1,rotation:i*57,opacity:1,duration:.8+(i%5)*.08,ease:'power3.out'},40.1);tl.to('#p'+i,{y:y+500,rotation:i*91,opacity:0,duration:1.3,ease:'power1.in'},41.1);}
tl.fromTo('.progress',{scaleX:0},{scaleX:1,duration:43,ease:'none'},0);window.__timelines['impact-explained']=tl;
'''
(p/'index.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>Homarr 2.0 — Impact, explained</title><script src="assets/gsap.min.js"></script><style>'+css+'</style></head><body><div id="root" data-composition-id="impact-explained" data-width="1920" data-height="1080" data-duration="43">'+media+''.join(clips)+particles+'<div class="wipe" data-layout-allow-overflow></div><div class="progress"></div></div><script>'+js+'</script></body></html>')
chapters=[(0,'Custom Widgets'),(8,'Drag + resize'),(16,'Sidebars'),(20,'Advanced widgets'),(25,'Assistant'),(30,'Onboarding'),(35,'Header'),(40,'Ending')]
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impact — explained</title><style>body{font:18px system-ui;background:#141418;color:#eee;max-width:1300px;margin:40px auto;padding:20px}video{width:100%;border-radius:15px}p{color:#bbb;line-height:1.5}a{color:#ff8fa9}button{background:#30303a;color:#fff;border:1px solid #666;padding:12px;margin:5px;cursor:pointer;border-radius:8px}</style></head><body><h1>Impact — explained · 43 seconds</h1><p>Feature descriptions, fresh drag-and-resize video, sidebars, onboarding and header configuration. Original electronic score with action and transition cues. Sound is on when you press play.</p><video id="film" controls preload="metadata" poster="impact.jpg" src="impact.mp4"></video><div>'''
for t,name in chapters:page+=f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{name}</button>'
page+='''</div><p><a href="impact.mp4" download>Download MP4</a> · <a href="../focused-motion/">Previous Impact / Orbit comparison</a> · <a href="../composition/assets/explained/score.wav">Listen to the score</a></p><details><summary>Capture notes</summary><p>Dragging, resizing and sidebar scrolling are newly recorded local browser video, encoded directly from WebM to MP4. Custom Widget and advanced widget screenshots are local captures. Onboarding is a fresh local setup capture. Header studio uses a cropped release screenshot because the available local image predates that feature. Assistant shows controls, not a simulated conversation.</p></details></body></html>'''
(O/'index.html').write_text(page)
finish=(R/'technical-variants/finish.py').read_text().replace("[('a-release-notes',24),('b-widget-workbench',24),('c-ui-only',18)]","[('impact',43)]").replace('fps=1/4,scale=480:-1,tile=3x2','fps=1/4,scale=480:-1,tile=4x3')
(O/'finish.py').write_text(finish)
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
