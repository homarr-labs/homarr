"""Retain the approved treatment, with clean handoffs and actual feature demonstrations."""
from pathlib import Path
import re, json, shutil
R=Path(__file__).parent; O=R/'impact-showcases'; P=O/'composition';P.mkdir(parents=True,exist_ok=True)
for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,P/f)
if not (P/'assets').exists():(P/'assets').symlink_to('../../composition/assets',target_is_directory=True)
s=(R/'impact-full/composition/index.html').read_text()
# Clear outgoing surfaces entirely once their focused replacement arrives.
s=s.replace('opacity:.25,duration:.6','opacity:0,duration:.35')
s=s.replace('scale:1.06,x:35,opacity:.3,duration:3.4','scale:1.06,x:35,opacity:0,duration:.35')
# Decorative old screenshots have no information to add behind the focused views.
for cls in ['onboarding','header-shot','end-board','end-workbench']:
 s=re.sub(r'<(?:div|img) class="(?:panel )?'+cls+r'"[^>]*>(?:<img[^>]*></div>)?', '', s)
# Remove obsolete animations, including the detached sidebar stills.
lines=s.splitlines();s='\n'.join(line for line in lines if not any("tl." in line and target in line for target in ["'.onboarding'","'#onboarding .panel'","'.header-shot'","'#header .header-shot'","'.end-board'","'.end-workbench'","'.rail-"]))
s=re.sub(r'<img class="rail-(?:top|bottom)"[^>]*>','',s).replace('<div class="rail-link"></div>','')
s=s.replace('Keep your app launchers beside the board as you scroll through widgets.','Enable a fixed sidebar. Your apps stay in place while the dashboard scrolls.')
# Preserve existing animation clock, mapping two inserted time ranges to the new cut.
s=s.replace('const tl=gsap.timeline({paused:true});', '''const tl=gsap.timeline({paused:true});
function revisedTime(t){if(t>=39.7)return t+10;if(t>=19.7)return t+4;return t;}
const legacy={fromTo:(el,a,b,t)=>tl.fromTo(el,a,b,revisedTime(t)),to:(el,a,t)=>tl.to(el,a,revisedTime(t))};''')
script_start=s.index('window.__timelines=');s=s[:script_start]+s[script_start:].replace('tl.fromTo','legacy.fromTo').replace('tl.to','legacy.to')
s=s.replace('duration:43,ease:', 'duration:53,ease:')
def retime(m):
 t=float(m.group(1));d=float(m.group(2))
 if t>=40:t+=10
 elif t>=20:t+=4
 if t==16:d=8
 if d==43:d=53
 if d==17:d=21
 return f'data-start="{t:g}" data-duration="{d:g}"'
s=re.sub(r'data-start="([\d.]+)" data-duration="([\d.]+)"',retime,s)
s=s.replace('data-duration="43"','data-duration="53"').replace('impact-full','impact-showcases').replace('assets/full-impact/score.wav','assets/showcases/score.wav')
s=re.sub(r'<video id="sidebar-recording"[^>]*></video>','''<video id="sidebar-settings-recording" class="clip settings-video" src="assets/showcases/sidebar-settings.mp4" data-start="16" data-duration="3" data-track-index="0" muted playsinline></video><video id="sidebar-scroll-recording" class="clip showcase-video" src="assets/showcases/sidebar-scroll.mp4" data-start="19" data-duration="5" data-track-index="0" muted playsinline></video><video id="switcher-recording" class="clip showcase-video" src="assets/showcases/board-switcher.mp4" data-start="44" data-duration="0.75" data-track-index="0" muted playsinline></video><video id="switcher-focus-recording" class="clip switcher-focus-video" src="assets/showcases/board-switcher-focus.mp4" data-start="44.75" data-duration="2.4" data-media-start="0.75" data-track-index="0" muted playsinline></video><video id="switcher-destination-recording" class="clip showcase-video" src="assets/showcases/board-switcher.mp4" data-start="47.15" data-duration="2.85" data-media-start="3.15" data-track-index="0" muted playsinline></video>''',s)
# Each real recording keeps its full explanatory image unobscured.
s=s.replace('</style>', '.settings-video{position:absolute;left:190px;top:335px;width:1540px;height:650px;object-fit:contain;border:2px solid #80687b;border-radius:20px;background:#242424}.showcase-video{position:absolute;left:75px;top:310px;width:1770px;height:716px;object-fit:contain;border:2px solid #80687b;border-radius:20px;background:#242424}.switcher-focus-video{position:absolute;left:285px;top:350px;width:1350px;height:650px;object-fit:contain;border-radius:24px}.switcher-key{position:absolute;right:85px;top:55px;font-size:25px;color:#ff9eae}.assistant-board{opacity:1}</style>')
new='''<section id="switcher" class="clip" data-start="44" data-duration="6" data-track-index="1"><div class="scene clear"><div class="grid" data-layout-allow-overflow></div><div class="top">HOMARR 2.0</div><div class="title"><span>Switch boards</span></div><div class="subtitle">Press Shift + C, type a board name, then press Enter to switch.</div><div class="switcher-key">SHIFT + C</div></div></section>'''
s=s.replace('<section id="end"',new+'<section id="end"')
s=s.replace("window.__timelines['impact-showcases']=tl;",'''tl.fromTo('#switcher .title span',{y:70,opacity:0},{y:0,opacity:1,duration:.45,ease:'power3.out'},44.05);
tl.fromTo('#switcher .subtitle',{y:18,opacity:0},{y:0,opacity:1,duration:.4},44.18);
tl.fromTo('.wipe',{x:-2300},{x:2300,duration:.45,ease:'power3.inOut',immediateRender:false},43.775);
window.__timelines['impact-showcases']=tl;''')
(P/'index.html').write_text(s)
chapters=[(0,'Custom Widgets'),(8,'Drag + resize'),(16,'Sidebar settings'),(19,'Fixed sidebar'),(24,'Advanced widgets'),(29,'Assistant'),(34,'Onboarding'),(39,'Header'),(44,'Board switcher'),(50,'Ending')]
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
page=(R/'impact-full/index.html').read_text();page=re.sub(r'<div><button.*?</div>', '<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{name}</button>' for t,name in chapters)+'</div>',page)
page=page.replace('full treatment','focused showcases').replace('43 seconds','53 seconds').replace('The layered UI treatment now runs through every feature: real board context, focused control crops, moving details and synchronized TIKS sound cues.','Clean scene handoffs, a real sidebar toggle and scrolling demonstration, and keyboard board switching with a loaded destination.').replace('../impact-dashboard/','../impact-full/').replace('../composition/assets/full-impact/score.wav','../composition/assets/showcases/score.wav').replace('?v=4','?v=5')
page=page.replace('Dragging, resizing and sidebar scrolling are newly recorded local browser video, encoded directly from WebM to MP4.','Sidebar settings, scrolling, and board switching are new 60 fps recordings from the isolated local Homarr demo. The sidebar recording preserves the same app position through a 630 px board scroll. The toggle is genuinely enabled in settings; the existing enabled layout is retained.').replace('43-second','53-second')
(O/'index.html').write_text(page)
finish=(R/'impact-full/finish.py').read_text().replace("('impact',43)","('impact',53)").replace('tile=4x3','tile=4x4');(O/'finish.py').write_text(finish)
print(P)
