from pathlib import Path
import ast,shutil,json
R=Path(__file__).parent;O=R/'impact-refined';p=O/'composition';p.mkdir(parents=True,exist_ok=True)
for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,p/f)
if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
tree=ast.parse((R/'build-focused-motion.py').read_text());css=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='css' for t in n.targets))
css+='''.description{position:absolute;left:70px;bottom:65px;width:1740px;font-size:32px;line-height:1.45;z-index:6;background:#141418ed;border-left:4px solid #ff6688;padding:16px 25px}.custom-description{width:555px;font-size:31px;bottom:80px}.chips{top:335px}.chip{font-size:39px}.workbench{top:265px;height:700px}.preview{top:280px;width:620px;height:645px;left:1200px}.editor-video{position:absolute;left:75px;top:280px;width:1770px;height:625px;object-fit:contain}.sidebar-video{position:absolute;left:960px;top:125px;width:830px;height:850px;object-fit:contain;border:2px solid #666;border-radius:20px}.sidebar-copy{position:absolute;left:70px;top:340px;width:730px;font-size:49px;line-height:1.22;font-weight:650}.sidebar-copy small{font-size:29px;font-weight:400;display:block;margin-top:35px;color:#ccc;line-height:1.5}.sidebar-outline{position:absolute;left:1690px;top:150px;width:90px;height:790px;border:3px solid #ff6688;border-radius:20px;z-index:4}.stage-tag{position:absolute;left:75px;top:218px;padding:10px 18px;border:1px solid #685968;border-radius:9px;font-size:30px;z-index:4;background:#28222b}.advanced{left:625px;top:245px;height:660px;width:1180px}.mini-one{top:270px}.mini-two{top:575px}.assistant{top:210px;left:1030px;width:630px;height:710px}.permission{top:325px}.onboarding{left:500px;top:270px;width:1330px;height:725px}.steps{position:absolute;left:75px;top:320px;display:flex;flex-direction:column;gap:24px;font-size:31px}.steps div{padding:15px 20px;border:1px solid #685968;border-radius:10px;background:#28222b}.header-shot{position:absolute;left:710px;top:250px;width:1100px;height:708px;object-fit:contain;border:2px solid #665765;border-radius:20px}.zones{position:absolute;left:80px;top:370px;display:flex;flex-direction:column;gap:28px}.zones div{width:425px;font-size:40px;font-weight:650;background:#2c2430;border-left:5px solid #ff6688;padding:20px 25px}.header-description{width:570px;bottom:80px;font-size:30px}.onboard-description{font-size:29px;bottom:38px}.badge{color:#ff9eae;font-size:24px;position:absolute;right:70px;top:40px}.closing h1{font-size:115px}'''
css+='''.subtitle{position:absolute;left:70px;top:222px;width:1760px;font-size:33px;line-height:1.35;color:#ded7df;z-index:6}.workbench{left:230px;top:320px;width:1380px;height:670px}.preview{left:1240px;top:345px;width:570px;height:600px}.editor-video{left:210px;top:330px;width:1500px;height:700px;object-fit:contain}.stage-tag{left:1520px;top:290px;font-size:24px}.advanced-video{position:absolute;left:670px;top:305px;width:1080px;height:749px;object-fit:contain;border-radius:20px;border:2px solid #665765}.shift-key{position:absolute;left:135px;top:500px;width:375px;border:2px solid #9d8395;border-bottom:10px solid #65515f;border-radius:24px;padding:34px 40px;font-size:61px;letter-spacing:4px;text-align:center;background:#302631;box-shadow:0 18px 60px #0006}.hold-meter{position:absolute;left:160px;top:650px;width:320px;height:6px;background:#ff779d;transform-origin:left;border-radius:4px}.hold-label{position:absolute;left:155px;top:687px;width:340px;text-align:center;font-size:27px;color:#d9cbd4}.assistant{left:660px;top:300px;width:600px;height:675px}.onboarding{left:345px;top:320px;width:1230px;height:670px}.header-shot{left:450px;top:295px;width:1100px;height:708px}.celebration-ring{position:absolute;left:610px;top:190px;width:700px;height:700px;border:3px solid #ff779d;border-radius:50%;pointer-events:none}.particle{will-change:transform;transform-style:preserve-3d}.closing{z-index:9;text-shadow:0 3px 20px #141418}.closing img{filter:drop-shadow(0 0 30px #ff668844)}'''
clips=[];animations=[]
def scene(id,t,d,body,clear=False):
 cl='scene'
 if clear:cl+=' clear'
 clips.append(f'<section id="{id}" class="clip" data-start="{t}" data-duration="{d}" data-track-index="1"><div class="{cl}"><div class="grid" data-layout-allow-overflow></div>{body}</div></section>')
 if id not in ['end','sidebar']:animations.append(f"tl.fromTo('#{id} .title span',{{y:70,opacity:0,rotation:5}},{{y:0,opacity:1,rotation:0,duration:.45,stagger:.06,ease:'power3.out'}},{t}+.05);")
 animations.append(f"tl.fromTo('#{id} .grid',{{x:0,y:0}},{{x:-100,y:65,duration:{d},ease:'none'}},{t});")
