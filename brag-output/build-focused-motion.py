from pathlib import Path
import shutil,json
R=Path(__file__).parent;O=R/'focused-motion';O.mkdir(exist_ok=True)
css='''@font-face{font-family:Inter;src:url(assets/inter.woff2)}*{box-sizing:border-box}body{margin:0;background:#141418;color:#fff;font-family:Inter,sans-serif}#root{width:100%;height:100%;position:relative;overflow:hidden;background:#141418}.clip,.scene{position:absolute;inset:0;overflow:hidden}.scene{background:radial-gradient(ellipse at 70% 40%,#3d2433,#141418 70%);perspective:1700px}.grid{position:absolute;inset:-300px;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:80px 80px}.top{position:absolute;top:38px;left:55px;font-size:23px;letter-spacing:3px;color:#ff9eae;z-index:5}.title{position:absolute;left:65px;top:125px;z-index:4;font-size:78px;line-height:1.05;font-weight:750;letter-spacing:-3px}.title span{display:inline-block}.note{position:absolute;left:70px;bottom:55px;font-size:29px;z-index:5;background:#141418ed;border-left:4px solid #ff6688;padding:17px 24px;max-width:1760px}.panel{position:absolute;border:2px solid #67606b;border-radius:22px;overflow:hidden;background:#242424;box-shadow:0 40px 80px #0009}.panel img{width:100%;height:100%;object-fit:contain}.workbench{left:640px;top:235px;width:1160px;height:790px}.preview{left:1140px;top:280px;width:660px;height:690px;background-image:url(assets/local-captures/custom-preview.png);background-size:contain;background-position:center;background-repeat:no-repeat}.chips{position:absolute;left:75px;top:350px;display:flex;flex-direction:column;gap:24px;z-index:5}.chip{font-size:48px;font-weight:650;border:1px solid #666;border-radius:14px;padding:18px 28px;background:#25232bee;box-shadow:0 12px 30px #0005}.chip:nth-child(2){margin-left:45px}.chip:nth-child(3){margin-left:90px;color:#9dffc5}.ring{position:absolute;width:440px;height:440px;border:2px solid #ff6688;border-radius:50%;left:1140px;top:420px;opacity:.25}.drag-video{position:absolute;left:70px;top:205px;width:1780px;height:820px;object-fit:contain}.clear{background:transparent}.drag-bg{position:absolute;inset:0;background:#141418}.drag-heading{font-size:68px;top:70px}.advanced{left:590px;top:220px;width:1230px;height:795px}.mini{object-fit:contain;background:#242424;position:absolute;left:60px;width:430px;height:286px;border-radius:18px;border:2px solid #514956;box-shadow:0 20px 50px #0007}.mini-one{top:300px}.mini-two{top:615px}.assistant{left:1020px;top:230px;width:700px;height:790px}.permission{position:absolute;left:90px;top:380px;z-index:5;display:flex;flex-direction:column;gap:25px}.permission div{font-size:32px;background:#24262f;border:1px solid #726874;border-radius:16px;padding:25px}.extras{display:flex;position:absolute;top:265px;left:80px;gap:40px}.extra{width:560px;height:670px;background:#242424;border:2px solid #555;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px #0008}.extra img{width:100%;height:560px;object-fit:cover;object-position:top}.extra b{display:block;font-size:32px;padding:30px}.closing{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column}.closing img{width:160px;margin-bottom:30px}.closing h1{font-size:130px;letter-spacing:-5px;margin:0}.closing p{font-size:34px;color:#ccc}.particle{position:absolute;width:12px;height:22px;left:960px;top:540px;z-index:8}.wipe{position:absolute;inset:0;background:#ff6688;z-index:15;transform:translateX(-2100px) skewX(-12deg)}.progress{position:absolute;bottom:0;width:100%;height:5px;background:#ff6688;z-index:20;transform-origin:left}.orbit .scene{background:radial-gradient(ellipse at 30% 60%,#193c46,#11171c 72%)}.orbit .chip{border-color:#509aab}.orbit .workbench{left:620px}.orbit .top{color:#8feaff}.orbit .scene.clear{background:transparent}'''
for key,orbit in [('impact',False),('orbit',True)]:
 p=O/key;p.mkdir(exist_ok=True)
 for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,p/f)
 if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
 scenes=[]
 def scene(id,t,d,body,clear=False):
  cl='scene'
  if clear:cl+=' clear'
  scenes.append(f'<section id="{id}" class="clip" data-start="{t}" data-duration="{d}" data-track-index="1"><div class="{cl}"><div class="grid" data-layout-allow-overflow></div>{body}</div></section>')
 def title(label):return '<div class="top">HOMARR 2.0</div><div class="title">'+''.join(f'<span>{x}&nbsp;</span>' for x in label.split())+'</div>'
 def panel(name,cls):
  path={'custom-widget-workbench':'local-captures/workbench.png','advanced-downloads':'local-captures/advanced-downloads.png','assistant-control-surface':'local-captures/assistant.png'}.get(name,'product/'+name+'.webp')
  return f'<div class="panel {cls}"><img src="assets/{path}"></div>'
 scene('custom',0,7,title('Custom Widgets v2')+'<div class="ring"></div>'+panel('custom-widget-workbench','workbench')+'<div class="panel preview"></div><div class="chips"><div class="chip">JSX</div><div class="chip">API requests</div><div class="chip">Rendered preview</div></div><div class="note">Beta · credentials stay out of exports</div>')
 scene('drag',7,6,'<div class="top">HOMARR 2.0 / BOARD EDITING</div><div class="title drag-heading"><span>Drag.</span> <span>Check.</span> <span>Commit.</span></div><div class="note">Collision checks before save. Invalid moves roll back.</div>',True)
 scene('advanced',13,5,title('Advanced widget views')+panel('advanced-downloads','advanced')+'<img class="mini mini-one" src="assets/local-captures/downloads-tile.png"><img class="mini mini-two" src="assets/local-captures/timer-tile.png"><div class="note">Compact board tiles → detailed views on supported widgets</div>')
 scene('agent',18,4,title('Assistant + tools')+panel('assistant-control-surface','assistant')+'<div class="permission"><div>Live instance data</div><div>Your permissions</div><div>Changes need approval*</div></div><div class="note">*Default behavior · also available through /api/mcp</div>')
 scene('other',22,5,title('Also in v2')+'<div class="extras">'+''.join(f'<div class="extra"><img src="assets/product/{a}.webp"><b>{b}</b></div>' for a,b in [('community-workshop','Workshop'),('responsive-layouts','Base + Mobile'),('docker-assisted-setup','Docker discovery')])+'</div>')
 scene('end',27,3,'<div class="closing"><img src="assets/logo.svg"><h1>Homarr 2.0</h1><p>homarr.dev</p></div>')
 media='<div class="drag-bg clip" data-start="7" data-duration="6" data-track-index="0"></div><video id="drag-video" class="clip drag-video" src="assets/local-captures/drag.mp4" data-start="7" data-duration="6" data-track-index="0" muted playsinline></video>'
 particles=''.join(f'<i class="particle" id="p{i}" style="background:{["#ff6688","#8feaff","#ffe291","#a0ffc7"][i%4]}"></i>' for i in range(80))
 media+=''.join(f'<audio id="click{i}" src="assets/click.ogg" data-start="{t}" data-duration="0.2" data-track-index="4" data-volume="0.3"></audio>' for i,t in enumerate([.5,1,2,3.3,7,13,18,22,27]))
 js="""const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};
const starts=[0,7,13,18,22,27];const ids=['custom','drag','advanced','agent','other','end'];
ids.forEach((id,i)=>{let s=starts[i];tl.fromTo('#'+id+' .title span',{y:120,rotation:8,opacity:0},{y:0,rotation:0,opacity:1,duration:.55,stagger:.08,ease:'back.out(1.3)'},s+.05);tl.fromTo('#'+id+' .grid',{x:0,y:0},{x:-150,y:90,duration:7,ease:'none'},s);});
tl.fromTo('.workbench',{x:900,y:140,rotation:12,scale:.6},{x:0,y:0,rotation:-3,scale:1,duration:.8,ease:'power4.out'},.1);
tl.fromTo('.chip',{x:-700,rotation:-15,opacity:0},{x:0,rotation:0,opacity:1,duration:.6,stagger:.32,ease:'back.out(1.4)'},.45);
tl.to('.workbench',{scale:.9,x:-60,rotation:2,duration:.6,ease:'power3.inOut'},2.7);
tl.fromTo('.preview',{scale:.15,rotation:12,opacity:0,y:200},{scale:1,rotation:-2,opacity:1,y:0,duration:.7,ease:'back.out(1.3)'},3.0);
tl.to('.preview',{y:-30,rotation:1,duration:1.5,yoyo:true,repeat:1,ease:'sine.inOut'},3.7);
tl.fromTo('.ring',{scale:.2,opacity:.8},{scale:2.7,opacity:0,duration:1.2},3.1);
tl.to('#custom .chips',{x:-850,rotation:-12,duration:.45,ease:'power3.in'},6.45);
tl.to('#custom .panel',{x:1600,rotation:15,duration:.5,stagger:.06,ease:'power3.in'},6.45);
tl.fromTo('.advanced',{scale:.35,x:-700,rotation:-12},{scale:1,x:0,rotation:0,duration:.8,ease:'back.out(1.15)'},13.05);
tl.fromTo('.mini',{x:-600,rotation:-20},{x:0,rotation:0,duration:.65,stagger:.25,ease:'back.out(1.4)'},13.2);
tl.to('.mini-one',{y:-20,rotation:3,duration:1.2,yoyo:true,repeat:2,ease:'sine.inOut'},14);
tl.to('.mini-two',{y:20,rotation:-3,duration:1.2,yoyo:true,repeat:2,ease:'sine.inOut'},14);
tl.to('.advanced',{scale:1.06,x:-25,duration:2,ease:'power2.inOut'},15);
tl.to('#advanced .panel,#advanced .mini',{y:1100,rotation:12,duration:.4,stagger:.05,ease:'power3.in'},17.5);
tl.fromTo('.assistant',{x:1400,rotation:9,scale:.7},{x:0,rotation:0,scale:1,duration:.7,ease:'power4.out'},18);
tl.fromTo('.permission div',{x:-600,scale:.7,opacity:0},{x:0,scale:1,opacity:1,duration:.45,stagger:.4,ease:'back.out(1.4)'},18.2);
tl.to('.assistant',{x:30,scale:1.04,duration:2,ease:'sine.inOut'},19);
tl.to('#agent .panel,#agent .permission',{x:-2000,duration:.4,ease:'power3.in'},21.6);
tl.fromTo('.extra',{y:1000,rotation:15,scale:.6},{y:0,rotation:0,scale:1,duration:.7,stagger:.35,ease:'back.out(1.3)'},22.15);
tl.to('.extra',{y:-25,rotation:-2,duration:1,stagger:.2,yoyo:true,repeat:1,ease:'sine.inOut'},23.9);
tl.to('.extra',{y:-1100,rotation:12,duration:.5,stagger:.1,ease:'power3.in'},26.1);
tl.fromTo('.closing',{scale:.3,rotation:-8,opacity:0},{scale:1,rotation:0,opacity:1,duration:.65,ease:'back.out(1.5)'},27);
[7,13,18,22,27].forEach(t=>{tl.fromTo('.wipe',{x:-2300},{x:2300,duration:.5,ease:'power3.inOut'},t-.25);});
for(let i=0;i<80;i++){let angle=(i*137.508)*Math.PI/180;let radius=450+(i%9)*95;let x=Math.cos(angle)*radius;let y=Math.sin(angle)*radius;tl.fromTo('#p'+i,{x:0,y:0,scale:0,rotation:0,opacity:0},{x:x,y:y,scale:1,rotation:i*57,opacity:1,duration:.8+(i%5)*.08,ease:'power3.out'},27.1);tl.to('#p'+i,{y:y+500,rotation:i*91,opacity:0,duration:1.3,ease:'power1.in'},28.1);}
tl.fromTo('.progress',{scaleX:0},{scaleX:1,duration:30,ease:'none'},0);
"""
 if orbit:
  js=js.replace("rotation:-3,scale:1","rotation:3,scale:1").replace("x:900,y:140,rotation:12,scale:.6","x:400,y:650,rotation:-30,scale:.4").replace("y:1000,rotation:15,scale:.6","x:1300,y:100,rotation:-20,scale:.5").replace("y:0,rotation:0,scale:1,duration:.7,stagger:.35","x:0,y:0,rotation:0,scale:1,duration:.7,stagger:.35")
  js+="tl.to('.workbench',{rotationY:12,rotationX:4,duration:1.4,yoyo:true,repeat:1,ease:'sine.inOut'},.9);tl.to('.preview',{rotationY:-12,duration:1.2,yoyo:true,repeat:1,ease:'sine.inOut'},3.8);"
 js+=f"window.__timelines['{key}']=tl;"
 rootclass=''
 if orbit:rootclass='orbit'
 (p/'index.html').write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>{key}</title><script src="assets/gsap.min.js"></script><style>{css}</style></head><body><div id="root" class="{rootclass}" data-composition-id="{key}" data-width="1920" data-height="1080" data-duration="30">'+media+''.join(scenes)+particles+'<div class="wipe" data-layout-allow-overflow></div><div class="progress"></div></div><script>'+js+'</script></body></html>')
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Homarr — motion cuts</title><style>body{font:18px system-ui;background:#141418;color:#eee;max-width:1300px;margin:40px auto;padding:20px}video{width:100%;border-radius:15px}section{margin:45px 0}p{color:#bbb}a{color:#ff8fa9}button{background:#30303a;color:#fff;border:1px solid #666;padding:10px;margin:5px;cursor:pointer}</style></head><body><h1>Focused local captures · 30 seconds</h1><p>Fresh screenshots from a local Homarr v2 demo. Real Pokédex API preview, tightly cropped Downloads view, and a newly recorded calendar drag. Animations retained.</p>'''
for key in ['impact','orbit']:
 desc='Sharp cuts, spring entrances, flying cards and magenta wipes.'
 if key=='orbit':desc='Cool palette, tilted panels, depth motion and sweeping card entrances.'
 page+=f'<section><h2>{key.title()}</h2><p>{desc}</p><video id="{key}" controls preload="metadata" poster="{key}.jpg" src="{key}.mp4"></video><div>'
 for t,n in [(0,'Custom Widgets'),(7,'DnD'),(13,'Advanced widgets'),(18,'Assistant'),(22,'Other changes'),(27,'Confetti')]:page+=f'<button onclick="playAt(\'{key}\',{t})">{n}</button>'
 page+=f'</div><a href="{key}.mp4" download>Download</a></section>'
page+='''<p><a href="../priority-variants/">Earlier wording comparisons</a></p><script>function playAt(id,t){document.querySelectorAll('video').forEach(v=>v.pause());const v=document.getElementById(id);v.currentTime=t;v.play()}</script></body></html>'''
(O/'index.html').write_text(page)
(O/'README.md').write_text('Two 30s motion edits: Impact and Orbit. Custom Widgets 0-7, actual DnD 7-13, advanced widgets 13-18, Assistant 18-22, other changes 22-27, confetti 27-30. UI imagery remains real; floating panels and confetti are editorial animation. No synthetic product interaction. Local click sounds, no music. Previous versions preserved.\n')
finish=(R/'technical-variants/finish.py').read_text().replace("[('a-release-notes',24),('b-widget-workbench',24),('c-ui-only',18)]","[('impact',30),('orbit',30)]").replace('fps=1/4,scale=480:-1,tile=3x2','fps=1/3,scale=480:-1,tile=5x2')
(O/'finish.py').write_text(finish)
