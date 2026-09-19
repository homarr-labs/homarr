from pathlib import Path
import ast,json,shutil,html
R=Path(__file__).parent;O=R/'priority-variants';O.mkdir(exist_ok=True)
tree=ast.parse((R/'build-variants.py').read_text());css=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CSS' for t in n.targets))
css+='''.copy{top:260px}.screen{left:680px;width:1180px}.copy{width:550px}.preview img{transform-origin:75% 60%}.caption{max-width:1770px;font-size:32px}.caption span{display:block;color:#bbb;font-size:25px;margin-top:10px}.plain .screen{left:55px;top:100px;width:1810px;height:845px}.plain .copy{top:auto;bottom:35px;left:65px;width:1790px;background:#181818ed;padding:18px 24px;z-index:3}.plain h1{font-size:36px;letter-spacing:-.6px;margin:0 0 8px}.plain p{font-size:25px;line-height:1.3}.plain small{display:none}.compact h1{font-size:53px}.compact p{font-size:28px}.notes{color:#ff8787}.chapter{position:absolute;right:65px;bottom:30px;color:#888;font-size:19px}'''
# Each beat: seconds, section, asset, heading, description, framing.
V={
'a-terse':('Terse', '28s · short labels · preview first',[
(5,'Custom Widgets v2','custom-widget-workbench','Custom Widgets v2 · Beta','JSX + API requests + a rendered preview.','preview'),
(3,'Custom Widgets v2','community-workshop','Workshop','Install and share widget definitions.',''),
(6,'Board editing','drag','Rebuilt drag-and-drop','Collision checks. Invalid moves roll back.',''),
(4,'Advanced widgets','advanced-downloads','Advanced widget views','More detail than the board tile.',''),
(4,'Assistant','assistant-control-surface','Assistant','Live data. Permission-checked tools. Approval before changes by default.',''),
(3,'Other changes','responsive-layouts','Base + Mobile layouts','One board, separate layouts.',''),
(3,'Other changes','docker-assisted-setup','Docker discovery + labels','Create dashboard content from discovered services.','')]),
'b-practical':('Practical','34s · explains what changes in use',[
(5,'Custom Widgets v2','custom-widget-workbench','Write JSX. Call an API.','Test the widget in the workbench before putting it on a board.',''),
(4,'Custom Widgets v2','custom-widget-workbench','Inspect the rendered result','This preview shows a successful exchange-rate request.','preview'),
(6,'Board editing','drag','Move a tile. Keep a valid layout.','Moves are checked for collisions before they are saved.',''),
(5,'Advanced widgets','advanced-downloads','Open the detailed view','Keep the board compact; inspect downloads in the advanced view.',''),
(5,'Assistant','assistant-control-surface','Ask the agent about your instance','Reads can run automatically. Changes require approval by default.',''),
(3,'Other changes','community-workshop','Install community widgets','Widget definitions are shared. Credentials stay on your instance.',''),
(3,'Other changes','onboarding-studio','Set up the instance','Admin account, Docker discovery, integrations and a first board.',''),
(3,'Other changes','header-studio','Configure the header','Choose the controls, their positions and their order.','')]),
'c-technical':('Technical','40s · implementation contracts and constraints',[
(6,'Custom Widgets v2','custom-widget-workbench','JSX + requests + typed settings','Fixed-origin API sources. Encrypted credentials stay out of exports.',''),
(5,'Custom Widgets v2','custom-widget-workbench','Validate against a real response','Workbench preview, response data and diagnostics. Custom Widgets remain Beta.','preview'),
(6,'Board editing','drag','Transactional board edits','Collision checks before commit. Invalid moves roll back. Eight-direction resize.',''),
(5,'Advanced widgets','advanced-downloads','Compact tile → advanced view','Supported widgets expose a detailed view. Widget settings have live previews.',''),
(5,'Assistant','assistant-control-surface','An agent with scoped tools','Live Homarr data, existing permissions, approval for changes by default.',''),
(4,'Other changes','mcp-management','The same tools over /api/mcp','API key or OAuth 2.1 + PKCE. No permission bypass.',''),
(3,'Other changes','responsive-layouts','Base, Mobile, breakpoints','Reset from Base creates the Mobile starting point.',''),
(3,'Other changes','docker-assisted-setup','Docker + Podman','Multiple DOCKER_ENDPOINTS. Homepage-compatible labels.',''),
(3,'Other changes','permission-matrix','Before upgrading','SQLite / PostgreSQL. Convert MySQL before upgrading.','')])}
for key,(name,desc,beats) in V.items():
 p=O/key;p.mkdir(exist_ok=True)
 for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,p/f)
 if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)
 clips=[];media=[];animations=[];t=0;chapters=[]
 for i,(d,chapter,asset,title,body,focus) in enumerate(beats):
  ident=f's{i}';mode='compact'
  if key=='a-terse':mode='plain'
  tag=chapter
  if chapter=='Custom Widgets v2':tag+=' · Beta'
  content=f'<div class="bar"><b>HOMARR 2.0</b><span>{html.escape(tag)}</span></div>'
  if not chapters or chapters[-1]['name']!=chapter:chapters.append({'name':chapter,'time':t})
  if asset=='drag':
   mode='clear';media.append(f'<video id="drag" class="clip video" data-start="{t}" data-duration="6" data-track-index="0" src="assets/drag.mp4" muted playsinline></video>')
   content+=f'<div class="caption">{html.escape(title)}<span>{html.escape(body)}</span></div>'
  else:
   content+=f'<div class="copy"><small>{html.escape(tag)}</small><h1>{html.escape(title)}</h1><p>{html.escape(body)}</p></div><div class="screen {focus}"><img src="assets/product/{asset}.webp"></div>'
   if focus=='preview':
    animations.append(f"tl.fromTo('#{ident} .screen img',{{scale:1.35}},{{scale:1.55,duration:{d},ease:'power2.inOut'}},{t});")
   else:animations.append(f"tl.fromTo('#{ident} .screen',{{x:30,opacity:0}},{{x:0,opacity:1,duration:.3,ease:'power2.out'}},{t});")
  clips.append(f'<section id="{ident}" class="clip" data-start="{t}" data-duration="{d}" data-track-index="1"><div class="inner {mode}">{content}</div></section>');t+=d
 js="const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};"+''.join(animations)+f"tl.fromTo('.line',{{scaleX:0}},{{scaleX:1,duration:{t},ease:'none'}},0);window.__timelines['{key}']=tl;"
 (p/'index.html').write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>{name}</title><script src="assets/gsap.min.js"></script><style>{css}</style></head><body><div id="root" data-composition-id="{key}" data-width="1920" data-height="1080" data-duration="{t}">'+''.join(media+clips)+'<div class="line"></div></div><script>'+js+'</script></body></html>')
 (p/'chapters.json').write_text(json.dumps(chapters))
