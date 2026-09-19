"""Regenerate the film HTML from the pinned Homarr catalogs and local assets."""
from pathlib import Path
import json, html, re, shutil
out=Path(__file__).resolve().parent
repo=out.parent
comp=out/'composition'
esc=html.escape
inventory=json.loads((out/'source-inventory.json').read_text())
integrations=json.loads((comp/'assets/integrations.json').read_text())
translations=json.loads((repo/'packages/translation/src/lang/en.json').read_text())['widget']
names=[]
for kind in inventory['widgets']:
    name=translations.get(kind,{}).get('name',kind)
    overrides={'paperlessNgx':'Paperless-ngx','patchmon':'PatchMon','uptimeKuma':'Uptime Kuma','coolify':'Coolify','tracearr':'Tracearr','bazarr':'Bazarr','traefik':'Traefik'}
    name=overrides.get(kind,name)
    names.append(name)
scenes=[]
def scene(id,start,duration,body):
    scenes.append(f'<section id="{id}" class="clip" data-start="{start}" data-duration="{duration}" data-track-index="1"><div class="scene-inner">{body}</div></section>')
def head(kicker,title,sub=''):
    return f'<div class="heading"><div class="eyebrow">{kicker}</div><h1>{title}</h1><p>{sub}</p></div>'
def shot(name,cls='product',style=''):
    overflow=''
    if cls in ('hero-shot','rail-board','pane-image workbench-focus','pane-image catalog-focus'):
        overflow='data-layout-allow-overflow'
    return f'<img {overflow} class="{cls}" src="assets/product/{name}.webp" alt="Homarr {name.replace("-"," ")}" style="{style}">'
scene('intro',0,6,head('HOMARR 2.0','Your server. Your starting point.','A self-hosted dashboard for your apps and services.')+shot('homarr-v2-dashboard','hero-shot')+'<div class="version-lockup"><img src="assets/logo.svg" alt="Homarr logo"><span>2.0</span></div>')
cols=[]
for col in range(3):
    group=integrations[col::3]
    cards=''.join(f'<div class="integration-card"><img src="{i["asset"]}" alt=""><span>{esc(i["name"])}</span></div>' for i in group)
    cols.append(f'<div class="integration-column column-{col}" data-layout-allow-overflow>{cards}</div>')
scene('integrations',6,12,'<div class="integration-copy"><div class="eyebrow">CONNECT YOUR WORLD</div><h1>Apps.<br>Service data.<br>Controls.</h1><p>All on your dashboard.</p><div class="count">55 <span>integrations</span></div><div class="family-list">Media · Smart home · Storage<br>Networking · Monitoring · Downloads</div></div><div class="integration-window" data-layout-allow-overflow><div class="integration-tilt">'+''.join(cols)+'</div></div>')
scene('editing',18,8,head('BOARD EDITING, REBUILT','Drag. Drop. Resize.','Containers keep apps and widgets together.')+'<div class="video-frame"></div><div class="edit-note"><span>Preview the move.</span><span>Save a valid layout.</span><span>Keep your board in shape.</span></div><div class="resize-demo"><div id="resize-tile"><span>Calendar</span><div class="calendar-dots">M　T　W　T　F<br>1　2　3　4　5<br>8　9　10　11　12</div><i class="resize-handle"></i></div><div id="resize-pointer" class="pointer"></div><small>Resize in eight directions</small></div>')
scene('layouts',26,7,head('CONTAINERS · RAILS · RESPONSIVE LAYOUTS','Sidebars that stay close.','One board. Base + Mobile layouts.')+shot('homarr-v2-dashboard','rail-board')+'<div class="rail-outline"></div><div class="phone"><div class="phone-top">Homarr · Mobile</div><div class="phone-apps"><span>Sonarr</span><span>Radarr</span><span>Plex</span></div><div class="phone-weather"><small>Paris</small><strong>24.9°</strong><span>Mainly clear</span></div><div class="phone-health">● Services healthy</div><div class="phone-calendar">September 2026<br><br>Mo　Tu　We　Th　Fr<br>14　15　16　17　18</div></div><div class="mobile-note">Rail apps join the mobile flow.</div>')
widget_cards=[('Weather','24.9°','Paris · Mainly clear','weather'),('Clock','13:34','Thursday, September 17','clock'),('Air Quality','19','Good','air'),('Timer','25:00','Focus time','timer'),('Countdown','03:12:08','Until movie night','countdown'),('Downloads','115.5','MiB/s · 4 active','downloads')]
widget_details={
    'weather':'<div class="weather-range"><span>↗ 26.4°</span><span>↘ 18.1°</span></div>',
    'clock':'<div class="daylight"><i></i><b></b></div>',
    'air':'<svg class="aqi-trend" viewBox="0 0 300 45" aria-hidden="true"><path d="M0 30 L30 26 L60 32 L90 18 L120 23 L150 12 L180 18 L210 9 L240 14 L270 7 L300 10" fill="none" stroke="#8ce99a" stroke-width="4"/></svg>',
    'timer':'<div class="timer-controls"><b class="timer-play">▶</b><b>↺</b><span>Focus session</span></div>',
    'countdown':'<div class="countdown-progress"><i></i></div>',
    'downloads':'<div class="download-progress"><i></i><i></i><i></i></div>',
}
previews=''.join(f'<div class="widget-preview {cls}"><small>{label}</small><strong class="widget-value">{value}</strong><span>{sub}</span>{widget_details[cls]}</div>' for label,value,sub,cls in widget_cards)
rows=[]
for row in range(4):
    group=names[row::4]
    rows.append(f'<div class="widget-name-row row-{row}" data-layout-allow-overflow>'+''.join(f'<span>{esc(n)}</span>' for n in group)+'</div>')
