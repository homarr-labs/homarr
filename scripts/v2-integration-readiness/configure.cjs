const { DatabaseSync } = require('node:sqlite');
const { createCipheriv, randomBytes } = require('node:crypto');
const db = new DatabaseSync('/appdata/db/db.sqlite');
const ids = db.prepare("select id from item where kind in ('dnsHoleSummary','dnsHoleControls')").all();
if (!ids.length) throw new Error('No DNS widgets');
const id = 'v2-readiness-adguard';
db.prepare('insert into integration (id,name,url,kind) values (?,?,?,?)').run(id,'Readiness fixture','http://127.0.0.1:9077','adGuardHome');
const insertSecret = db.prepare('insert into integrationSecret (integration_id,kind,value,updated_at) values (?,?,?,?)');
for (const kind of ['username','password']) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(process.env.SECRET_ENCRYPTION_KEY,'hex'), iv);
  const encrypted = Buffer.concat([cipher.update('fixture'),cipher.final()]);
  insertSecret.run(id,kind,`${encrypted.toString('hex')}.${iv.toString('hex')}`,Math.floor(Date.now()/1000));
}
for (const item of ids) {
  db.prepare('delete from integration_item where item_id = ?').run(item.id);
  db.prepare('insert into integration_item (item_id,integration_id) values (?,?)').run(item.id,id);
}
console.log(JSON.stringify({configuredDnsWidgets:ids.length}));
db.close();
