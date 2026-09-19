from pathlib import Path
import re
import shutil

R = Path(__file__).resolve().parent
S = R / "impact-calm"
O = R / "impact-dia"
O.mkdir(exist_ok=True)

intro = O / "intro"
intro.mkdir(exist_ok=True)
for filename in ["index.html", "hyperframes.json", "package.json"]:
    shutil.copy(S / "intro" / filename, intro / filename)
if not (intro / "assets").exists():
    (intro / "assets").symlink_to("../../composition/assets", target_is_directory=True)

for name in ["workshop", "widgets", "integrations", "custom", "assistant", "statistics", "header"]:
    target = O / name
    if not target.exists():
        target.symlink_to("../impact-calm/" + name, target_is_directory=True)

ending = O / "ending"
if ending.is_symlink():
    ending.unlink()
ending.mkdir(exist_ok=True)
for filename in ["index.html", "hyperframes.json", "package.json"]:
    shutil.copy(S / "ending" / filename, ending / filename)
if not (ending / "assets").exists():
    (ending / "assets").symlink_to("../../composition/assets", target_is_directory=True)

ending_video = O / "ending-silent.mp4"
if ending_video.is_symlink():
    ending_video.unlink()

for name in ["score.wav", "sound-cues.json"]:
    target = O / name
    if target.is_symlink():
        target.unlink()

for name in ["storyboard.json", "opening-integrations.json"]:
    shutil.copy(S / name, O / name)

path = intro / "index.html"
source = path.read_text()
source = source.replace(
    "*{box-sizing:border-box}body{margin:0",
    "*{box-sizing:border-box}html,body{width:100%;height:100%}body{margin:0",
)
sparkle_positions = [(4, 4), (18, 24), (31, -6), (45, 16), (59, -8), (73, 22), (90, 2), (9, 80), (29, 91), (51, 75), (70, 88), (91, 78)]
sparkle_path = "M9.825 0.844C10.055 0.215 10.945 0.215 11.175 0.844L11.862 2.72C12.401 4.192 12.392 6.392 13.5 7.5C14.608 8.608 16.808 8.599 18.28 9.138L20.156 9.825C20.786 10.055 20.786 10.945 20.156 11.175L18.28 11.862C16.808 12.401 14.608 12.392 13.5 13.5C12.392 14.608 12.401 16.808 11.862 18.28L11.175 20.156C10.945 20.786 10.055 20.786 9.825 20.156L9.138 18.28C8.599 16.808 8.608 14.608 7.5 13.5C6.392 12.392 4.192 12.401 2.72 11.862L0.844 11.175C0.215 10.945 0.215 10.055 0.844 9.825L2.72 9.138C4.192 8.599 6.392 8.608 7.5 7.5C8.608 6.392 8.599 4.192 9.138 2.72L9.825 0.844Z"
sparkles = "".join(
    f'<svg class="sparkle-star sparkle-{index}" style="left:{left}%;top:{top}%" width="21" height="21" viewBox="0 0 21 21" data-layout-allow-overlap><path d="{sparkle_path}" fill="{"#fff3f3" if index % 2 == 0 else "#ff9a99"}"/></svg>'
    for index, (left, top) in enumerate(sparkle_positions)
)
source = source.replace(
    '<div class="wordmark" data-layout-allow-overlap>Homarr v2</div>',
    f'<div class="wordmark" data-layout-allow-overlap><span>Homarr v2</span>{sparkles}</div>',
)
source = source.replace(
    "font-weight:850;color:#ff779d;margin-top:7px;white-space:nowrap}",
    "font-weight:850;color:#FA5352;margin-top:7px;white-space:nowrap;position:relative;display:inline-block;isolation:isolate}.sparkle-star{position:absolute;z-index:2;pointer-events:none;overflow:visible;transform-origin:center}",
)
source = source.replace(
    ".integration-field{position:absolute;inset:0;z-index:30;overflow:hidden}",
    ".dia-intro{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:#141418;pointer-events:none}.dia-lockup{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px}.dia-logo{width:112px;height:84px;object-fit:contain;filter:drop-shadow(0 0 30px #ff779d44)}.dia-text-wrap{position:relative;font-size:84px;line-height:1;font-weight:800;letter-spacing:-4px;white-space:nowrap}.dia-text-ghost{visibility:hidden}.dia-text-white,.dia-text-band{position:absolute;inset:0;white-space:nowrap}.dia-text-white{color:#fff;clip-path:inset(0 100% 0 0)}.dia-band-window{position:absolute;left:0;top:-8px;width:240px;height:104px;overflow:hidden;transform:translateX(-240px)}.dia-text-band{top:8px;color:transparent;background:linear-gradient(90deg,#ff779d,#c679c4,#ffb005,#e1e1fe,#5f8cff);background-clip:text;-webkit-background-clip:text}.integration-field{position:absolute;inset:0;z-index:30;overflow:hidden}",
)
source = source.replace(
    '<div class="integration-field" data-layout-allow-occlusion data-layout-allow-overlap>',
    '<div class="dia-intro" data-layout-allow-occlusion data-layout-allow-overlap data-layout-allow-overflow><div class="dia-lockup"><img class="dia-logo" src="assets/homarr.png" alt=""><div class="dia-text-wrap"><div class="dia-text-ghost">Announcing Homarr v2</div><div class="dia-text-white">Announcing Homarr v2</div><div class="dia-band-window" data-layout-allow-overflow><div class="dia-text-band" data-layout-allow-overflow data-layout-allow-overlap>Announcing Homarr v2</div></div></div></div></div><div class="integration-field" data-layout-allow-occlusion data-layout-allow-overlap>',
)
source = source.replace(
    "tl.fromTo('.integration-backdrop',{opacity:1},{opacity:0,duration:1,ease:'sine.inOut'},2.5);",
    """tl.fromTo('.dia-logo',{opacity:0,scale:.9,y:10},{opacity:1,scale:1,y:0,duration:.72,ease:'power3.out'},.08);
tl.fromTo('.dia-text-white',{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:2.1,ease:'power1.inOut'},1.1);
tl.fromTo('.dia-band-window',{x:-240},{x:920,duration:2.1,ease:'power1.inOut'},1.1);
tl.fromTo('.dia-text-band',{x:240},{x:-920,duration:2.1,ease:'power1.inOut'},1.1);
tl.to('.dia-intro',{opacity:0,scale:1.008,duration:.5,ease:'power2.inOut'},3.5);
tl.fromTo('.integration-backdrop',{opacity:1},{opacity:0,duration:.8,ease:'sine.inOut'},3.5);
const sparkleStars=Array.from(document.querySelectorAll('.sparkle-star'));
function updateSparkles(time){sparkleStars.forEach((star,index)=>{const active=time>=4;const phase=((time-4)*1.35+index*.19)%1;const pulse=active?Math.sin(Math.PI*Math.max(0,phase)):0;star.style.opacity=String(pulse);star.style.transform=`rotate(${75+phase*75}deg) scale(${pulse*(.7+(index%4)*.16)})`;});}
const sparkleClock={time:0};updateSparkles(0);tl.to(sparkleClock,{time:9,duration:9,ease:'none',onUpdate:()=>updateSparkles(sparkleClock.time)},0);""",
)
column_positions = [(-14, -1640), (-453, 1104), (-39, -1640), (-424, 1104), (-58, -1640), (-408, 1104), (-25, -1640), (-301, 1104)]
column_tweens = "\n".join(
    f"tl.fromTo('.column-{index}',{{y:{initial}}},{{y:{target},duration:5.2,ease:'none'}},3.5);"
    for index, (initial, target) in enumerate(column_positions)
)
source = source.replace(
    "Array.from(document.querySelectorAll('.integration-column')).forEach(column=>{tl.fromTo(column,{y:Number(column.dataset.initial)},{y:Number(column.dataset.target),duration:Number(column.dataset.exitSeconds),ease:'none'},0);});",
    column_tweens,
)
path.write_text(source)

