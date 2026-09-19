const {chromium}=require('/tmp/bunx-1000-@playwright/mcp@0.0.79/node_modules/playwright');const fs=require('node:fs');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/home/habs/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1920,height:1080}});await p.addInitScript(()=>{window.__timelines={}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const base='http://100.111.30.70:3019/impact-ultimate/';
await p.goto(base+'intro/');await p.evaluate(()=>document.fonts.ready);const intro=await p.evaluate(()=>{document.getElementById('root').style.cssText='width:1920px;height:1080px';const t=window.__timelines['ultimate-intro'];t.seek(0);const title=[...document.querySelectorAll('.line,.wordmark')].map(e=>({text:e.textContent,opacity:getComputedStyle(e).opacity}));const positions=[];for(const time of [1,4]){t.seek(time);positions.push([...document.querySelectorAll('.marquee-row')].map(e=>e.getBoundingClientRect().x));}t.seek(0);return{title,speed:positions[0].map((x,i)=>Math.abs(positions[1][i]-x)/3),missingImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)};});
if(intro.title.some(t=>t.opacity!=='1')||intro.speed.some(s=>Math.abs(s-70)>.1)||intro.missingImages.length)throw Error(JSON.stringify(intro));
await p.screenshot({path:__dirname+'/intro-first-browser.png'});
await p.goto(base+'integrations/');await p.waitForTimeout(300);const integrations=await p.evaluate(()=>({count:document.querySelectorAll('.integration-cell').length,missing:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));if(integrations.count!==32||integrations.missing.length)throw Error(JSON.stringify(integrations));
await p.setViewportSize({width:1600,height:1050});await p.goto(base);const results=[];
for(const [name,minTime,wait] of [['Intro',4,4500],['Statistics',65,2600],['Customized header',93,3600],['Ending',104.5,1800]]){
 await p.getByRole('button',{name,exact:true}).click();await p.waitForTimeout(wait);const result=await p.locator('video').evaluate(v=>{v.pause();return {time:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight,dropped:v.getVideoPlaybackQuality().droppedVideoFrames,frames:v.getVideoPlaybackQuality().totalVideoFrames,muted:v.muted};});if(result.time<minTime||result.duration!==107||result.width!==1920||result.height!==1080||result.muted)throw Error(JSON.stringify(result));results.push({name,...result});await p.screenshot({path:__dirname+'/'+name.toLowerCase().replaceAll(' ','-')+'-browser.png'});
}
fs.writeFileSync(__dirname+'/verification.json',JSON.stringify({intro,integrations,results,errors},null,2));console.log({intro,integrations,results,errors});await b.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
