(() => {
  const key = "triage-loading-trace";
  const previous = (() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  })();
  const trace = [];
  window.__triageLoadingPrevious = previous;
  window.__triageLoadingTrace = trace;

  const sample = (label) => {
    const now = performance.now();
    const selectors = [
      "[data-loading]",
      "[aria-busy=true]",
      ".skeleton",
      "[class*='skeleton' i]",
      "[class*='loader' i]",
      "[class*='loading' i]",
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(",")));
    const visible = nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const entry = {
      label,
      t: Math.round(now),
      loadingNodes: visible.length,
      loadingClasses: visible.slice(0, 12).map((node) => String(node.className).slice(0, 120)),
      widgets: document.querySelectorAll("[data-board-widget]").length,
      releaseText: Array.from(document.querySelectorAll("[role=group]"))
        .find((node) => node.getAttribute("aria-label") === "Releases")
        ?.innerText?.slice(0, 120) || null,
    };
    trace.push(entry);
    if (trace.length > 300) trace.shift();
    try {
      localStorage.setItem(key, JSON.stringify(trace));
    } catch {
      // Evidence collection must not affect the page if storage is unavailable.
    }
  };

  const start = () => {
    sample("init");
    new MutationObserver(() => sample("mutation")).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    window.addEventListener("load", () => sample("load"), { once: true });
    window.setInterval(() => sample("interval"), 50);
  };

  if (document.documentElement) start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
})();
