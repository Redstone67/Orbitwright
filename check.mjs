import {MISSIONS,PARTS,ORBITS,LAUNCHERS,DIFFICULTIES} from './src/config.js';import {scoreMission} from './src/engine.js';
const ids=a=>a.map(x=>x.id),ins=ids(PARTS.instruments),subs=[];for(let m=1;m<128;m++){const s=ins.filter((_,i)=>m>>i&1);if(s.length>=3&&s.length<=6)subs.push(s)}
for(const ms of MISSIONS)for(const d of ['Cadet','Engineer','Flight Director']){const w=new Set();let n=0;
 for(const b of ids(PARTS.buses))for(const p of ids(PARTS.power))for(const c of ids(PARTS.comms))for(const l of ids(LAUNCHERS))for(const o of ms.requirements.orbit)for(const i of subs){
  const r=scoreMission({mission:ms.id,difficulty:d,bus:b,power:p,comms:c,instruments:i,launcher:l,orbit:o},ms,d);
  if(r.launchOK&&r.powerOK&&r.dataOK&&r.budgetOK&&r.science>=80){n++;w.add(b+p+c+l+o)}}
 console.log(ms.id.padEnd(11),d.padEnd(16),'winning designs:',n,'distinct hardware combos:',w.size)}
