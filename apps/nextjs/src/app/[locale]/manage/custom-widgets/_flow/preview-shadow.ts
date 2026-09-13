/** Mirror application CSS into the preview boundary without changing its React tree. */
export function mirrorPreviewStyles(shadow: ShadowRoot) {
  const copies = new Map<Element, Element>();
  const anchor = document.createComment("Application preview styles");
  shadow.prepend(anchor);
  const sync = () => {
    const originals = [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].filter((element) => {
      if (!(element instanceof HTMLLinkElement)) return true;
      return new URL(element.href, location.href).origin === location.origin;
    });
    for (const [original, copy] of copies) {
      if (originals.includes(original)) continue;
      copy.remove();
      copies.delete(original);
    }
    let cursor = shadow.firstChild;
    for (const original of originals) {
      let copy = copies.get(original);
      if (!copy) {
        copy = original.cloneNode(true) as Element;
        copies.set(original, copy);
      }
      if (copy.textContent !== original.textContent) copy.textContent = original.textContent;
      // oxlint-disable-next-line unicorn/no-useless-spread -- Removal changes this live NamedNodeMap during iteration.
      for (const attribute of [...copy.attributes]) {
        if (!original.hasAttribute(attribute.name)) copy.removeAttribute(attribute.name);
      }
      for (const attribute of original.attributes) {
        if (copy.getAttribute(attribute.name) !== attribute.value) copy.setAttribute(attribute.name, attribute.value);
      }
      // Keep source order: it determines which component rules win the cascade.
      if (copy !== cursor) shadow.insertBefore(copy, cursor);
      cursor = copy.nextSibling;
    }
  };
  sync();
  let scheduled = 0;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      sync();
    });
  });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true });
  return () => {
    observer.disconnect();
    cancelAnimationFrame(scheduled);
    for (const copy of copies.values()) copy.remove();
    anchor.remove();
  };
}