scene('widgets',33,8,head('WIDGETS, FOR REAL LIFE','A widget for your everyday.','New: Air Quality · Countdown · Timer')+'<div class="widget-window" data-layout-allow-overflow><div class="widget-previews">'+previews+'</div></div><div class="widget-catalog" data-layout-allow-overflow>'+''.join(rows)+'</div>')
scene('assistant',41,9,head('HOMARR ASSISTANT','Ask your dashboard.','Live data. Changes with approval.')+shot('assistant-control-surface','assistant-shot')+'<div class="conversation"><div class="conversation-title">Assistant <small>Illustrative interaction</small></div><div class="bubble user">How are my services doing?</div><div class="bubble reply">I can check your connected services.</div><div class="tool-read">✓ Read service health</div><div class="bubble proposal">Add a health widget to this board?</div><div class="approval"><span>Review proposed change</span><b>Approve</b></div><div class="approved">✓ Approved · Apply change</div></div><div class="assistant-footer">Free Homarr provider · Permission-aware tools · External assistants through MCP</div>')
scene('workshop',50,9,head('CUSTOM WIDGETS v2 + WORKSHOP','Build it. Preview it. Share it.','Describe a widget to Assistant, or write it yourself.')+'<div class="workshop-panes"><div><div class="pane-label">01 / THE WORKBENCH</div>'+'<div class="pane-viewport workbench-viewport" data-layout-allow-overflow>'+shot('custom-widget-workbench','pane-image workbench-focus')+'</div>'+'</div><div><div class="pane-label">02 / COMMUNITY WORKSHOP</div>'+'<div class="pane-viewport catalog-viewport" data-layout-allow-overflow>'+shot('community-workshop','pane-image catalog-focus')+'</div>'+'</div></div><div class="workshop-footer"><span>Custom Widgets <b>Beta</b></span><span>Share Custom CSS too</span><span>Credentials stay on your instance</span></div>')
scene('onboarding',59,6,head('A NEW BEGINNING','From first login to first board.','Docker + Podman discovery. Multiple hosts.')+'<div class="setup-panes">'+shot('onboarding-studio','setup-image')+shot('docker-assisted-setup','setup-image')+'</div><div class="setup-steps">'+''.join(f'<span>{x}</span>' for x in ['Admin','Essentials','Docker','Apps','Integrations','Board'])+'</div>')
scene('details',65,7,head('THE EVERYDAY DETAILS','Your layout. Your shortcuts. Your rules.','A configurable header, instance branding and shared permissions.')+'<div class="details-panes">'+'<div class="details-main">'+shot('header-studio','details-image header-shot')+shot('instance-branding','details-image branding-shot')+'</div><div class="details-aside">'+shot('board-switcher','details-small switcher-shot')+shot('permission-matrix','details-small permissions-shot')+'</div>'+'</div><div class="shortcut-row"><span>⌘ / Ctrl + K <b>Command menu</b></span><span>Shift + C <b>Board switcher</b></span><span>Shift + A <b>Assistant</b></span></div>')
scene('outro',72,8,'<div class="closing"><img class="closing-logo" src="assets/logo.svg" alt="Homarr"><div class="eyebrow">YOUR DASHBOARD. YOUR POSSIBILITIES.</div><h1>Homarr <em>2.0</em></h1><p>Make it yours.</p><div class="closing-url">homarr.dev</div><div class="closing-links">demo.homarr.dev　 /　 homarr.dev/workshop</div></div><div class="upgrade"><strong>Before you upgrade</strong><span>SQLite + PostgreSQL supported · Convert MySQL before upgrading</span><small>Read the v2 release notes and migration guide.</small></div>')
css='''
@font-face{font-family:Inter;src:url('assets/inter.woff2') format('woff2');font-weight:100 900;font-style:normal}*{box-sizing:border-box}body{margin:0;background:#242424;color:#f8f9fa;font-family:Inter,system-ui,sans-serif}#root{width:100%;height:100%;position:relative;overflow:hidden;background:#242424}.clip{position:absolute;inset:0}.scene-inner{position:absolute;inset:0;overflow:hidden;background:#242424}.heading{position:absolute;left:100px;right:100px;top:70px}.eyebrow{font-size:24px;letter-spacing:5px;font-weight:650;color:#ff8787}h1{font-size:72px;line-height:1.1;letter-spacing:-3px;margin:19px 0 20px;font-weight:650}p{font-size:30px;line-height:1.4;margin:0;color:#ced4da}.hero-shot{position:absolute;left:100px;top:315px;width:1720px;border:2px solid #555;border-radius:24px}.version-lockup{position:absolute;right:105px;top:80px;display:flex;gap:18px;align-items:center;font-size:44px;background:#242424;padding:10px 18px}.version-lockup img{width:80px}.integration-copy{position:absolute;left:100px;top:145px;width:660px}.integration-copy h1{font-size:96px;line-height:1.1}.integration-copy p{margin-top:30px}.count{font-size:90px;margin-top:45px;color:#ff8787}.count span{font-size:32px;color:#f8f9fa}.family-list{font-size:25px;line-height:1.8;color:#ced4da;margin-top:25px}.integration-window{position:absolute;left:780px;top:0;width:1140px;height:1080px;overflow:hidden;mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}.integration-tilt{position:absolute;top:-90px;bottom:-90px;left:140px;right:20px;transform:rotate(10deg);display:flex;gap:20px}.integration-column{width:270px;flex-shrink:0}.integration-card{height:148px;margin-bottom:22px;background:#303030;border:2px solid #494949;border-radius:22px;display:flex;align-items:center;gap:14px;padding:18px}.integration-card img{width:52px;height:52px;object-fit:contain}.integration-card span{font-size:24px;max-width:165px;line-height:1.15}.video-frame{position:absolute;left:100px;top:330px;width:1250px;height:625px;border:2px solid #555;border-radius:20px;background:#1b1b1b}.edit-note{position:absolute;left:1410px;top:330px;display:flex;flex-direction:column;gap:24px;width:400px;font-size:29px;line-height:1.3}.resize-demo{position:absolute;left:1410px;top:570px;width:400px;height:410px}.resize-demo small{position:absolute;bottom:0;left:0;font-size:24px;color:#ced4da}#resize-tile{position:absolute;left:0;top:0;width:280px;height:220px;background:#303030;border:3px solid #ff8787;border-radius:20px;transform-origin:top left;padding:25px;font-size:25px}.calendar-dots{font-size:18px;line-height:2.1;color:#ced4da;margin-top:16px}.resize-handle{position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;background:#ff8787}.pointer{position:absolute;width:25px;height:35px;background:#f8f9fa;clip-path:polygon(0 0,100% 65%,55% 65%,30% 100%);filter:drop-shadow(1px 3px 3px #000)}#resize-pointer{left:275px;top:215px}.rail-board{position:absolute;left:100px;top:350px;width:1300px;border-radius:20px;border:2px solid #555}.rail-outline{position:absolute;left:1300px;top:425px;width:87px;height:530px;border:4px solid #ff8787;border-radius:20px;pointer-events:none}.phone{position:absolute;right:120px;top:300px;width:320px;height:625px;border:4px solid #777;border-radius:40px;background:#191919;padding:26px 18px}.phone-top{font-size:22px;font-weight:700;margin-bottom:25px}.phone-apps{display:flex;gap:8px}.phone-apps span{flex:1;background:#393939;border-radius:12px;padding:15px 5px;text-align:center;font-size:17px}.phone-weather{background:#303030;border-radius:16px;margin-top:17px;padding:20px;display:flex;flex-direction:column;gap:10px}.phone-weather small{font-size:18px}.phone-weather strong{font-size:56px}.phone-weather span{font-size:19px}.phone-health{font-size:19px;color:#8ce99a;padding:24px 0}.phone-calendar{background:#303030;border-radius:16px;padding:18px;font-size:19px;line-height:1.4}.mobile-note{position:absolute;right:70px;top:965px;font-size:24px;width:410px;text-align:center;color:#ced4da}.widget-window{position:absolute;top:335px;left:0;width:1920px;height:370px;overflow:hidden}.widget-previews{display:flex;gap:28px;width:max-content;padding-left:100px}.widget-preview{width:380px;height:320px;background:#303030;border:2px solid #555;border-radius:28px;padding:36px;display:flex;flex-direction:column;gap:25px;flex-shrink:0}.widget-preview small{font-size:25px;color:#ced4da}.widget-preview strong{font-size:72px;font-weight:600;letter-spacing:-3px}.widget-preview span{font-size:24px}.widget-preview.air strong{color:#8ce99a}.widget-line{height:4px;background:#ff8787;width:75%;border-radius:8px}.widget-catalog{position:absolute;top:730px;width:1920px;height:300px;overflow:hidden}.widget-name-row{display:flex;gap:24px;width:max-content;margin-bottom:15px;padding-left:60px}.widget-name-row span{font-size:24px;line-height:1.3;min-width:230px;max-width:380px;background:#303030;border-radius:14px;padding:12px 22px;color:#ced4da;white-space:nowrap}.assistant-shot{position:absolute;left:100px;top:335px;width:1030px;height:590px;object-fit:contain;object-position:top;background:#191919;border-radius:20px;border:2px solid #555}.conversation{position:absolute;left:1180px;top:330px;width:640px;padding:24px;border:2px solid #555;border-radius:22px;background:#303030}.conversation-title{font-size:27px;font-weight:650;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.conversation-title small{font-size:18px;color:#ced4da;font-weight:400}.bubble{font-size:25px;line-height:1.35;padding:17px 20px;margin-bottom:16px;border-radius:16px}.user{background:#633b3b;margin-left:40px}.reply,.proposal{background:#3d3d3d;margin-right:30px}.tool-read{font-size:23px;color:#8ce99a;margin:15px 0 24px}.approval{font-size:21px;display:flex;align-items:center;gap:15px;border:1px solid #777;padding:15px;border-radius:12px}.approval b{background:#fa5252;color:#191919;padding:13px;border-radius:8px}.approved{font-size:23px;color:#8ce99a;margin-top:18px}.assistant-footer{position:absolute;left:100px;top:995px;font-size:27px;color:#ced4da}.workshop-panes{position:absolute;left:100px;right:100px;top:350px;display:grid;grid-template-columns:1fr 1fr;gap:35px}.pane-label{font-size:24px;letter-spacing:3px;margin-bottom:22px;color:#ced4da}.pane-image{width:100%;height:460px;object-fit:contain;object-position:top;background:#191919;border:2px solid #555;border-radius:20px}.workshop-footer{position:absolute;left:100px;right:100px;top:930px;display:flex;justify-content:space-between;font-size:27px}.workshop-footer b{color:#ff8787}.setup-panes{position:absolute;left:100px;right:100px;top:335px;display:flex;gap:35px}.setup-image{width:842px;height:490px;object-fit:contain;object-position:top;border:2px solid #555;border-radius:20px;background:#191919}.setup-steps{position:absolute;left:100px;right:100px;top:910px;display:flex;gap:20px}.setup-steps span{flex:1;text-align:center;border-top:4px solid #ff8787;padding-top:25px;font-size:26px}.details-panes{position:absolute;left:100px;top:335px;right:100px;display:flex;gap:40px;align-items:flex-start}.details-image{width:1130px;height:485px;object-fit:contain;object-position:top;border:2px solid #555;border-radius:20px;background:#191919}.details-small{width:550px;height:485px;object-fit:contain;border:2px solid #555;border-radius:20px;background:#191919}.shortcut-row{position:absolute;left:100px;right:100px;top:910px;display:flex;justify-content:space-between;font-size:25px;color:#ff8787}.shortcut-row b{display:block;color:#f8f9fa;margin-top:18px;font-weight:500}.closing{position:absolute;left:100px;right:100px;top:80px;text-align:center}.closing-logo{width:200px;height:150px;object-fit:contain;margin-bottom:45px}.closing h1{font-size:140px;margin:25px 0}.closing em{font-style:normal;color:#ff8787}.closing p{font-size:40px}.closing-url{font-size:52px;margin-top:45px}.closing-links{font-size:25px;color:#ced4da;margin-top:25px}.upgrade{position:absolute;left:160px;right:160px;bottom:65px;border-top:2px solid #555;padding-top:28px;text-align:center;display:flex;flex-direction:column;gap:16px}.upgrade strong{font-size:25px}.upgrade span{font-size:29px}.upgrade small{font-size:23px;color:#ced4da}.progress{position:absolute;left:0;bottom:0;height:5px;width:1920px;background:#fa5252;transform-origin:left;z-index:99}.music-glow{position:absolute;width:400px;height:6px;left:100px;top:28px;background:#fa5252;z-index:80;transform-origin:left;opacity:.7}
'''
css += '''
/* Second-pass framing: fill the shot with the useful parts of the real UI. */
.pane-viewport{position:relative;width:100%;height:490px;border:2px solid #555;border-radius:20px;overflow:hidden;background:#242424}
.pane-viewport .pane-image{display:block;width:100%;height:490px;object-fit:cover;border:0;border-radius:0}
.workbench-focus{object-position:50% 65%;transform-origin:75% 55%}
.catalog-focus{object-position:50% 0%;transform-origin:50% 35%}
.widget-preview{gap:20px}
.widget-preview strong{font-variant-numeric:tabular-nums}
.weather-range{display:flex;gap:24px;color:#ced4da;margin-top:2px}
.weather-range span{font-size:22px}
.daylight{height:8px;width:290px;background:#505050;position:relative;border-radius:10px;margin-top:14px}
.daylight i{position:absolute;left:30px;right:35px;height:8px;background:#ffd43b;border-radius:10px}
.daylight b{position:absolute;left:175px;top:-5px;width:18px;height:18px;background:#f8f9fa;border-radius:50%}
.aqi-trend{width:290px;height:44px;margin-top:-3px}
.timer-controls{display:flex;align-items:center;gap:12px;margin-top:-4px}
.timer-controls b{display:flex;align-items:center;justify-content:center;background:#55568e;border-radius:10px;width:48px;height:44px;font-size:25px}
.timer-controls span{font-size:18px;color:#ced4da;margin-left:6px}
.countdown-progress{width:290px;height:9px;background:#505050;border-radius:8px;margin-top:14px;overflow:hidden}
.countdown-progress i{display:block;width:210px;height:9px;background:#ff8787;transform-origin:left}
.download-progress{display:flex;flex-direction:column;gap:6px;margin-top:0}
.download-progress i{display:block;height:5px;background:#74c0fc;transform-origin:left;width:260px}
.download-progress i:nth-child(2){width:175px}.download-progress i:nth-child(3){width:215px}
.details-main{position:relative;width:1130px;height:485px;overflow:hidden;border-radius:20px}
.details-aside{position:relative;width:550px;height:485px;overflow:hidden;border-radius:20px}
.details-main .details-image,.details-aside .details-small{position:absolute;inset:0}
.branding-shot{object-fit:cover;object-position:center 35%}.permissions-shot{object-fit:cover;object-position:center top}
'''
js='''const tl=gsap.timeline({paused:true});
// Every scene has explicit entry, settled proof and exit poses.
const starts=[0,6,18,26,33,41,50,59,65,72];
const ids=['intro','integrations','editing','layouts','widgets','assistant','workshop','onboarding','details','outro'];
ids.forEach((id,i)=>{const base=starts[i];if(id==='intro'||!document.querySelector('#'+id+' .heading')) return;tl.fromTo('#'+id+' .heading',{y:30,opacity:0},{y:0,opacity:1,duration:.6,ease:'power3.out'},base+.12);});
tl.fromTo('.hero-shot',{y:100,scale:.94,opacity:1},{y:0,scale:1,opacity:1,duration:1.1,ease:'power3.out'},.4);
tl.fromTo('.version-lockup',{scale:.8,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(1.3)'},.56);
tl.fromTo('.integration-copy',{x:-60,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},6); // beat-locked: 6.00s
[0,1,2].forEach((i)=>{const col=document.querySelector('.column-'+i);const travel=col.children.length*170-820;tl.fromTo(col,{y:400},{y:-travel,duration:11.1,ease:'none'},6.7);});
tl.fromTo('.edit-note span',{x:35,opacity:0},{x:0,opacity:1,stagger:.8,duration:.4,ease:'power2.out'},18.02); // beat-locked: 18.02s
// Resize proof: pickup at 23.4, expand at 24.0, hold final 25.0–26.0.
tl.fromTo('#resize-pointer',{x:70,y:80,opacity:0},{x:0,y:0,opacity:1,duration:.55,ease:'power2.out'},22.9);
tl.to('#resize-tile',{scaleX:1.28,scaleY:1.3,duration:1.1,ease:'power2.inOut'},23.8);
tl.to('#resize-pointer',{x:78,y:66,duration:1.1,ease:'power2.inOut'},23.8);
tl.to('#resize-pointer',{opacity:0,duration:.2},25.3);
tl.fromTo('.rail-board',{x:-70,opacity:0},{x:0,opacity:1,duration:.7,ease:'power3.out'},26.3);
tl.fromTo('.rail-outline',{opacity:0},{opacity:1,duration:.45},27.2);
tl.fromTo('.phone',{x:180,opacity:0},{x:0,opacity:1,duration:.8,ease:'power3.out'},27.6);
tl.fromTo('.phone-apps span',{y:-25,opacity:0},{y:0,opacity:1,duration:.4,stagger:.18,ease:'back.out(1.2)'},28.5);
tl.fromTo('.mobile-note',{opacity:0},{opacity:1,duration:.4},29);
tl.fromTo('.widget-previews',{x:0},{x:-650,duration:8,ease:'none'},33);
[0,1,2,3].forEach((i)=>{const row=document.querySelector('.row-'+i);const distance=row.scrollWidth-1750;tl.fromTo(row,{x:0},{x:-distance,duration:7.6,ease:'none'},33.2);});
tl.fromTo('.assistant-shot',{scale:.95,opacity:0},{scale:1,opacity:1,duration:.6,ease:'power3.out'},41.3);
tl.fromTo('.conversation',{x:80,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},41.4);
[['.user',41.8],['.reply',42.9],['.tool-read',44],['.proposal',45.1],['.approval',46.3],['.approved',48.1]].forEach(([s,t])=>tl.fromTo(s,{y:14,opacity:0},{y:0,opacity:1,duration:.4,ease:'power2.out'},t));
tl.to('.approval b',{scale:.94,duration:.12,yoyo:true,repeat:1},47.8);
tl.fromTo('.workshop-panes>div',{y:60,opacity:0},{y:0,opacity:1,duration:.7,stagger:.7,ease:'power3.out'},50.5);
tl.fromTo('.workshop-footer span',{opacity:0},{opacity:1,duration:.4,stagger:.6},53);
tl.fromTo('.setup-image',{x:70,opacity:0},{x:0,opacity:1,duration:.7,stagger:.4,ease:'power3.out'},59.4);
tl.fromTo('.setup-steps span',{y:16,opacity:0},{y:0,opacity:1,duration:.35,stagger:.4,ease:'power2.out'},60);
tl.fromTo('.header-shot',{x:-60,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},65.4);
tl.fromTo('.switcher-shot',{x:60,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},66.1);
tl.fromTo('.shortcut-row span',{opacity:0,y:15},{opacity:1,y:0,duration:.4,stagger:.45,ease:'power2.out'},66.6);
// The timer starts, counts down, and retains a readable resting layout.
tl.to('.timer-play',{scale:.9,duration:.12,yoyo:true,repeat:1},34.35);
tl.set('.timer-play',{innerText:'Ⅱ'},34.6);
for(let tick=1;tick<=6;tick++){
  tl.set('.timer .widget-value',{innerText:'24:'+String(60-tick).padStart(2,'0')},34.6+tick);
  tl.set('.countdown .widget-value',{innerText:'03:12:'+String(8-tick).padStart(2,'0')},33.5+tick);
}
tl.fromTo('.countdown-progress i',{scaleX:.9},{scaleX:1,duration:8,ease:'none'},33);
tl.fromTo('.download-progress i',{scaleX:.6},{scaleX:1,duration:7.5,stagger:.1,ease:'none'},33.2);
// Zoom into the actual preview result and Workshop cards, then hold.
tl.fromTo('.workbench-focus',{scale:1},{scale:1.18,duration:1.1,ease:'power2.inOut'},52.3);
tl.fromTo('.catalog-focus',{scale:1},{scale:1.06,duration:1.1,ease:'power2.inOut'},54.4);
// Show the real branding and permissions surfaces alongside their existing copy.
tl.fromTo('.branding-shot',{opacity:0,x:40},{opacity:1,x:0,duration:.55,ease:'power2.out'},68.0);
tl.fromTo('.permissions-shot',{opacity:0,x:30},{opacity:1,x:0,duration:.55,ease:'power2.out'},68.7);
tl.fromTo('.closing-logo',{scale:.75,opacity:0},{scale:1,opacity:1,duration:.8,ease:'back.out(1.2)'},72.1);
tl.fromTo('.closing h1,.closing .eyebrow,.closing p,.closing-url,.closing-links',{y:20,opacity:0},{y:0,opacity:1,duration:.6,stagger:.12,ease:'power3.out'},72.3);
tl.fromTo('.upgrade',{opacity:0},{opacity:1,duration:.6},73.4);
tl.fromTo('.progress',{scaleX:0},{scaleX:1,duration:80,ease:'none'},0);
// Seek-safe band samples drive the accent, not a generic music visualizer.
AUDIO_DATA.frames.slice(0,2400).forEach((f,i)=>{tl.set('.music-glow',{opacity:.35+f.bands[0]*.45,scaleX:.92+f.bands[0]*.08},i/30);});
window.__timelines['homarr-v2']=tl;
'''
# Keep framework-owned video outside scene timing wrappers.
video='<video id="drag-recording" class="clip" src="assets/drag-hold.mp4" data-start="18" data-duration="8" data-track-index="2" muted playsinline style="position:absolute;left:102px;top:332px;width:1246px;height:621px;object-fit:contain;border-radius:18px"></video>'
shutil.copy('/home/habs/.agents/skills/brag/assets/sfx/ui/mouseclick1.ogg',comp/'assets/click.ogg')
audio='<audio id="music" src="assets/music-final.mp3" data-start="0" data-duration="80" data-track-index="10" data-volume="0.28"></audio><audio id="resize-click" src="assets/click.ogg" data-start="23.8" data-duration="0.06" data-track-index="11" data-volume="0.45"></audio><audio id="approve-click" src="assets/click.ogg" data-start="47.8" data-duration="0.06" data-track-index="12" data-volume="0.45"></audio>'
# Frame-data is local; no runtime network request.
(comp/'assets/audio-data.js').write_text('const AUDIO_DATA='+ (comp/'assets/audio-data.json').read_text()+';\n')
(comp/'index.html').write_text('<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><title>Homarr 2.0 — Your dashboard. Your possibilities.</title><script src="assets/gsap.min.js"></script><script src="assets/audio-data.js"></script><style>'+css+'</style></head><body><div id="root" data-composition-id="homarr-v2" data-start="0" data-duration="80" data-width="1920" data-height="1080">'+''.join(scenes)+video+'<div class="music-glow" data-layout-ignore></div><div class="progress" data-layout-ignore></div>'+audio+'</div><script>'+js+'</script></body></html>\n')
print('Generated 10 scenes,',len(integrations),'integrations,',len(names),'widget names.')
