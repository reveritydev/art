import { mkdir, writeFile } from 'node:fs/promises';

const SUPABASE_URL = 'https://zvmhdsuorcvbhnxwbrxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsTvsaNkHyagQ7X7HpPcQ_XOPQ4-07';

const settingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.games_json&select=value`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
});
if (!settingsResponse.ok) throw new Error(`Supabase settings API returned ${settingsResponse.status}`);
const settingsRows = await settingsResponse.json();
const games = Array.isArray(settingsRows?.[0]?.value) ? settingsRows[0].value : [];
const places = games
  .map(g => [g.name || 'Roblox Game', String(g.placeId || '')])
  .filter(([, placeId]) => /^\d{4,}$/.test(placeId));

const resolveUniverse = async placeId => {
  const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (!r.ok) throw new Error(`Roblox universe lookup ${placeId} returned ${r.status}`);
  const j = await r.json();
  return j?.universeId ? String(j.universeId) : null;
};

const universePairs = (await Promise.all(places.map(async ([name, placeId]) => {
  try { return [name, placeId, await resolveUniverse(placeId)]; } catch { return [name, placeId, null]; }
}))).filter(x => x[2]);
const universeIds = [...new Set(universePairs.map(x => x[2]))];
const gdResponse = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`);
if (!gdResponse.ok) throw new Error(`Roblox universe API returned ${gdResponse.status}`);
const gd = await gdResponse.json();
const byId = new Map((gd.data ?? []).map(x=>[String(x.id),x]));
const timestamp = new Date().toISOString();
const snapshot = universePairs.map(([name,placeId,universeId])=>{
  const g = byId.get(String(universeId));
  return {name,placeId,universeId,visits:g?.visits ?? null,playing:g?.playing ?? null,favorites:g?.favoritedCount ?? null,timestamp};
});



await mkdir('data',{recursive:true});
let history=[];
try{ history=JSON.parse(await (await import('node:fs/promises')).readFile('data/roblox-stats.json','utf8')); }catch{}
history.push(...snapshot);
await writeFile('data/roblox-stats.json',JSON.stringify(history,null,2));
console.log(`Saved ${snapshot.length} Roblox stats at ${timestamp}`);
