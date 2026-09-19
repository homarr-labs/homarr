from pathlib import Path
import re,json,shutil

R=Path(__file__).parent
O=R/'impact-widgets'
for part in ['intro','widgets']:
    p=O/part;p.mkdir(parents=True,exist_ok=True)
    for name in ['package.json','hyperframes.json']:shutil.copy(R/'impact-intro/composition'/name,p/name)
    if not (p/'assets').exists():(p/'assets').symlink_to('../../composition/assets',target_is_directory=True)

s=(R/'impact-intro/composition/index.html').read_text().replace('impact-intro','impact-widgets-intro')
# The complete title, logo and product previews are visible in the encoded first frame.
s=s.replace("{y:125},{y:0", "{y:0},{y:0")
s=s.replace("{x:-780,scale:.85},{x:0,scale:1", "{x:0,scale:1},{x:0,scale:1")
s=s.replace("{y:-70,opacity:0},{y:0,opacity:1", "{y:0,opacity:1},{y:0,opacity:1")
s=s.replace("{y:25,opacity:0},{y:0,opacity:1", "{y:0,opacity:1},{y:0,opacity:1")
s=s.replace("{x:160,opacity:0},{x:0,opacity:1", "{x:0,opacity:1},{x:0,opacity:1")
s=s.replace("'.integrations-heading',{opacity:0}", "'.integrations-heading',{opacity:1}")
s=s.replace("{y:-700,duration:7", "{y:-400,duration:7").replace("{y:45,duration:7", "{y:-120,duration:7")
s=s.replace("{x:24},{x:-1690,duration:6", "{x:24},{x:-466,duration:7")
s=s.replace("{x:-1690},{x:24,duration:6", "{x:-1200},{x:-710,duration:7")
s=s.replace("{x:24},{x:-1500,duration:6", "{x:-800},{x:-1290,duration:7")
s=re.sub(r"tl.fromTo\('\.wordmark'.*?;\n",'',s)
s=s.replace('<div class="card-caption"><b>', '<div class="card-caption"><b data-layout-allow-occlusion>')
s=re.sub(r'(<div class="card-caption">.*?</b>)<span>',r'\1<span data-layout-allow-occlusion>',s)
s=s.replace("window.__timelines['impact-widgets-intro']=tl;", "tl.to('.wordmark',{scale:1.025,duration:.3,yoyo:true,repeat:1,ease:'sine.inOut'},.2);\nwindow.__timelines['impact-widgets-intro']=tl;")
(O/'intro/index.html').write_text(s)

