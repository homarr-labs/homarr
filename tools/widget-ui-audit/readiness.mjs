// Mounting is not data readiness. Preserve the final diagnostics on timeout.
export async function waitForCaptureReadiness(evaluate, expectedCount, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let previousGeometry;
  let stableSamples = 0;
  let sample;
  do {
    sample = await evaluate(`(() => {
      const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      const items = [...document.querySelectorAll('[data-grid-item-type="item"]')];
      const notifications = [...document.querySelectorAll('[role="alert"], .mantine-Notification-root')].filter(visible).map(e => e.innerText.trim()).filter(Boolean);
      const widgets = items.map(item => {
        const rect = item.getBoundingClientRect();
        const text = item.innerText;
        const issues = [];
        if (!item.querySelector('[data-homarr-widget-ready]')) issues.push('not-ready');
        if (item.querySelector('[data-homarr-widget-error]')) issues.push('widget-error');
        if ([...item.querySelectorAll('[aria-busy="true"], [class*="skeleton" i], [class*="mantine-loader" i]')].some(visible)) issues.push('loading');
        if (/^Loading(?:…|\\.{3})?$/i.test(text.trim())) issues.push('loading-text');
        if (/Custom widget unavailable|Assistant active in another widget|No integration data available/i.test(text)) issues.push('unavailable-content');
        if ([...item.querySelectorAll('img')].filter(image => image.currentSrc || image.getAttribute('src') || image.getAttribute('srcset')).some(image => !image.complete || image.naturalWidth === 0)) issues.push('image-not-ready');
        return { id: item.getAttribute('data-grid-item-id'), issues, geometry: [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 10) / 10) };
      });
      return { widgets, notifications, fontsReady: document.fonts.status === 'loaded' };
    })()`);
    const geometry = JSON.stringify(sample.widgets.map((widget) => [widget.id, widget.geometry]));
    if (geometry === previousGeometry) stableSamples += 1;
    else stableSamples = 0;
    previousGeometry = geometry;
    sample.stable = stableSamples >= 2;
    sample.expectedCount = expectedCount;
    sample.countMatches = sample.widgets.length === expectedCount;
    sample.outcome = "failed";
    if (
      sample.countMatches &&
      sample.stable &&
      sample.fontsReady &&
      !sample.notifications.length &&
      sample.widgets.every((widget) => !widget.issues.length)
    ) {
      sample.outcome = "ready";
      return sample;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  return sample;
}