(O/'storyboards.json').write_text(json.dumps(V,indent=2))
page='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Homarr 2.0 — compare wording and density</title><style>body{background:#181818;color:#eee;font:17px system-ui;margin:30px auto;max-width:1300px;padding:20px}h1{font-size:28px}section{margin:50px 0}video{width:100%;max-height:660px;background:#111;border-radius:10px}a{color:#ff8787}p{color:#bbb;line-height:1.5}button{background:#303030;border:1px solid #555;color:#eee;padding:10px 15px;margin:6px 6px 0 0;border-radius:6px;cursor:pointer}nav{display:flex;flex-wrap:wrap;gap:15px}.tag{color:#ff8787}section:target h2{color:#ff8787}</style></head><body><h1>Homarr 2.0 — wording and information density</h1><p>All versions: <span class="tag">Custom Widgets v2 → drag-and-drop → advanced widgets → Assistant → other changes.</span><br>Same release, different explanations. Silent cuts. Actual screenshots and drag recording; screenshot motion is editorial.</p><nav>'''
for key,(name,desc,beats) in V.items():page+=f'<a href="#{key}">{name}</a>'
page+='</nav>'
for key,(name,desc,beats) in V.items():
 page+=f'<section id="{key}"><h2>{name}</h2><p>{desc}</p><video id="v-{key}" controls preload="metadata" poster="{key}.jpg" src="{key}.mp4"></video><div>'
 for c in json.loads((O/key/'chapters.json').read_text()):page+=f'<button onclick="seek(\'v-{key}\',{c["time"]})">{c["time"]}s · {c["name"]}</button>'
 page+=f'</div><p><a href="{key}.mp4" download>Download MP4</a></p></section>'
page+='''<script>function seek(id,t){const v=document.getElementById(id);document.querySelectorAll('video').forEach(x=>{if(x!==v)x.pause()});v.currentTime=t;v.play()}document.querySelectorAll('video').forEach(v=>v.addEventListener('play',()=>document.querySelectorAll('video').forEach(x=>{if(x!==v)x.pause()})))</script></body></html>'''
(O/'index.html').write_text(page)
(O/'README.md').write_text('Three complete release cuts, varying wording and density while keeping the requested priority sequence. Terse 28s, Practical 34s, Technical 40s. Custom Widgets v2 opens each cut and receives 8/9/11 seconds. Other-change order varies. Claims sourced from apps/docs/blog/2026/09-03-homarr-2.0/index.mdx. Product visuals are real release screenshots and the original six-second drag recording. All cuts silent. No new app interactions simulated.\n')
