"""Seven-second kinetic opener; existing 61-second film remains intact."""
from pathlib import Path
import json, html, shutil, re

R = Path(__file__).parent
O = R / 'impact-intro'
P = O / 'composition'
P.mkdir(parents=True, exist_ok=True)
for name in ['package.json', 'hyperframes.json']:
    shutil.copy(R / 'impact-upgrade/composition' / name, P / name)
if not (P / 'assets').exists():
    (P / 'assets').symlink_to('../../composition/assets', target_is_directory=True)

features = [
    ('Custom Widgets v2', 'JSX. APIs. Live preview.', 'local-captures/workbench.png', 340),
    ('Containers', 'Move related items together.', 'intro/containers.jpg', 290),
    ('Advanced widgets', 'Hold Shift for one second.', 'local-captures/advanced-downloads.png', 360),
    ('Onboarding studio', 'From instance to first board.', 'explained/onboarding.png', 340),
    ('New drag-and-drop', 'Select, move, resize.', 'intro/editor.jpg', 300),
    ('Assistant + tools', 'Your dashboard, in context.', 'dashboard-cut/assistant-actions.png', 250),
    ('Header configuration', 'Arrange the header your way.', 'full-impact/header-zones.png', 260),
    ('Custom widgets on your board', 'Built by you. Running in Homarr.', 'dashboard-cut/custom-dashboard.png', 350),
]
columns = []
for ci, group in enumerate([features[:4], features[4:]]):
    cards = ''.join(f'<article class="feature-card" style="height:{height}px"><div class="card-image"><img src="assets/{asset}" alt=""></div><div class="card-caption"><b>{title}</b><span>{desc}</span></div></article>' for title, desc, asset, height in group)
    columns.append(f'<div class="masonry-column col-{ci}" data-layout-allow-overflow>{cards}</div>')

integrations = json.loads((R / 'composition/assets/integrations.json').read_text())
registry = (R.parent / 'packages/definitions/src/integration.ts').read_text()
names = re.findall(r'^    name: "([^"]+)"', registry, re.M)
assert set(names) - {'Mock'} == {i['name'] for i in integrations}
rows = []
for index in range(3):
    group = integrations[index::3]
    chips = ''.join(f'<div class="integration" data-layout-allow-overflow><img src="{i["asset"]}" alt=""><span>{html.escape(i["name"])}</span></div>' for i in group)
    rows.append(f'<div class="marquee-window"><div class="marquee-row row-{index}" data-layout-allow-overflow>{chips}</div></div>')