def title(s):return '<div class="top">HOMARR 2.0</div><div class="title">'+''.join('<span>'+w+'&nbsp;</span>' for w in s.split())+'</div>'
def desc(s,extra=''):return f'<div class="description {extra}">{s}</div>'
def sub(s):return '<div class="subtitle">'+s+'</div>'
def panel(path,cls):return f'<div class="panel {cls}"><img src="assets/{path}"></div>'
scene('custom',0,8,title('Custom Widgets v2')+'<div class="badge">BETA</div>'+sub('Build your own widgets with JSX, API requests, and a live preview.')+panel('local-captures/workbench.png','workbench')+'<div class="panel preview"></div>')
scene('editor',8,8,title('Drag and resize widgets')+sub('Rearrange your board and resize tiles directly on the grid.'),True)
scene('sidebar',16,4,'<div class="top">HOMARR 2.0 / SIDEBARS</div><div class="sidebar-copy">Keep app launchers<br>beside your widgets.<small>Sidebars give apps their own space alongside the main board.</small></div><div class="sidebar-outline"></div>',True)
scene('advanced',20,5,title('Advanced widget views')+sub('Hover a widget and hold Shift for 1 second to open its detailed view.')+'<div class="shift-key">SHIFT</div><div class="hold-meter"></div><div class="hold-label">Hold for 1 second</div>',True)
scene('agent',25,5,title('Assistant + tools')+sub('Inspect your instance and request changes, with permission checks and approval.')+panel('local-captures/assistant.png','assistant'))
scene('onboarding',30,5,title('New onboarding studio')+sub('Set up your instance faster: connect services and create your first board in one flow.')+panel('explained/onboarding.png','onboarding'))
scene('header',35,5,title('Configure the header')+sub('Choose your header controls and arrange them into left, center, and right zones.')+'<img class="header-shot" src="assets/explained/header.png">')
scene('end',40,3,'<div class="celebration-ring"></div><div class="closing"><img src="assets/logo.svg"><h1>Homarr 2.0</h1><p>homarr.dev</p></div>')
media='<div id="recording-backdrop" class="drag-bg clip" data-start="8" data-duration="17" data-track-index="0"></div><video id="editor-recording" class="clip editor-video" src="assets/refined/editor.mp4" data-start="8" data-duration="8" data-track-index="0" muted playsinline></video><video id="sidebar-recording" class="clip sidebar-video" src="assets/explained/sidebar.mp4" data-start="16" data-duration="4" data-track-index="0" muted playsinline></video><video id="advanced-recording" class="clip advanced-video" src="assets/refined/advanced.mp4" data-start="20" data-duration="5" data-track-index="0" muted playsinline></video><audio id="original-score" src="assets/refined/score.wav" data-start="0" data-duration="43" data-track-index="4" data-volume="1"></audio>'
particles=''.join(f'<i class="particle" data-layout-allow-overflow id="p{i}" style="background:{["#ff6688","#8feaff","#ffe291","#a0ffc7","#c4a0ff","#ffffff"][i%6]};width:{7+i%7}px;height:{12+i%17}px;border-radius:{i%3}px"></i>' for i in range(240))
js="const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};"+''.join(animations)+'''
tl.fromTo('.workbench',{x:1000,y:120,rotation:12,scale:.65},{x:0,y:0,rotation:-2,scale:1,duration:.8,ease:'power4.out'},.1);

tl.to('.workbench',{scale:.92,x:-50,rotation:1,duration:.6},2.7);
tl.fromTo('.preview',{scale:.2,rotation:12,opacity:0,y:120},{scale:1,rotation:-1,opacity:1,y:0,duration:.65,ease:'back.out(1.2)'},3.1);
tl.to('.preview',{y:-20,rotation:1,duration:1.5,yoyo:true,repeat:1,ease:'sine.inOut'},3.8);
tl.to('#custom .panel',{x:1900,rotation:12,duration:.45,stagger:.08,ease:'power3.in'},7.35);


tl.fromTo('.sidebar-copy',{x:-600,opacity:0},{x:0,opacity:1,duration:.5,ease:'power3.out'},16.05);
tl.fromTo('.sidebar-outline',{opacity:0,scale:1.08},{opacity:1,scale:1,duration:.4},16.5);




tl.fromTo('.assistant',{x:1300,rotation:8,scale:.7},{x:0,rotation:0,scale:1,duration:.6,ease:'power4.out'},25.1);

tl.to('#agent .panel',{x:-2000,duration:.4,ease:'power3.in'},29.6);
tl.fromTo('.onboarding',{y:1000,rotation:8,scale:.7},{y:0,rotation:0,scale:1,duration:.65,ease:'power3.out'},30.1);

tl.to('.onboarding',{scale:1.035,x:-20,duration:2,ease:'sine.inOut'},32);
tl.to('#onboarding .panel',{x:1900,rotation:8,duration:.4,ease:'power3.in'},34.6);
tl.fromTo('.header-shot',{x:1500,rotation:12},{x:0,rotation:0,duration:.6,ease:'power4.out'},35.1);

tl.to('.header-shot',{scale:1.04,duration:2,ease:'sine.inOut'},37);
tl.to('#header .header-shot',{y:-1200,duration:.45,ease:'power3.in'},39.5);
tl.fromTo('.closing',{scale:.3,rotation:-8,opacity:0},{scale:1,rotation:0,opacity:1,duration:.65,ease:'back.out(1.4)'},40);
[8,16,20,25,30,35,40].forEach(t=>tl.fromTo('.wipe',{x:-2300},{x:2300,duration:.45,ease:'power3.inOut',immediateRender:false},t-.225));
tl.fromTo('.celebration-ring',{scale:.05,opacity:.85},{scale:2.9,opacity:0,duration:1.2,ease:'power2.out'},40.05);
for(let i=0;i<240;i++){const side=2*(i%2)-1,seed=(i*73%241)/241,start=40.05+(i%13)*.016,x=side*(120+seed*1000),apex=-500+(i*41%440),delay=.63+(i%9)*.035;tl.fromTo('#p'+i,{x:side*880,y:620,scale:0,opacity:0,rotation:i*13,rotationX:0},{x,y:apex,scale:1,opacity:1,rotation:i*37,rotationX:i*53,duration:delay,ease:'power2.out'},start);tl.to('#p'+i,{x:x+side*(50+i%140),y:820,rotation:i*89,rotationX:i*123,rotationY:i*41,opacity:0,duration:2.15-delay,ease:'power1.in'},start+delay);}
tl.fromTo('.shift-key',{scale:1,backgroundColor:'#302631'},{scale:.94,backgroundColor:'#6d294a',duration:.14},20.95);
tl.fromTo('.hold-meter',{scaleX:0},{scaleX:1,duration:1,ease:'none'},20.95);
tl.to('.shift-key',{scale:1,backgroundColor:'#302631',duration:.18},24.4);
tl.to('.hold-meter',{opacity:0,duration:.15},24.4);
[0,8,20,25,30,35].forEach(t=>tl.fromTo('#'+['custom','editor','advanced','agent','onboarding','header'][[0,8,20,25,30,35].indexOf(t)]+' .subtitle',{y:18,opacity:0},{y:0,opacity:1,duration:.4,ease:'power2.out'},t+.18));
tl.fromTo('.progress',{scaleX:0},{scaleX:1,duration:43,ease:'none'},0);window.__timelines['impact-refined']=tl;
'''
(p/'index.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>Homarr 2.0 — Impact, refined</title><script src="assets/gsap.min.js"></script><style>'+css+'</style></head><body><div id="root" data-composition-id="impact-refined" data-width="1920" data-height="1080" data-duration="43">'+media+''.join(clips)+particles+'<div class="wipe" data-layout-allow-overflow></div><div class="progress"></div></div><script>'+js+'</script></body></html>')
chapters=[(0,'Custom Widgets'),(8,'Drag + resize'),(16,'Sidebars'),(20,'Advanced widgets'),(25,'Assistant'),(30,'Onboarding'),(35,'Header'),(40,'Ending')]
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impact — refined</title><style>body{font:18px system-ui;background:#141418;color:#eee;max-width:1300px;margin:40px auto;padding:20px}video{width:100%;border-radius:15px}p{color:#bbb;line-height:1.5}a{color:#ff8fa9}button{background:#30303a;color:#fff;border:1px solid #666;padding:12px;margin:5px;cursor:pointer;border-radius:8px}</style></head><body><h1>Impact — refined · 43 seconds</h1><p>Continuous-motion drag and resize, a recorded Shift-hold advanced view, concise subtitles, twin confetti bursts, and TIKS sound effects over the original score. Sound is on when you press play.</p><video id="film" controls preload="metadata" poster="impact.jpg?v=2" src="impact.mp4?v=2"></video><div>'''
for t,name in chapters:page+=f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{name}</button>'
page+='''</div><p><a href="impact.mp4" download>Download MP4</a> · <a href="../impact-explained/">Previous Impact</a> · <a href="../focused-motion/">Impact / Orbit comparison</a> · <a href="../composition/assets/refined/score.wav">Listen to the score</a></p><details><summary>Capture notes</summary><p>Dragging, resizing and sidebar scrolling are newly recorded local browser video, encoded directly from WebM to MP4. The advanced view is also a live local recording. The pointer and Shift gesture are genuine browser inputs. Custom Widget screenshots are local captures. Drag/resize footage is gently accelerated (1.12×). Sound accents use TIKS 0.3.0 (MIT). Onboarding is a fresh local setup capture. Header studio uses a cropped release screenshot because the available local image predates that feature. Assistant shows controls, not a simulated conversation.</p></details></body></html>'''
(O/'index.html').write_text(page)
finish=(R/'technical-variants/finish.py').read_text().replace("[('a-release-notes',24),('b-widget-workbench',24),('c-ui-only',18)]","[('impact',43)]").replace('fps=1/4,scale=480:-1,tile=3x2','fps=1/4,scale=480:-1,tile=4x3')
(O/'finish.py').write_text(finish.replace('seconds*30','seconds*60'))
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
