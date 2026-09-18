from pathlib import Path
import json
import re
import shutil

R = Path(__file__).resolve().parent
S = R / "impact-stream"
O = R / "impact-calm"
O.mkdir(exist_ok=True)

for name in ["intro", "ending"]:
    target = O / name
    target.mkdir(exist_ok=True)
    source = S / name
    for filename in ["index.html", "hyperframes.json", "package.json"]:
        shutil.copy(source / filename, target / filename)
    if not (target / "assets").exists():
        (target / "assets").symlink_to("../../composition/assets", target_is_directory=True)

for name in ["workshop", "widgets", "integrations", "custom", "assistant", "statistics", "header"]:
    target = O / name
    if not target.exists():
        target.symlink_to("../impact-stream/" + name, target_is_directory=True)

for name in ["score.wav", "sound-cues.json"]:
    target = O / name
    if target.is_symlink():
        target.unlink()

for name in ["storyboard.json", "opening-integrations.json"]:
    shutil.copy(S / name, O / name)

# Reveal the intro half a second earlier.
path = O / "intro/index.html"
source = path.read_text()
source = source.replace(
    "tl.fromTo('.integration-backdrop',{opacity:1},{opacity:0,duration:1,ease:'sine.inOut'},3);",
    "tl.fromTo('.integration-backdrop',{opacity:1},{opacity:0,duration:1,ease:'sine.inOut'},2.5);",
)
path.write_text(source)

# Give the outro a quiet reveal before one finite double-cannon burst.
path = O / "ending/index.html"
source = path.read_text()
source = source.replace("Workshop merch giveaway.", "Homarr v2 Workshop contest.")
source = source.replace(
    "Our <strong>favorite Workshop submissions</strong> win exclusive Homarr merch at year’s end.",
    "Submit before Christmas. The creators of our <strong>favorite Workshop submissions</strong> get exclusive Homarr merch.",
)
source = source.replace(
    "Funded by your donations. Thank you.",
    "We’re excited to see what you make Homarr v2 do.",
)
source = source.replace(
    "Better get cooking if you want to wear some dope lobster merch.",
    "Go cook something weird.",
)
source = source.replace(
    ".confetti{position:absolute;inset:0;width:1920px;height:1080px;z-index:7;pointer-events:none}",
    ".confetti{position:absolute;inset:0;width:1920px;height:1080px;z-index:7;pointer-events:none}.ending-transition{position:absolute;inset:0;background:#141418;z-index:10;pointer-events:none}",
)
source = source.replace(
    '<section id="ending-scene" class="clip" data-start="0" data-duration="7" data-track-index="0"><div class="grid">',
    '<section id="ending-scene" class="clip" data-start="0" data-duration="7" data-track-index="0"><div class="ending-transition"></div><div class="grid">',
)
old_draw = "function draw(t){ctx.clearRect(0,0,1920,1080);for(let i=0;i<640;i++){let x,y;const r=rand(i+1),q=rand(i+911);if(i<360){x=r*2100-90+Math.sin(t*2+i)*55;y=((q*2100+t*(190+rand(i+22)*180))%1800)-450;}else{const side=i%2;const a=(t%4.8)-(i%3)*.36;const u=Math.max(0,a);const origin=side*1920;const speed=450+rand(i+13)*520;x=origin+(1-side*2)*speed*u;y=1070-(780+q*340)*u+240*u*u;if(a<0)continue;}ctx.save();ctx.translate(x,y);ctx.rotate(i+t*(2+r*5));ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.85;ctx.fillRect(-5,-8,7+q*8,10+r*14);ctx.restore();}}"
new_draw = "function draw(t){ctx.clearRect(0,0,1920,1080);const burstAt=1.15;for(let i=0;i<640;i++){let x,y,spinTime;const r=rand(i+1),q=rand(i+911);if(i<360){const born=burstAt+rand(i+503)*1.4;const age=t-born;if(age<0)continue;const startY=-80-q*180;const speed=420+rand(i+22)*260;x=r*2100-90+Math.sin(age*2+i)*55;y=startY+speed*age;spinTime=age;}else{const side=i%2;const age=t-burstAt-(i%4)*.025;if(age<0)continue;const velocity=780+q*340;const origin=side*1920;const speed=450+rand(i+13)*520;x=origin+(1-side*2)*speed*age;y=1070-velocity*age+240*age*age;spinTime=age;}ctx.save();ctx.translate(x,y);ctx.rotate(i+spinTime*(2+r*5));ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.88;ctx.fillRect(-5,-8,7+q*8,10+r*14);ctx.restore();}}"
if old_draw not in source:
    raise RuntimeError("ending draw function changed")
