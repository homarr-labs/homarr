(async () => {
  const read = await fetch('/api/trpc/board.getBoardByName?input=' + encodeURIComponent(JSON.stringify({json:{name:'v2-triage-ui'}})));
  const board = (await read.json()).result.data.json;
  const root = board.sections.find(s => s.kind === 'empty');
  const outer = board.sections.find(s => s.kind === 'container');
  outer.options = {...outer.options,title:'Outer triage',showLabel:false,collapsible:true};
  outer.layouts = board.layouts.map(l => ({layoutId:l.id,parentSectionId:root.id,xOffset:0,yOffset:3,width:l.role==='base'?8:3,height:8}));
  const inner = {id:'triage-inner-container',kind:'container',options:{...outer.options,title:'Inner triage'},collapsed:false,layouts:outer.layouts.map(l=>({...l,parentSectionId:outer.id,xOffset:0,yOffset:0,width:l.width,height:7}))};
  const deep = {id:'triage-deep-container',kind:'container',options:{...outer.options,title:'Deep triage'},collapsed:false,layouts:inner.layouts.map(l=>({...l,parentSectionId:inner.id,height:6}))};
  board.sections.push(inner,deep);
  for(const item of board.items) item.layouts=item.layouts.map(l=>({...l,sectionId:deep.id,xOffset:item.kind==='notebook'?0:1,yOffset:0,width:1,height:2}));
  const payload={id:board.id,sections:board.sections,items:board.items};
  const response=await fetch('/api/trpc/board.saveBoard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:payload})});
  return {status:response.status,body:await response.json(),fixture:payload};
})()
