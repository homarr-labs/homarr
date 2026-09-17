import { writeFile } from "node:fs/promises";

// Keep viewport emulation and screenshots on one CDP session. Separate sessions
// in the installed browser CLI can paint at its default viewport dimensions.
export async function createBrowserCapture(endpoint, url) {
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser capture timed out: ${method}`));
      }, 30000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { targetInfos } = await send("Target.getTargets");
  const target = targetInfos.find((entry) => entry.type === "page" && entry.url === url);
  if (!target) throw new Error(`Missing board tab: ${url}`);
  const { sessionId } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  async function evaluate(expression) {
    const { result, exceptionDetails } = await send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    return result.value;
  }
  return {
    evaluate,
    async reload() {
      await evaluate("window.__widgetAuditPreviousDocument = true");
      await send("Page.reload", {}, sessionId);
    },
    async ready() {
      for (let attempt = 0; attempt < 90; attempt++) {
        try {
          if (
            await evaluate(
              `(() => { if (window.__widgetAuditPreviousDocument || document.readyState === 'loading') return false; const items = [...document.querySelectorAll('[data-grid-item-type="item"]')]; return items.length > 0 && items.every((item) => item.querySelector('[data-homarr-widget-ready], [data-homarr-widget-error]')); })()`,
            )
          )
            return;
        } catch {
          /* Navigation can briefly replace the execution context. */
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error("Widget grid did not mount after viewport navigation");
    },
    async viewport({ width, height, scale }) {
      await send(
        "Emulation.setDeviceMetricsOverride",
        { width, height, deviceScaleFactor: scale, mobile: false },
        sessionId,
      );
    },
    async screenshot(path, width) {
      await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" }, sessionId);
      const { cssContentSize } = await send("Page.getLayoutMetrics", {}, sessionId);
      const { data } = await send(
        "Page.captureScreenshot",
        {
          format: "png",
          fromSurface: true,
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width, height: Math.ceil(cssContentSize.height), scale: 1 },
        },
        sessionId,
      );
      await writeFile(path, Buffer.from(data, "base64"));
    },
    close() {
      socket.close();
    },
  };
}
