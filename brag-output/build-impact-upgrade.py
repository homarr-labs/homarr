"""Upgrade-focused release narrative with distinct, genuine editor interactions."""
from pathlib import Path
import re,json,shutil
R=Path(__file__).parent;O=R/'impact-upgrade';P=O/'composition';P.mkdir(parents=True,exist_ok=True)
for f in ['package.json','hyperframes.json']:shutil.copy(R/'composition'/f,P/f)
if not(P/'assets').exists():(P/'assets').symlink_to('../../composition/assets',target_is_directory=True)
s=(R/'impact-showcases/composition/index.html').read_text()
s=s.replace('impact-showcases','impact-upgrade').replace('data-duration="53"','data-duration="61"').replace('duration:53,ease:','duration:61,ease:').replace('assets/showcases/score.wav','assets/upgrade/score.wav')
s=s.replace('function revisedTime(t){if(t>=39.7)return t+10;if(t>=19.7)return t+4;return t;}', 'function revisedTime(t){let position=t;if(t>=39.7)position+=10;else if(t>=19.7)position+=4;if(t>=15.7)position+=8;return position;}')
s=re.sub(r'<video id="editor-(?:context-)?recording"[^>]*></video>','',s)
def clock(m):
 t=float(m.group(1));d=float(m.group(2))
 if t>=16:t+=8
 if t==8 and d==21:d=29
 return f'data-start="{t:g}" data-duration="{d:g}"'
