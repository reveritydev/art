import { mkdir, writeFile } from 'node:fs/promises';

const places = [
  ['Heroes Battlegrounds','13076380114'],
  ['Evade','9872472334'],
  ['Ink Game','99567941238278'],
  ['A Universal Time','5130598377'],
  ['Jump Showdown','18519254033'],
  ['Azure Latch','94647229517154'],
  ['Bridger Western','99449877692519'],
  ['Balanced Craftwars Overhaul','8811271345'],
  ['Redliner','94987506187454']
];

const ids = places.map(x=>x[1]).join(',');
const pd = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${ids}`).then(r=>r.json());
const universeIds = [...new Set(pd.map(x=>x.universeId).filter(Boolean))];
const gd = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`).then(r=>r.json());
const byId = new Map((gd.data ?? []).map(x=>[String(x.id),x]));
const timestamp = new Date().toISOString();
const snapshot = places.map(([name,placeId])=>{
  const p=pd.find(x=>String(x.placeId)===placeId);
  const g=p ? byId.get(String(p.universeId)) : null;
  return {name,placeId,universeId:p?.universeId ?? null,visits:g?.visits ?? null,playing:g?.playing ?? null,favorites:g?.favoritedCount ?? null,timestamp};
});

await mkdir('data',{recursive:true});
let history=[];
try{ history=JSON.parse(await (await import('node:fs/promises')).readFile('data/roblox-stats.json','utf8')); }catch{}
history.push(...snapshot);
await writeFile('data/roblox-stats.json',JSON.stringify(history,null,2));
console.log(`Saved ${snapshot.length} Roblox stats at ${timestamp}`);
