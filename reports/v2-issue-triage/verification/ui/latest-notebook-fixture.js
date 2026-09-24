(async()=>{
 const call=async(path,input)=>{
  const r=await fetch('/api/trpc/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({json:input})}); const body=await r.json(); if(!r.ok)throw new Error(JSON.stringify(body));return body.result.data.json;
 };
 const response=await fetch('/api/trpc/board.getBoardByName?input='+encodeURIComponent(JSON.stringify({json:{name:'latest-v2-smoke'}}))); const b=(await response.json()).result.data.json;
 const id=b.id || b.board?.id;
 const item=await call('board.addItem',{boardId:id,kind:'notebook',options:{content:'<h2>Latest V2 notebook</h2><p>Revision 439b20828 persistence fixture.</p>'},integrationIds:[]});
 return {board:b,item};
})()
