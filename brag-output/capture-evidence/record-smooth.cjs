const {chromium}=require('/tmp/bunx-1000-@playwright/mcp@0.0.79/node_modules/playwright');
const {spawn}=require('node:child_process');const fs=require('node:fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await chromium.connectOverCDP('http://127.0.0.1:9396');const p=b.contexts()[0].pages()[0];
const mode=process.argv[2]||'editor';
const f=spawn('ffmpeg',['-y','-hide_banner','-f','x11grab','-framerate','60','-video_size','1600x1000','-draw_mouse','1','-i',':96.0','-c:v','libx264','-preset','ultrafast','-crf','15','-pix_fmt','yuv420p',`/tmp/homarr-${mode}-60.mp4`],{stdio:['pipe','ignore',fs.openSync(`/tmp/${mode}-capture.log`,'w')]});
const start=performance.now();const events=[];const mark=n=>events.push([n,(performance.now()-start)/1000]);
async function move(x1,y1,x2,y2,ms){await p.mouse.move(x1,y1);await p.mouse.down();mark('pointer-down');const t=performance.now();for(let i=1;i<=60;i++){let u=i/60;let ease=u*u*(3-2*u);await p.mouse.move(x1+(x2-x1)*ease,y1+(y2-y1)*ease);await sleep(Math.max(0,t+i*ms/60-performance.now()));}await p.mouse.up();mark('pointer-up');}
await sleep(600);
if(mode==='editor'){
 await move(375,180,135,180,1000);await sleep(350);
 await p.screenshot({path:'/tmp/smooth-drop.png'});
 await move(135,303,135,184,950);await sleep(500);
 await p.screenshot({path:'/tmp/smooth-small.png'});
 await move(135,184,135,303,950);await sleep(350);
 await move(135,180,375,180,850);await sleep(700);
 await p.screenshot({path:'/tmp/smooth-finish.png'});
}else{
 await p.mouse.move(1100,185);mark('hover');await sleep(350);await p.keyboard.down('Shift');mark('shift-down');await sleep(1000);mark('one-second-held');await p.screenshot({path:'/tmp/advanced-shift-open.png'});await sleep(2200);await p.keyboard.up('Shift');mark('shift-up');await sleep(550);
}
f.stdin.write('q');await new Promise(r=>f.on('exit',r));fs.writeFileSync(`/tmp/${mode}-60-events.json`,JSON.stringify(events,null,2));console.log(events);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
