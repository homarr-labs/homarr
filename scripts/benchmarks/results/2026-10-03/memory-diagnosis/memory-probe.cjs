const fs = require('node:fs');
const bun = !!process.versions.bun;
const started = Date.now();
const heapStats = bun ? require('bun:jsc').heapStats : null;
const v8 = bun ? null : require('node:v8');
const dump = (event) => {
 const data = {event,elapsedMs:Date.now()-started,pid:process.pid,engine:bun?'bun':'node',memory:process.memoryUsage(),heap:bun?heapStats():v8.getHeapStatistics()};
 console.log('[DEBUG-bun-memory]'+JSON.stringify(data));
};
let forced=false;
setInterval(()=>{
 if(!forced && fs.existsSync('/appdata/memory-gc-trigger')) {
  forced=true; dump('before-forced-gc');
  if(bun) Bun.gc(true); else global.gc();
  dump('after-forced-gc');
 }
 dump('sample');
},3000).unref();
dump('preload');
