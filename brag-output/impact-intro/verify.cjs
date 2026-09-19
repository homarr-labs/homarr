const {chromium}=require('/tmp/bunx-1000-@playwright/mcp@0.0.79/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/home/habs/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.addInitScript(()=>{window.__timelines={};});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://100.111.30.70:3019/impact-intro/composition/');
  await page.evaluate(()=>{document.getElementById('root').style.cssText='width:1920px;height:1080px';});
  await page.evaluate(()=>document.fonts.ready);
  const motion=await page.evaluate(()=>{
    const seen=new Set();const timeline=window.__timelines['impact-intro'];
    const sample=[];
    for(let time=0;time<=6.5;time+=.1){
      timeline.seek(time);
      document.querySelectorAll('.integration').forEach(el=>{const r=el.getBoundingClientRect();if(r.left>=0&&r.right<=1920)seen.add(el.textContent.trim());});
    }
    for(const time of [1,3,5]){
      timeline.seek(time);
      sample.push({time,positions:['.col-0','.col-1','.row-0','.row-1','.row-2'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {selector:s,x:r.x,y:r.y};})});
    }
    const missingImages=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
    return {fullyVisibleIntegrationCount:seen.size,names:[...seen],sample,missingImages};
  });
  if(motion.fullyVisibleIntegrationCount!==55||motion.missingImages.length)throw Error(JSON.stringify(motion));
  await page.evaluate(()=>{window.__timelines['impact-intro'].seek(2);});
  await page.screenshot({path:__dirname+'/intro-browser.png'});
  await page.setViewportSize({width:1600,height:1050});
  await page.goto('http://100.111.30.70:3019/impact-intro/');
  await page.getByRole('button',{name:'Intro + integrations',exact:true}).click();
  await page.waitForTimeout(9200);
  const playback=await page.locator('video').evaluate(v=>{v.pause();return {time:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight,quality:{totalFrames:v.getVideoPlaybackQuality().totalVideoFrames,droppedFrames:v.getVideoPlaybackQuality().droppedVideoFrames},audioMuted:v.muted};});
  if(playback.duration!==68||playback.time<8)throw Error(JSON.stringify(playback));
  await page.screenshot({path:__dirname+'/handoff-browser.png'});
  await page.getByRole('button',{name:'Containers',exact:true}).click();
  await page.waitForTimeout(1200);
  const chapter=await page.locator('video').evaluate(v=>{v.pause();return v.currentTime;});
  fs.writeFileSync(__dirname+'/verification.json',JSON.stringify({motion,playback,chapter,errors},null,2));
  console.log(JSON.stringify({integrations:motion.fullyVisibleIntegrationCount,playback,chapter,errors},null,2));
  await browser.close();
  if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
