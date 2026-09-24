(() => {
 const handles=[...document.querySelectorAll('button[aria-label^="Settings for"]')].map(e=>{
  const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,visible:r.width>0&&r.height>0};
 });
 const overlaps=[];
 for(let i=0;i<handles.length;i++)for(let j=i+1;j<handles.length;j++){
  const a=handles[i],b=handles[j];const w=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);const h=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
  if(w>0&&h>0)overlaps.push({a:a.label,b:b.label,width:w,height:h});
 }
 return {url:location.href,viewport:{width:innerWidth,height:innerHeight},handles,overlaps};
})()
