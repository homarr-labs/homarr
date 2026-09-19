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
  const base = 'http://100.111.30.70:3019/impact-dia/';

  await page.goto(base + 'intro/');
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  const intro = await page.evaluate(() => {
    const timeline = window.__timelines['workshop-intro'];
    const overlay = document.querySelector('.dia-intro');
    const text = document.querySelector('.dia-text-white');
    const band = document.querySelector('.dia-band-window');
    const logo = document.querySelector('.dia-logo');
    const states = {};
    for (const time of [0, 0.8, 1.09, 1.1, 2.15, 3.2, 3.49, 3.75, 4.05, 8]) {
      timeline.seek(time);
      states[time] = {
        opacity: Number(getComputedStyle(overlay).opacity),
        clip: getComputedStyle(text).clipPath,
        bandTransform: getComputedStyle(band).transform,
      };
    }
    const firstColumn = document.querySelector('.integration-column');
    const columnY = {};
    for (const time of [2, 3.49, 4, 5, 6, 8]) {
      timeline.seek(time);
      columnY[time] = firstColumn.getBoundingClientRect().y;
    }
    return {
      states,
      columnY,
      timelineDuration: timeline.duration(),
      text: text.textContent,
      logoLoaded: logo.complete && logo.naturalWidth > 0,
      columns: document.querySelectorAll('.integration-column').length,
      sparkles: document.querySelectorAll('.sparkle-star').length,
      wordmarkColor: getComputedStyle(document.querySelector('.wordmark')).color,
    };
  });
  if (
    intro.text !== 'Announcing Homarr v2' ||
    !intro.logoLoaded ||
    intro.columns !== 8 ||
    intro.sparkles !== 12 ||
    intro.wordmarkColor !== 'rgb(250, 83, 82)' ||
    intro.timelineDuration > 9 ||
    intro.states['0'].opacity !== 1 ||
    !intro.states['0'].clip.includes('100%') ||
    !intro.states['1.09'].clip.includes('100%') ||
    intro.states['2.15'].clip !== 'inset(0px 50% 0px 0px)' ||
    intro.states['3.2'].clip !== 'inset(0px 0% 0px 0px)' ||
    intro.states['3.49'].opacity !== 1 ||
    intro.states['3.75'].opacity <= 0 ||
    intro.states['3.75'].opacity >= 1 ||
    intro.states['4.05'].opacity !== 0 ||
    Math.abs(intro.columnY['3.49'] - intro.columnY['2']) > 1 ||
    Math.abs(intro.columnY['4'] - intro.columnY['3.49']) < 100 ||
    Math.abs(intro.columnY['5'] - intro.columnY['4']) < 100 ||
    Math.abs(intro.columnY['6'] - intro.columnY['5']) < 100
  ) throw new Error(JSON.stringify(intro));

  await page.goto(base + 'ending/');
  const ending = await page.evaluate(() => ({
    title: document.querySelector('.ending-title').textContent,
    prize: document.querySelector('.ending-prize').textContent,
    thanks: document.querySelector('.ending-thanks').textContent,
    sub: document.querySelector('.ending-sub').textContent,
    kicker: document.querySelector('.contest-kicker').textContent,
  }));
  if (
    ending.title !== 'Thank you.' ||
    ending.prize !== 'We’re starting a Workshop contest.Our team favorites and active community members will get exclusive Homarr swag. Stay tuned.' ||
    ending.thanks !== 'Funded by your donations. Thank you.' ||
    ending.sub !== 'We’re excited to see what you’ll build.' ||
    ending.kicker !== 'TO CELEBRATE THIS MILESTONE'
  ) throw new Error(JSON.stringify(ending));

  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Intro', exact: true }).click();
  await page.waitForTimeout(4200);
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
    playback.time < 3.9 ||
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
