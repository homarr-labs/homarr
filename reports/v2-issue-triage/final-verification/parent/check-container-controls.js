(() => {
 const buttons=[...document.querySelectorAll('button[aria-label]')].filter(e=>/^(Settings for|Collapse:) Depth /.test(e.getAttribute('aria-label')));
 const controls=buttons.map(e=>{const r=e.getBoundingClientRect();const owner=e.closest('[data-grid-item-content]').getBoundingClientRect();return {label:e.getAttribute('aria-label'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},withinCard:r.left>=owner.left-1&&r.right<=owner.right+1&&r.top>=owner.top-12&&r.bottom<=owner.bottom+1,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.getAttribute('aria-label')};});
 return {viewport:{width:innerWidth,height:innerHeight},controls};
})()
