const { chromium } = require('/tmp/bunx-1000-@playwright/mcp@0.0.79/node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/home/habs/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => { window.__timelines = {}; });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = 'http://100.111.30.70:3019/impact-calm/';

  await page.goto(base + 'intro/');
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  const intro = await page.evaluate(() => {
    const timeline = window.__timelines['workshop-intro'];
    const backdrop = document.querySelector('.integration-backdrop');
    const opacity = {};
    for (const time of [0, 2.4, 2.5, 3, 3.5, 5]) {
      timeline.seek(time);
      opacity[time] = Number(getComputedStyle(backdrop).opacity);
    }
    timeline.seek(6.7);
    const cleared = [...document.querySelectorAll('.integration-column')].every((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top >= 1080;
    });
    return { opacity, cleared };
  });
  if (
    intro.opacity['0'] !== 1 ||
    intro.opacity['2.4'] !== 1 ||
    intro.opacity['2.5'] !== 1 ||
    Math.abs(intro.opacity['3'] - 0.5) > 0.01 ||
    intro.opacity['3.5'] !== 0 ||
    intro.opacity['5'] !== 0 ||
    !intro.cleared
  ) throw new Error(JSON.stringify(intro));

  await page.goto(base + 'ending/');
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  const ending = await page.evaluate(() => {
    const timeline = window.__timelines.ending;
    const transition = document.querySelector('.ending-transition');
    const canvas = document.querySelector('.confetti');
    const states = {};
    const hash = () => {
      const data = canvas.getContext('2d').getImageData(0, 0, 1920, 1080).data;
      let alpha = 0;
      let checksum = 0;
      for (let index = 3; index < data.length; index += 16) {
        if (data[index]) alpha += 1;
        checksum = (checksum * 33 + data[index]) >>> 0;
      }
      return { alpha, checksum };
    };
    for (const time of [0, 0.35, 0.7, 0.9, 1.5, 3, 6, 6.8]) {
      timeline.seek(time);
      window.draw(time);
      states[time] = { transition: Number(getComputedStyle(transition).opacity), ...hash() };
    }
    return states;
  });
  if (
    ending['0'].transition !== 1 ||
    !(ending['0.35'].transition > 0 && ending['0.35'].transition < 1) ||
    ending['0.7'].transition !== 0 ||
    ending['0.9'].alpha !== 0 ||
    ending['1.5'].alpha === 0 ||
    ending['3'].alpha === 0 ||
    ending['6.8'].alpha !== 0
  ) throw new Error(JSON.stringify(ending));

  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Workshop · Merch', exact: true }).click();
  await page.waitForTimeout(4500);
  const playback = await page.locator('video').evaluate((video) => {
    video.pause();
    return {
      time: video.currentTime,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      dropped: video.getVideoPlaybackQuality().droppedVideoFrames,
      frames: video.getVideoPlaybackQuality().totalVideoFrames,
      muted: video.muted,
    };
  });
  if (
    playback.time < 109 ||
    Math.abs(playback.duration - 6760 / 60) > 0.05 ||
    playback.width !== 1920 ||
    playback.height !== 1080 ||
    playback.muted
  ) throw new Error(JSON.stringify(playback));

  const result = { intro, ending, playback, errors };
  fs.writeFileSync(__dirname + '/verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
