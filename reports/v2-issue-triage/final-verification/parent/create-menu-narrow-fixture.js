(async()=>{
const call=async(path,input)=>{const r=await fetch('/api/trpc/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:input})});const b=await r.json();if(!r.ok)throw new Error(JSON.stringify(b));return b.result.data.json;};
await call('board.createBoard',{name:'menu-narrow',columnCount:12,isPublic:true});
const response=await fetch('/api/trpc/board.getBoardByName?input='+encodeURIComponent(JSON.stringify({json:{name:'menu-narrow'}})));
const board=(await response.json()).result.data.json;const root=board.sections.find(s=>s.kind==='empty');
const options={"borderColor": "", "collapsible": true, "customCssClasses": [], "scrollable": false, "showLabel": false, "showOpenAll": false, "title": "Outer triage"};let parent=root.id;
for(let depth=0;depth<4;depth++){const id=board.id+'-depth-'+depth;board.sections.push({id,kind:'container',options:{...options,title:'Depth '+depth,showLabel:false,collapsible:true},collapsed:false,layouts:board.layouts.map(l=>({layoutId:l.id,parentSectionId:parent,xOffset:0,yOffset:0,width:1,height:8-depth}))});parent=id;}
await call('board.saveBoard',{id:board.id,sections:board.sections,items:board.items});return board;
})()