css='''
@font-face{font-family:Inter;src:url(assets/inter.woff2)}*{box-sizing:border-box}body{margin:0;font-family:Inter,sans-serif;color:#fff;background:#141418}
#root{width:100%;height:100%;position:relative;overflow:hidden;background:radial-gradient(ellipse at 70% 40%,#3d2433,#141418 70%)}
.clip{position:absolute;inset:0;overflow:hidden}.mesh{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:80px 80px}
.top{position:absolute;left:70px;top:42px;font-size:23px;letter-spacing:3px;color:#ff9eae}.title{position:absolute;left:70px;top:110px;font-size:88px;font-weight:750;letter-spacing:-3px}.subtitle{position:absolute;left:75px;top:223px;font-size:32px;color:#ded7df}
.panel{position:absolute;background:#24242b;border:2px solid #80687b;border-radius:23px;overflow:hidden;box-shadow:0 25px 60px #0005}
.air{left:75px;top:322px;width:690px;height:310px}.countdown{left:75px;top:665px;width:690px;height:325px}.timer-shell{left:815px;top:322px;width:1030px;height:668px;background:#24242b}
.label{position:absolute;left:28px;top:22px;font-size:34px;font-weight:720;z-index:4}.new{position:absolute;right:25px;top:27px;font-size:18px;letter-spacing:2px;color:#ff9eae}
.caption{position:absolute;left:28px;right:25px;bottom:20px;font-size:23px;line-height:1.4;color:#e5d6e0;z-index:4}
.air img{position:absolute;left:25px;top:74px;width:360px;height:170px;object-fit:contain;border-radius:15px}.air-detail{position:absolute;left:414px;top:111px;font-size:25px;line-height:1.5;width:225px;color:#e5d6e0}
.countdown img{position:absolute;left:20px;top:85px;width:330px;height:165px;object-fit:contain;border-radius:14px}.count-detail{position:absolute;left:380px;top:120px;width:255px;font-size:25px;line-height:1.5;color:#e5d6e0}
.timer-video{position:absolute;left:840px;top:408px;width:980px;height:489px;object-fit:contain;border-radius:18px;background:#242424}
.timer-shell .caption{font-size:26px;bottom:26px}.timer-label{position:absolute;left:1545px;top:908px;font-size:19px;color:#ff9eae;z-index:4}
.pulse{position:absolute;left:75px;top:1030px;width:1770px;height:4px;background:#ff779d;transform-origin:left}
'''
markup='''<div class="mesh"></div><section id="widget-showcase" class="clip" data-start="0" data-duration="8" data-track-index="0"><div class="top">HOMARR 2.0 · NEW WIDGETS</div><div class="title">Air Quality. Countdown. Timer.</div><div class="subtitle">Check local air quality, track upcoming events, and time focus sessions.</div><div class="panel air"><div class="label">Air Quality</div><div class="new">NEW</div><img src="assets/new-widgets/air-quality.png"><div class="air-detail">AQI and trends for your location.</div><div class="caption">European and US AQI scales supported.</div></div><div class="panel countdown"><div class="label">Countdown</div><div class="new">NEW</div><img src="assets/new-widgets/countdown-focused.png"><div class="count-detail">Keep the next event in view.</div><div class="caption">Time remaining, with a progress indicator.</div></div><div class="panel timer-shell"><div class="label">Timer</div><div class="new">NEW</div><div class="caption">Run a timer or use Pomodoro focus and break sessions.</div></div><div class="pulse"></div></section><video class="clip timer-video" id="new-timer-demo" src="assets/new-widgets/timer.mp4" data-start="0" data-duration="8" data-track-index="1" muted playsinline></video>'''
js='''const tl=gsap.timeline({paused:true});
tl.fromTo('.title',{y:30,opacity:0},{y:0,opacity:1,duration:.35,ease:'power3.out'},0);
tl.fromTo('.subtitle',{y:16,opacity:0},{y:0,opacity:1,duration:.3},.12);
tl.fromTo('.air',{x:-80,opacity:0},{x:0,opacity:1,duration:.45,ease:'power3.out'},.05);
tl.fromTo('.countdown',{x:-80,opacity:0},{x:0,opacity:1,duration:.45,ease:'power3.out'},.15);
tl.fromTo('.timer-shell',{y:30,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out'},.1);
tl.fromTo('.pulse',{scaleX:0},{scaleX:1,duration:8,ease:'none'},0);
tl.to('.air',{borderColor:'#ff779d',duration:.25},1.2);
tl.to('.countdown',{borderColor:'#ff779d',duration:.25},2.8);
tl.to('.timer-shell',{borderColor:'#ff779d',duration:.25},4.4);
window.__timelines['new-widgets']=tl;'''
(O/'widgets/index.html').write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>Three new widgets</title><script src="assets/gsap.min.js"></script><style>{css}</style></head><body><div id="root" data-composition-id="new-widgets" data-width="1920" data-height="1080" data-duration="8">{markup}</div><script>{js}</script></body></html>')
chapters=[]
for t,label in json.loads((R/'impact-intro/storyboard.json').read_text()):
    if t>=44:t+=8
    chapters.append((t,label))
chapters.append((44,'New widgets'));chapters.sort()
(O/'storyboard.json').write_text(json.dumps(chapters,indent=2))
page=(R/'impact-intro/index.html').read_text().replace('the intro','new widgets').replace('68 seconds','76 seconds').replace('?v=7','?v=8').replace('../impact-upgrade/','../impact-intro/')
page=page.replace('A kinetic opener with real feature previews and all 55 integrations, followed by the full upgrade showcase.', 'A fully visible opening frame, a slower integration marquee, and a new chapter showing Air Quality, Countdown and Timer.')
page=re.sub(r'<p style="padding:14px.*?</p>','',page)
page=re.sub(r'<div><button.*?</div>','<div>'+''.join(f'<button onclick="const v=document.getElementById(\'film\');v.currentTime={t};v.play()">{label}</button>' for t,label in chapters)+'</div>',page)
page=page.replace('<details><summary>Capture notes</summary><p>','<details><summary>Capture notes</summary><p>The new widget chapter uses fresh local captures: Air Quality, Countdown and a real Timer start/pause/reset recording. The intro marquee shows a slower selection from the 55-integration catalog. ')
(O/'index.html').write_text(page)
print(O)