ending_path = ending / "index.html"
ending_source = ending_path.read_text()
ending_source = ending_source.replace(
    'Submit before Christmas. The creators of our <strong>favorite Workshop submissions</strong> get exclusive Homarr merch.',
    'We’re starting a <strong>Workshop contest.</strong><br>Our team favorites and active community members will get exclusive Homarr swag. Stay tuned.',
)
ending_source = ending_source.replace(
    'We’re excited to see what you make Homarr v2 do.',
    'Funded by your donations. Thank you.',
)
ending_source = ending_source.replace('Homarr v2 Workshop contest.', 'Thank you.')
ending_source = ending_source.replace('Go cook something weird.', 'We’re excited to see what you’ll build.')
ending_path.write_text(ending_source)

check = (S / "check-scenes.py").read_text()
check = re.sub(
    r"scenes=\{.*?\}",
    "scenes={'intro':'0,.4,.8,1.1,1.8,2.5,3.2,3.5,3.75,4,5,8'}",
    check,
)
(O / "check-scenes.py").write_text(check)

render = (S / "render-scenes.py").read_text()
render = re.sub(r"names=\[.*?\]", "names=['intro','ending']", render)
render = render.replace("'--workers','3'", "'--workers','3'")
(O / "render-scenes.py").write_text(render)

mix = (S / "mix-music.py").read_text()
mix = mix.replace(
    '{"time": 0.1, "sound": "swoosh", "gain": 0.32, "pan": 0},\n        {"time": 2.5, "sound": "swoosh", "gain": 0.5, "pan": 0},',
    '{"time": 0.08, "sound": "pop", "gain": 0.32, "pan": 0},\n        {"time": 1.1, "sound": "swoosh", "gain": 0.42, "pan": 0},\n        {"time": 3.5, "sound": "swoosh", "gain": 0.5, "pan": 0},',
)
mix = mix.replace(
    '{"time": ending_start + 1.15, "sound": "pop", "gain": 1.25, "pan": 0.8},',
    '{"time": ending_start + 1.15, "sound": "pop", "gain": 1.25, "pan": 0.8},\n        {"time": ending_start + 4.78, "sound": "swoosh", "gain": 0.44, "pan": 0},',
)
(O / "mix-music.py").write_text(mix)

finish = (S / "finish.py").read_text()
(O / "finish.py").write_text(finish)

index = (S / "index.html").read_text()
index = index.replace("?v=18", "?v=22")
index = index.replace("../impact-stream/", "../impact-calm/")
index = index.replace(
    "The opening backdrop fades from 2.5–3.5s while the finite columns exit vertically.",
    "The centered Homarr mark holds for 0.3s before a smooth 2.1s title sweep; another 0.3s hold leads into continuously moving integration columns. The main Homarr v2 title uses deterministic sparkles in #FA5352.",
)
(O / "index.html").write_text(index)

print("Built Dia reveal intro revision.")