css = '''
@font-face{font-family:Inter;src:url(assets/inter.woff2)}
*{box-sizing:border-box}body{margin:0;background:#141418;color:#fff;font-family:Inter,sans-serif}
#root{width:100%;height:100%;overflow:hidden;position:relative;background:#141418}
.intro{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 38% 30%,#442436 0%,#19171e 47%,#111216 85%)}
.mesh{position:absolute;inset:0;background-image:linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px);background-size:64px 64px}
.brand{position:absolute;left:72px;top:56px;display:flex;align-items:center;gap:18px;font-size:21px;letter-spacing:3px;color:#ffc0cc}.brand img{width:42px;height:42px}
.headline{position:absolute;left:72px;top:197px;width:735px;z-index:3;transform-origin:left center}
.line-mask{overflow:hidden;height:117px}.line{font-size:106px;line-height:1.08;font-weight:730;letter-spacing:-6px}
.wordmark{font-size:143px;line-height:1.15;letter-spacing:-8px;word-spacing:16px;font-weight:850;color:#ff779d;margin-top:7px;white-space:nowrap}
.release-note{position:absolute;left:78px;top:617px;font-size:24px;color:#e6cbd9;letter-spacing:1px}
.accent{position:absolute;left:75px;top:591px;width:110px;height:5px;background:#ff779d;transform-origin:left}
.masonry-window{position:absolute;left:850px;top:0;width:1030px;height:725px;overflow:hidden;mask-image:linear-gradient(transparent,#000 7%,#000 91%,transparent)}
.masonry-column{position:absolute;top:0;width:477px;display:flex;flex-direction:column;gap:22px}.col-0{left:0}.col-1{left:501px}
.feature-card{flex-shrink:0;overflow:hidden;border:1px solid #776170;border-radius:21px;background:#222128;box-shadow:0 14px 40px #0006;display:flex;flex-direction:column}
.card-image{flex:1;min-height:0;background:#242424;overflow:hidden}.card-image img{width:100%;height:100%;object-fit:cover;object-position:center top}
.card-image img[src*="header-zones"],.card-image img[src*="assistant-actions"]{object-fit:contain;object-position:center}.card-caption{padding:17px 20px 19px;background:#27222e;border-top:1px solid #54404e}.card-caption b{display:block;font-size:25px;letter-spacing:-.5px}.card-caption span{display:block;font-size:18px;color:#e0c9d8;margin-top:7px}
.integrations-heading{position:absolute;left:74px;top:735px;font-size:17px;letter-spacing:3px;color:#ffc0cc}
.marquees{position:absolute;left:0;right:0;top:778px;height:290px;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.marquee-window{height:88px;position:relative;overflow:hidden;margin-bottom:7px}.marquee-row{display:flex;gap:12px;position:absolute;left:0;top:0;width:max-content}
.integration{width:174px;height:86px;flex-shrink:0;background:#24242b;border:1px solid #514250;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:7px 3px}
.integration img{width:41px;height:41px;object-fit:contain}.integration span{font-size:16px;line-height:21px;color:#eee9f0;white-space:nowrap}
.pulse-ring{position:absolute;left:125px;top:150px;width:500px;height:500px;border:1px solid #ff779d;border-radius:50%;opacity:.18}
.wipe{position:absolute;inset:0;background:#ff779d;z-index:20;transform-origin:right center}
'''
markup = f'''<section id="intro" class="clip intro" data-start="0" data-duration="7" data-track-index="0"><div class="mesh"></div><div class="pulse-ring"></div><div class="brand"><img src="assets/logo.svg" alt="">HOMARR / VERSION 2</div><div class="headline"><div class="line-mask"><div class="line line-one">Let's talk</div></div><div class="line-mask"><div class="line line-two">about</div></div><div class="wordmark">Homarr v2</div></div><div class="accent"></div><div class="release-note">A closer look at what changed.</div><div class="masonry-window">{''.join(columns)}</div><div class="integrations-heading">55 INTEGRATIONS · YOUR EXISTING SERVICES, CONNECTED</div><div class="marquees">{''.join(rows)}</div><div class="wipe"></div></section>'''
script = '''
const tl=gsap.timeline({paused:true});
tl.fromTo('.line-one',{y:125},{y:0,duration:.48,ease:'power4.out'},0);
tl.fromTo('.line-two',{y:125},{y:0,duration:.48,ease:'power4.out'},.14);
tl.fromTo('.wordmark',{x:-780,scale:.85},{x:0,scale:1,duration:.65,ease:'back.out(1.25)'},.26);
tl.fromTo('.brand',{y:-70,opacity:0},{y:0,opacity:1,duration:.45,ease:'power3.out'},.05);
tl.fromTo('.accent',{scaleX:0},{scaleX:1,duration:.45,ease:'power3.out'},.7);
tl.fromTo('.release-note',{y:25,opacity:0},{y:0,opacity:1,duration:.4},.85);
tl.to('.headline',{x:18,y:-12,duration:4.8,ease:'sine.inOut'},1.2);
tl.fromTo('.pulse-ring',{scale:.7,opacity:.05},{scale:1.45,opacity:.23,duration:6.7,ease:'sine.out'},0);
tl.fromTo('.masonry-window',{x:160,opacity:0},{x:0,opacity:1,duration:.65,ease:'power3.out'},.05);
tl.fromTo('.col-0',{y:40},{y:-700,duration:7,ease:'none'},0);
tl.fromTo('.col-1',{y:-480},{y:45,duration:7,ease:'none'},0);
tl.fromTo('.row-0',{x:24},{x:-1690,duration:6,ease:'none'},0);
tl.fromTo('.row-1',{x:-1690},{x:24,duration:6,ease:'none'},0);
tl.fromTo('.row-2',{x:24},{x:-1500,duration:6,ease:'none'},0);
tl.fromTo('.integrations-heading',{opacity:0},{opacity:1,duration:.3},.15);
tl.fromTo('.wipe',{scaleX:0},{scaleX:1,duration:.27,ease:'power3.in'},6.73);
window.__timelines['impact-intro']=tl;
'''
(P / 'index.html').write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>Let\'s talk about Homarr v2</title><script src="assets/gsap.min.js"></script><style>{css}</style></head><body><div id="root" data-composition-id="impact-intro" data-width="1920" data-height="1080" data-duration="7">{markup}</div><script>{script}</script></body></html>')
chapters = [(0, 'Intro + integrations')] + [(t+7, label) for t, label in json.loads((R/'impact-upgrade/storyboard.json').read_text())]
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
page=(R/'impact-upgrade/index.html').read_text().replace('the upgrade','the intro').replace('61 seconds','68 seconds')
page=re.sub(r'<div><button.*?</div>','<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{label}</button>' for t,label in chapters)+'</div>',page)
page=page.replace('What changed in Homarr 2.0: a new drag-and-drop system, Cmd-click selection, and containers replacing dynamic zones and groups. Distinct real editor actions, followed by the other new features.', 'Let’s talk about Homarr v2. A kinetic opener with real feature previews and all 55 integrations, followed by the full upgrade showcase.')
page=page.replace('../impact-showcases/','../impact-upgrade/').replace('?v=6','?v=7').replace('../composition/assets/upgrade/score.wav','score.wav').replace('Drag/resize footage is gently accelerated (1.12×). ', '')
page=re.sub(r'<p style="padding:14px.*?</p>','',page)
(O/'index.html').write_text(page)
(O/'integrations-manifest.json').write_text(json.dumps(integrations,indent=2))
print(P)
