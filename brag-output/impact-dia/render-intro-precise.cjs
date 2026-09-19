const { chromium } = require('/tmp/bunx-1000-@playwright/mcp@0.0.79/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const output = path.join(__dirname, 'intro-silent.mp4');
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-v', 'warning',
    '-f', 'image2pipe', '-framerate', '60', '-vcodec', 'png', '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  let browser;
  let page;
  const openPage = async () => {
    browser = await chromium.launch({
      headless: true,
      executablePath: '/home/habs/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
      args: ['--no-sandbox', '--disable-gpu'],
    });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(() => { window.__timelines = {}; });
    await page.goto('http://100.111.30.70:3019/impact-dia/intro/');
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    const compositionHeight = await page.locator('#intro').evaluate((element) => element.getBoundingClientRect().height);
    if (compositionHeight !== 1080) {
      throw new Error(`Expected a 1080px composition, received ${compositionHeight}px`);
    }
  };
  await openPage();

  for (let frame = 0; frame < 540; frame += 1) {
    if (frame > 0 && frame % 30 === 0) {
      await browser.close();
      await openPage();
    }
    const time = frame / 60;
    await page.evaluate((seekTime) => {
      window.__timelines['workshop-intro'].seek(seekTime, false);
      window.updateSparkles(seekTime);
      document.body.getBoundingClientRect();
    }, time);
    const png = await page.screenshot({ type: 'png' });
    if (!ffmpeg.stdin.write(png)) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }
    if (frame % 60 === 0) process.stdout.write(`frame ${frame}/540\n`);
  }

  ffmpeg.stdin.end();
  await browser.close();
  const code = await new Promise((resolve) => ffmpeg.once('close', resolve));
  if (code !== 0) process.exit(code);
  process.stdout.write(`Rendered ${output}\n`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
