(async()=>{
 const apps=(await(await fetch('/api/trpc/app.all')).json()).result.data.json.slice(0,2);
 const created=[];
 for(const app of apps){const r=await fetch('/api/trpc/board.addItem',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:{boardId:'yo27ah0szd8e15gjszfjh94r',kind:'app',options:{appId:app.id},integrationIds:[]}})});created.push({app:app.name,result:await r.json()});}
 const board=(await(await fetch('/api/trpc/board.getBoardByName?input='+encodeURIComponent(JSON.stringify({json:{name:'v2-triage-ui'}})))).json()).result.data.json;
 let index=0;
 for(const item of board.items){if(item.kind!=='app')continue;item.layouts=item.layouts.map(l=>({...l,sectionId:'triage-deep-container',xOffset:index,yOffset:2,width:1,height:1}));index++;}
 const r=await fetch('/api/trpc/board.saveBoard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:{id:board.id,sections:board.sections,items:board.items}})});
 return {created,saveStatus:r.status,saveBody:await r.json()};
})()