s=re.sub(r'data-start="([\d.]+)" data-duration="([\d.]+)"',clock,s)
s=s.replace("},44.05);","},52.05);").replace("},44.18);","},52.18);").replace("},43.775);","},51.775);")
s='\n'.join(line for line in s.splitlines() if not any("legacy." in line and token in line for token in ["'.edit-move'","'.edit-resize'","'.focus-line'"]))
editor='''<section id="editor" class="clip" data-start="8" data-duration="10" data-track-index="1"><div class="scene clear"><div class="grid" data-layout-allow-overflow></div><div class="top">HOMARR 2.0 · WHAT’S NEW</div><div class="title"><span>New drag-and-drop system</span></div><div class="subtitle dnd-single-copy">Place items precisely and resize from any edge.</div><div class="dnd-multi-copy">Cmd + click to select multiple items, then move them into a container.</div><div class="keyboard-note">Cmd on macOS · Ctrl on Windows / Linux</div></div></section>'''
s=re.sub(r'<section id="editor".*?</section>',editor,s,flags=re.S)
container='''<section id="containers" class="clip" data-start="18" data-duration="6" data-track-index="1"><div class="scene clear"><div class="grid" data-layout-allow-overflow></div><div class="top">HOMARR 2.0 · WHAT’S NEW</div><div class="container-heading"><div class="container-old">Goodbye dynamic zones &amp; groups,</div><div class="container-new">hello <strong>containers</strong>!</div></div><div class="container-subtitle">Keep related apps and widgets together. Move or collapse the whole container.</div></div></section>'''
s=s.replace('<section id="sidebar"',container+'<section id="sidebar"')
media='''<video id="upgrade-drag-recording" class="clip upgrade-demo" src="assets/upgrade/move-resize.mp4" data-start="8" data-duration="4.5" data-track-index="0" muted playsinline></video><video id="upgrade-selection-recording" class="clip upgrade-demo" src="assets/upgrade/multiselect.mp4" data-start="12.5" data-duration="5.5" data-track-index="0" muted playsinline></video><video id="upgrade-container-recording" class="clip container-demo" src="assets/upgrade/containers.mp4" data-start="18" data-duration="6" data-track-index="0" muted playsinline></video>'''
s=s.replace('<video id="sidebar-settings-recording"',media+'<video id="sidebar-settings-recording"')
s=s.replace('</style>','.upgrade-demo{position:absolute;left:75px;top:310px;width:1770px;height:716px;object-fit:contain;border:2px solid #80687b;border-radius:20px;background:#242424}.container-demo{position:absolute;left:150px;top:410px;width:1620px;height:650px;object-fit:contain;border:2px solid #ff779d;border-radius:20px;background:#242424}.container-heading{position:absolute;left:70px;top:100px;z-index:5}.container-old{font-size:49px;font-weight:550;color:#d9d2dc}.container-new{font-size:88px;font-weight:500;line-height:1.3}.container-new strong{font-weight:900;color:#ff779d}.container-subtitle{position:absolute;left:70px;top:310px;font-size:31px;line-height:1.35;color:#ded7df;z-index:5}.dnd-multi-copy{position:absolute;left:70px;top:222px;width:1760px;font-size:33px;line-height:1.35;color:#ded7df;z-index:6}.keyboard-note{position:absolute;right:85px;top:45px;color:#ff9eae;font-size:24px}</style>')
s=s.replace("window.__timelines['impact-upgrade']=tl;",'''tl.set('.dnd-multi-copy,.keyboard-note',{opacity:0},0);
tl.to('.dnd-single-copy',{opacity:0,duration:.15},12.3);
tl.to('.dnd-multi-copy,.keyboard-note',{opacity:1,duration:.2},12.5);
tl.fromTo('.container-old',{x:-800,opacity:0},{x:0,opacity:1,duration:.45,ease:'power3.out'},18.05);
tl.fromTo('.container-new',{y:75,opacity:0},{y:0,opacity:1,duration:.45,ease:'back.out(1.2)'},18.3);
tl.fromTo('.container-subtitle',{y:20,opacity:0},{y:0,opacity:1,duration:.35},18.45);
tl.fromTo('.wipe',{x:-2300},{x:2300,duration:.35,ease:'power3.inOut',immediateRender:false},17.825);
window.__timelines['impact-upgrade']=tl;''')
s=s.replace('<div class="top">HOMARR 2.0</div>','<div class="top">HOMARR 2.0 · WHAT’S NEW</div>')
# Names describe additions to Homarr, rather than presenting established actions as new features.
s=s.replace('Apps&nbsp;</span><span>in&nbsp;</span><span>sidebars&nbsp;','Fixed&nbsp;</span><span>sidebars&nbsp;').replace('Configure&nbsp;</span><span>the&nbsp;</span><span>header&nbsp;','Header&nbsp;</span><span>configuration&nbsp;').replace('<span>Switch boards</span>','<span>Board switcher</span>')
(P/'index.html').write_text(s)
chapters=[(0,'Custom Widgets v2'),(8,'New drag-and-drop'),(12.5,'Cmd-click multi-select'),(18,'Containers'),(24,'Sidebar settings'),(27,'Fixed sidebar'),(32,'Advanced widgets'),(37,'Assistant'),(42,'Onboarding'),(47,'Header configuration'),(52,'Board switcher'),(58,'Ending')]
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
page=(R/'impact-showcases/index.html').read_text();page=re.sub(r'<div><button.*?</div>','<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{name}</button>' for t,name in chapters)+'</div>',page)
page=page.replace('focused showcases','the upgrade').replace('53 seconds','61 seconds').replace('Clean scene handoffs, a real sidebar toggle and scrolling demonstration, and keyboard board switching with a loaded destination.','What changed in Homarr 2.0: a new drag-and-drop system, Cmd-click selection, and containers replacing dynamic zones and groups. Distinct real editor actions, followed by the other new features.').replace('../impact-full/','../impact-showcases/').replace('../composition/assets/showcases/score.wav','../composition/assets/upgrade/score.wav').replace('?v=5','?v=6')
page=re.sub(r'<p style="padding:14px.*?</p>','',page)
page=page.replace('<details><summary>Capture notes</summary><p>','<details><summary>Capture notes</summary><p>The editor demonstrations use a dedicated local board. Command-click selection and bulk Move to are real; selected tiles are not shown moving together by pointer drag because that behavior is not supported by the captured editor. Containers are real local board content. ')
(O/'index.html').write_text(page)
(O/'finish.py').write_text((R/'impact-showcases/finish.py').read_text().replace("('impact',53)","('impact',61)"))
print(P)
