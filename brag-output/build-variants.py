from pathlib import Path
import shutil,json
R=Path(__file__).parent;out=R/'technical-variants';out.mkdir(exist_ok=True)
CSS='''@font-face{font-family:Inter;src:url(assets/inter.woff2)}*{box-sizing:border-box}body{margin:0;background:#181818;color:#eee;font-family:Inter,sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden}.clip,.inner{position:absolute;inset:0}.inner{background:#181818;overflow:hidden}.bar{position:absolute;left:55px;right:55px;top:32px;display:flex;justify-content:space-between;color:#aaa;font-size:22px;letter-spacing:1px}.bar b{color:#ff8787}.copy{position:absolute;left:65px;top:250px;width:570px}h1{font-size:62px;line-height:1.12;letter-spacing:-2px;margin:0 0 32px}p{font-size:29px;line-height:1.55;color:#ccc;margin:0}small{display:block;font-size:22px;color:#ff8787;margin-bottom:25px}.screen{position:absolute;left:710px;top:125px;width:1150px;height:900px;overflow:hidden;border:1px solid #444;border-radius:12px;background:#242424}.screen img{width:100%;height:100%;object-fit:contain}.footer{position:absolute;left:65px;bottom:55px;color:#999;font-size:22px}.line{position:absolute;bottom:0;height:4px;width:100%;background:#fa5252;transform-origin:left;z-index:8}.wide{position:absolute;left:55px;top:125px;width:1810px;height:900px;object-fit:contain}.caption{position:absolute;left:70px;bottom:50px;padding:20px 26px;background:#171717f5;border-left:4px solid #fa5252;z-index:4;font-size:34px}.video{position:absolute;left:55px;top:140px;width:1810px;height:850px;object-fit:contain}.clear{background:transparent}.focus .screen{left:590px;width:1260px}.focus .copy{width:460px}.focus h1{font-size:55px}.focus p{font-size:27px}.minimal .wide{inset:0;width:1920px;height:1080px;object-fit:cover}.minimal .caption{font-size:29px;bottom:45px}.minimal .bar{z-index:6;background:#181818ec;padding:12px 16px;top:20px}.grid{position:absolute;left:60px;top:130px;display:grid;grid-template-columns:repeat(3,580px);gap:28px}.grid img{width:580px;height:387px;object-fit:contain}.ending{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center}.ending img{width:110px;margin-bottom:30px}.ending h1{font-size:85px}.ending p{font-size:30px}.ending small{margin-top:30px}'''
variants={
'a-release-notes':('Release notes',24,[
(0,4,'custom-widget-workbench','Custom Widgets v2','JSX, API requests, actions and typed settings.','Beta'),
(4,6,'drag','Board editing','Collision checks before save. Invalid moves roll back.','Transactional moves + resizes'),
(10,4,'responsive-layouts','Base + Mobile','Separate layouts on the same board. Optional breakpoints.','Layout model'),
(14,5,'mcp-management','/api/mcp','API key or OAuth 2.1 + PKCE. Tools follow your permissions.','External assistants'),
(19,5,'end','Upgrade notes','SQLite / PostgreSQL. Convert MySQL before upgrading.','homarr.dev')]),
'b-widget-workbench':('Widget workbench',24,[
(0,5,'custom-widget-workbench','JSX + your API','Requests, actions and typed settings in one widget definition.','Custom Widgets v2 · Beta'),
(5,5,'custom-widget-workbench','Inspect the result','A real exchange-rate request, rendered in the workbench preview.','Preview + response data'),
(10,5,'custom-widget-post-action','Read and write','GET · POST · PUT · PATCH · DELETE','API actions'),
(15,5,'community-workshop','Export the widget','Credentials stay on your instance, outside exports and Workshop submissions.','Workshop'),
(20,4,'end','Custom Widgets v2','Build → test → install → share','Beta · homarr.dev/workshop')]),
'c-ui-only':('UI reel',18,[
(0,6,'drag','','','Board editing'),
(6,3,'widgets','','','Weather · Timer · Air Quality'),
(9,3,'custom-widget-workbench','','','Custom Widgets v2 · Beta'),
(12,3,'community-workshop','','','Workshop'),
(15,3,'end','Homarr 2.0','homarr.dev','')])}
for key,(name,duration,beats) in variants.items():
 p=out/key;p.mkdir(exist_ok=True)
 for n in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/n,p/n)
 if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
 clips=[];media=[];anim=[]
 for i,(start,d,asset,title,body,tag) in enumerate(beats):
  id=f's{i}';classes='';content=f'<div class="bar"><b>HOMARR 2.0</b><span>{name.upper()} / {i+1:02}</span></div>'
  if asset=='drag':
   media.append(f'<video id="drag" class="clip video" src="assets/drag.mp4" data-start="{start}" data-duration="6" data-track-index="0" muted playsinline></video>');classes='clear';content+=f'<div class="caption">{tag or title}'+(' · Invalid moves roll back' if key.startswith('a') else '')+'</div>'
  elif asset=='end':content+=f'<div class="ending"><img src="assets/logo.svg"><h1>{title}</h1><p>{body}</p><small>{tag}</small></div>'
  elif asset=='widgets':content+='<div class="grid">'+''.join(f'<img src="assets/real-widgets/{w}.png">' for w in ['weather','timer','airQuality','downloads','calendar','countdown'])+f'</div><div class="caption">{tag}</div>'
  elif key.startswith('c'):
   content+=f'<img class="wide" data-layout-allow-overflow src="assets/product/{asset}.webp"><div class="caption">{tag}</div>';classes='minimal'
   anim.append(f"tl.fromTo('#{id} .wide',{{scale:1}},{{scale:1.08,duration:{d},ease:'none'}},{start});")
  else:
   content+=f'<div class="copy"><small>{tag}</small><h1>{title}</h1><p>{body}</p></div><div class="screen"><img src="assets/product/{asset}.webp"></div>'
   if key.startswith('b'):classes='focus'
   if key.startswith('b') and i==1:
    anim.append(f"tl.fromTo('#{id} .screen img',{{scale:1.5,x:-230,y:-80}},{{scale:1.6,x:-270,y:-100,duration:5,ease:'power2.inOut'}},{start});")
   else:anim.append(f"tl.fromTo('#{id} .screen',{{x:45,opacity:0}},{{x:0,opacity:1,duration:.35,ease:'power2.out'}},{start});")
  clips.append(f'<section id="{id}" class="clip" data-start="{start}" data-duration="{d}" data-track-index="1"><div class="inner {classes}">{content}</div></section>')
 if key.startswith('c'):
  for i,t in enumerate([6,9,12,15]):media.append(f'<audio id="click{i}" src="assets/click.ogg" data-start="{t}" data-duration="0.2" data-track-index="3" data-volume="0.3"></audio>')
 js="const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};"+''.join(anim)+f"tl.fromTo('.line',{{scaleX:0}},{{scaleX:1,duration:{duration},ease:'none'}},0);window.__timelines['{key}']=tl;"
 (p/'index.html').write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>{name}</title><script src="assets/gsap.min.js"></script><style>{CSS}</style></head><body><div id="root" data-composition-id="{key}" data-width="1920" data-height="1080" data-duration="{duration}">'+''.join(media+clips)+'<div class="line"></div></div><script>'+js+'</script></body></html>')