source = source.replace(old_draw, new_draw)
source = source.replace(
    "const clock={t:0};draw(0);tl.to(clock,{t:7,duration:7,ease:'none',onUpdate:()=>draw(clock.t)},0);",
    "const clock={t:0};draw(0);tl.to(clock,{t:7,duration:7,ease:'none',onUpdate:()=>draw(clock.t)},0);tl.fromTo('.ending-transition',{opacity:1},{opacity:0,duration:.7,ease:'power2.inOut'},0);",
)
source = source.replace(
    "tl.fromTo('.ending-logo',{scale:.92},{scale:1,duration:.65,ease:'back.out(1.4)'},0);",
    "tl.fromTo('.ending-logo',{scale:.96,opacity:0},{scale:1,opacity:1,duration:.65,ease:'power3.out'},.3);",
)
source = source.replace(
    "tl.fromTo('.ending-title',{y:30,opacity:0},{y:0,opacity:1,duration:.6},.15);tl.fromTo('.ending-prize',{y:35,opacity:0},{y:0,opacity:1,duration:.5},.3);tl.fromTo('.ending-thanks',{y:25,opacity:0},{y:0,opacity:1,duration:.5},.55);tl.fromTo('.ending-sub',{y:15,opacity:0},{y:0,opacity:1,duration:.5},.75);",
    "tl.fromTo('.ending-title',{y:24,opacity:0},{y:0,opacity:1,duration:.55,ease:'power2.out'},.42);tl.fromTo('.ending-prize',{y:28,opacity:0},{y:0,opacity:1,duration:.5,ease:'power2.out'},.58);tl.fromTo('.ending-thanks',{y:20,opacity:0},{y:0,opacity:1,duration:.45,ease:'power2.out'},.72);tl.fromTo('.ending-sub',{y:14,opacity:0},{y:0,opacity:1,duration:.45,ease:'power2.out'},.86);",
)
path.write_text(source)

check = (S / "check-scenes.py").read_text()
check = re.sub(
    r"scenes=\{.*?\}",
    "scenes={'intro':'0,2.4,2.5,3,3.5,5,8','ending':'0,.35,.7,.9,1.5,3,4.5,6.8'}",
    check,
)
(O / "check-scenes.py").write_text(check)

render = (S / "render-scenes.py").read_text()
render = re.sub(r"names=\[.*?\]", "names=['intro','ending']", render)
(O / "render-scenes.py").write_text(render)

finish = (S / "finish.py").read_text()
start = finish.index("segments=")
end = finish.index("\nassert", start)
segments = "segments=[('intro-silent.mp4',0,9),('../impact-stream/workshop-silent.mp4',0,7),('../impact-direct/impact.mp4',16,3460/60),('../impact-fade/widgets-silent.mp4',0,8),('../impact-direct/impact.mp4',4900/60,24),('ending-silent.mp4',0,7)]"
finish = finish[:start] + segments + finish[end:]
finish = finish.replace("(4.5,'intro-exit.jpg')", "(3.6,'intro-exit.jpg')")
(O / "finish.py").write_text(finish)

index = (S / "index.html").read_text()
index = index.replace("?v=17", "?v=18")
index = index.replace("../impact-fade/", "../impact-stream/")
index = index.replace(
    "The finite columns exit vertically without fading.",
    "The opening backdrop fades from 2.5–3.5s while the finite columns exit vertically.",
)
index = index.replace(
    "The finale is seven seconds, with a giveaway for our five favorite Workshop submissions and the lobster-merch CTA.",
    "The finale is seven seconds, with a calm reveal before one double confetti-cannon burst; top emission ends before 3s and every piece exits the frame.",
)
(O / "index.html").write_text(index)

print("Built faster opening and calmer one-burst outro revision.")
