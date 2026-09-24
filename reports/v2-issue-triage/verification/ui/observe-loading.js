(() => {
  window.__triageLoading = [];
  const sample = () => {
    const skeletons = [...document.querySelectorAll('[class*="Skeleton"]')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height);
    const loaders = [...document.querySelectorAll('[class*="Loader"]')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height);
    const row = {time:Math.round(performance.now()),skeletons:skeletons.length,loaders:loaders.length,items:document.querySelectorAll('[data-item-id]').length};
    const previous=window.__triageLoading.at(-1);
    if(!previous || previous.skeletons!==row.skeletons || previous.loaders!==row.loaders || previous.items!==row.items) window.__triageLoading.push(row);
  };
  new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(sample,25);
})();