(out/'storyboards.json').write_text(json.dumps(variants,indent=2))
(out/'README.md').write_text('Three alternatives for technical users. A: 24s release notes with upgrade constraint. B: 24s focused widget workbench walkthrough. C: 18s UI reel with feature names only. A/B silent; C UI clicks only. Screenshots and drag recording are existing real release-blog/demo captures; widget crops are earlier audit demo captures. Camera movement is editorial, not newly recorded interaction. Claims checked against the release article. Existing cuts preserved.\n')
html='''<!doctype html><html><head><meta charset="utf-8"><title>Homarr 2.0 — technical cuts</title><style>body{background:#181818;color:#eee;font:17px system-ui;margin:35px auto;max-width:1300px;padding:20px}h1{font-size:28px}section{margin:45px 0}video{width:100%;max-height:650px;background:#111}a{color:#ff8787}p{color:#bbb}</style></head><body><h1>Homarr 2.0 — three alternate cuts</h1>'''
for key,(name,d,beats) in variants.items():html+=f'<section><h2>{name} · {d}s</h2><p>'+{'a-release-notes':'Concrete changes and an upgrade constraint. Silent.','b-widget-workbench':'One feature, explained with API and credential details. Silent.','c-ui-only':'Minimal labels. Real UI, short cuts, click sounds.'}[key]+f'</p><video controls preload="metadata" poster="{key}.jpg" src="{key}.mp4"></video><p><a href="{key}.mp4" download>Download MP4</a></p></section>'
(out/'index.html').write_text(html+'</body></html>')
