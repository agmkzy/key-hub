export const MAJOR=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export const MINOR=['C','C♯','D','E♭','E','F','F♯','G','G♯','A','B♭','B'];
const letters='CDEFGAB',naturals=[0,2,4,5,7,9,11];
export const mod=n=>((n%12)+12)%12;
export const pc=n=>mod(naturals[letters.indexOf(n[0])]+[...n.slice(1)].reduce((a,c)=>a+('♯#'.includes(c)?1:'♭b'.includes(c)?-1:0),0));
export function spell(root,degree,offset){const l=(letters.indexOf(root[0])+degree)%7;let d=mod(pc(root)+offset-naturals[l]);if(d>6)d-=12;return letters[l]+(d>0?'♯'.repeat(d):'♭'.repeat(-d));}
export function scale(key,minor=false){return(minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map((n,i)=>spell(key,i,n));}
export const romanMajor=['I','ii','iii','IV','V','vi','vii°'],romanMinor=['i','ii°','III','iv','v','VI','VII'];
export const EXTENSIONS=['triad','sus2','sus4','7','maj7','9','maj9','add9'];
export function chord(key,minor,item){
 const s=scale(key,minor),source=item.borrowed?scale(key,!minor):s;
 let root=source[item.degree],base=[0,2,4].map(n=>source[(item.degree+n)%7]);
 let quality=mod(pc(base[1])-pc(root))===3?(mod(pc(base[2])-pc(root))===6?'dim':'minor'):'major';
 let target=null;if(item.applied){target=chord(key,minor,{degree:item.degree,borrowed:!!item.appliedTargetBorrowed});root=spell(target.root,4,7);quality='major';}
 const ext=item.ext||'triad';let degrees=[0,2,4],semitones=[0,quality==='major'?4:3,quality==='dim'?6:7];let suffix=quality==='minor'?'m':quality==='dim'?'dim':'';
 if(ext==='sus2'||ext==='sus4'){degrees=[0,ext==='sus2'?1:3,4];semitones=[0,ext==='sus2'?2:5,7];suffix=ext;}
 else{
  if(ext==='7'||ext==='9'){degrees.push(6);semitones.push(10);suffix=quality==='minor'?'m'+ext:quality==='dim'?(ext==='7'?'m7♭5':'m9♭5'):ext;}
  if(ext==='maj7'||ext==='maj9'){degrees.push(6);semitones.push(11);suffix=quality==='minor'?'m('+ext+')':quality==='dim'?'dim('+ext+')':ext;}
  if(['9','maj9','add9'].includes(ext)){degrees.push(8);semitones.push(14);if(ext==='add9')suffix+='add9';}
 }
 const notes=degrees.map((d,i)=>spell(root,d,semitones[i]));const romans=item.borrowed?(minor?romanMajor:romanMinor):(minor?romanMinor:romanMajor);
 let roman=(item.borrowed&&!minor&&[2,5,6].includes(item.degree)?'♭':'')+romans[item.degree];
 let func=[0,2,5].includes(item.degree)?'Tonic':[1,3].includes(item.degree)?'Predominant':'Dominant';
 if(minor&&!item.borrowed&&[4,6].includes(item.degree))func='Modal tension';
 if(target){roman='V'+(ext==='7'?'7':ext==='9'?'9':'')+'/'+target.roman;func='Dominant of '+target.root;}
 return {root,name:root+suffix,quality,ext,notes,degrees,semitones,roman,func,chromatic:notes.filter(n=>!s.some(a=>pc(a)===pc(n))),borrowed:!!item.borrowed,degree:item.degree,applied:!!item.applied,target:target?.name,item};
}
export function diatonicExtension(key,minor,item){if(item.applied)return '7';let c=chord(key,minor,{...item,ext:'triad'}),s=scale(key,item.borrowed?!minor:minor);return mod(pc(s[(item.degree+6)%7])-pc(c.root))===11?'maj7':'7';}
export function describe(c){if(c.applied)return 'A temporary dominant pulling towards '+c.target+'.';if(c.borrowed)return 'Borrowed colour from the parallel key.';if(c.func==='Tonic')return c.degree===0?'Home. Stable and resolved.':'A softer resting place.';if(c.func==='Predominant')return 'Moves away from home, towards V.';if(c.func==='Modal tension')return 'Gentle pull; no raised leading tone.';return 'Tension that draws you home.';}
export function noteAt(name,midi){const accidental=[...name.slice(1)].reduce((n,c)=>n+(c==='♯'?1:c==='♭'?-1:0),0);return {name,midi,octave:(midi-naturals[letters.indexOf(name[0])]-accidental)/12-1};}
export const noteText=n=>n.name+n.octave;
const inversionNames=['Root position','1st inversion','2nd inversion','3rd inversion','4th inversion'];
const signature=c=>c.notes.join('|');
export function lockVoicing(c,v){return {signature:signature(c),lh:v.lh.map(n=>n.midi),rh:v.rh.map(n=>n.midi)};}
function makeVoicing(c,lh,rh,inversion,local=0){let played=[...lh,...rh].map(n=>pc(n.name));let omitted=c.notes.filter(n=>!played.includes(pc(n))).map(n=>c.notes.indexOf(n)===2?'5th omitted':n+' omitted');let doubled=c.notes.filter(n=>played.filter(p=>p===pc(n)).length>1);return {lh,rh,bass:lh[0].name,inversion:inversionNames[inversion],inversionIndex:inversion,omitted,doubled,local,common:[]};}
export function candidates(c,settings={}){
 const {voicing='Open',hands='Root + fifth',register='Middle'}=settings;
 const shift=register==='Low'?-12:register==='High'?12:0;
 const choice=c.item?.inversion??'auto';const inversions=[0];
 const lock=c.item?.lock;
 if(lock?.signature===signature(c)&&Array.isArray(lock.lh)&&Array.isArray(lock.rh)){
  const map=m=>{let n=c.notes.find(n=>pc(n)===mod(m));return n?noteAt(n,m):null};let lh=lock.lh.map(map),rh=lock.rh.map(map);
  if(lh.length&&rh.length&&[...lh,...rh].every(Boolean)&&rh.at(-1).midi-rh[0].midi<=14&&lh.at(-1).midi-lh[0].midi<=12){let inv=c.notes.findIndex(n=>pc(n)===mod(rh[0].midi));if(pc(lh[0].name)===pc(c.root)&&(choice==='auto'||inv===Number(choice)))return [makeVoicing(c,lh,rh,inv)];}
 }
 const all=[],seen=new Set();
 for(const inv of inversions){if(inv>=c.notes.length)continue;const bassName=c.notes[inv];
  for(let bass=36+shift; bass<=55+shift; bass++){
   if(mod(bass)!==pc(bassName)||bass!==36+shift+mod(pc(bassName)))continue;let lh=[noteAt(bassName,bass)];
   if(hands==='Octave bass')lh.push(noteAt(bassName,bass+12));
   else if(hands==='Root + fifth'){let companion=inv===0?c.notes[2]:c.root;let distance=mod(pc(companion)-pc(bassName))||12;if(distance<5){companion=c.notes.filter(n=>{const d=mod(pc(n)-pc(bassName));return d>=5&&d<=10}).sort((a,b)=>Math.abs(mod(pc(a)-pc(bassName))-7)-Math.abs(mod(pc(b)-pc(bassName))-7))[0]||bassName;distance=mod(pc(companion)-pc(bassName))||12;}lh.push(noteAt(companion,bass+distance));}
   let ix=c.notes.map((_,i)=>i);if(c.notes.length===5&&choice!=='2')ix=ix.filter(i=>i!==2);
   if(choice!=='0'&&ix.length>=4&&lh.some(n=>pc(n.name)===pc(c.root)))ix=ix.filter(i=>i!==0);
   for(let rotation=0;rotation<ix.length;rotation++){
    let order=[...ix.slice(rotation),...ix.slice(0,rotation)];
    for(let bottom=48+shift;bottom<=72+shift;bottom++){
     if(mod(bottom)!==pc(c.notes[order[0]]))continue;
     let midi=bottom;let close=order.map((idx,j)=>{if(j)midi+=mod(pc(c.notes[idx])-mod(midi))||12;return noteAt(c.notes[idx],midi)});
     const shapes=[close];if(close.length>=3){let drop=close.map(n=>({...n}));drop[1]=noteAt(drop[1].name,drop[1].midi-12);shapes.push(drop.sort((a,b)=>a.midi-b.midi));}
     for(const rh of shapes){const rhInv=c.notes.findIndex(n=>pc(n)===mod(rh[0].midi));if(choice!=='auto'&&rhInv!==Number(choice))continue;let span=rh.at(-1).midi-rh[0].midi,gap=rh[0].midi-lh.at(-1).midi;if(span>14||gap<1||rh[0].midi<45+shift||rh.at(-1).midi>88+shift)continue;
      const id=[...lh.map(n=>n.midi),'/',...rh.map(n=>n.midi)].join(',');if(seen.has(id))continue;seen.add(id);
      const desiredGap=voicing==='Closed'?3:voicing==='Open'?9:16;
      let local=Math.abs(gap-desiredGap)*.14+Math.abs((rh[0].midi+rh.at(-1).midi)/2-(voicing==='Wide'?69:voicing==='Closed'?59:64)-shift)*.05+Math.max(0,span-12)*.35+(inv===0?0:.3)+Math.abs(bass-(43+shift))*.035;
      if(voicing==='Closed')local+=Math.max(0,span-8)*.22;
      all.push(makeVoicing(c,lh,rh,rhInv,local));
     }
    }
   }
  }
 }
 // Retain candidates across bass inversions and octaves, rather than eliminating an inversion by accident.
 all.sort((a,b)=>a.local-b.local);const groups=new Map();for(const v of all){const k=v.inversionIndex+':'+v.lh[0].midi;const g=groups.get(k)||[];if(g.length<8){g.push(v);groups.set(k,g)}}
 return [...groups.values()].flat().sort((a,b)=>a.local-b.local);
}
function handDistance(a,b){const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(Infinity));dp[0][0]=0;
 for(let i=0;i<=a.length;i++)for(let j=0;j<=b.length;j++){let n=dp[i][j];if(i<a.length&&j<b.length){let d=Math.abs(a[i].midi-b[j].midi);dp[i+1][j+1]=Math.min(dp[i+1][j+1],n+d+Math.max(0,d-5)*.8);}if(a.length!==b.length){if(i<a.length)dp[i+1][j]=Math.min(dp[i+1][j],n+6);if(j<b.length)dp[i][j+1]=Math.min(dp[i][j+1],n+6);}}
 return dp[a.length][b.length];
}
export function transitionCost(a,b){return handDistance(a.rh,b.rh)+handDistance(a.lh,b.lh)*.5;}
export function optimisePath(lists,loop=false){
 if(!lists.length)return [];if(lists.some(l=>!l.length))throw Error('No playable voicing fits these choices.');
 const edges=lists.slice(1).map((next,i)=>lists[i].map(a=>next.map(b=>transitionCost(a,b))));
 const endEdges=loop?lists.at(-1).map(a=>lists[0].map(b=>transitionCost(a,b))):null;
 let best=Infinity,result=[];const starts=loop?lists[0].map((_,i)=>i):[-1];
 for(const first of starts){let cost=lists[0].map((v,i)=>first<0||i===first?v.local:Infinity),back=[];
  for(let k=1;k<lists.length;k++){const next=Array(lists[k].length).fill(Infinity),parents=[];for(let j=0;j<next.length;j++){for(let i=0;i<cost.length;i++){let n=cost[i]+edges[k-1][i][j]+lists[k][j].local;if(n<next[j]){next[j]=n;parents[j]=i}}}cost=next;back.push(parents);}
  for(let last=0;last<cost.length;last++){let total=cost[last]+(loop?endEdges[last][first]:0);if(total<best){best=total;let path=[last];for(let k=back.length-1;k>=0;k--)path.unshift(back[k][path[0]]);result=path;}}
 }
 return result.map((idx,i)=>lists[i][idx]);
}
const cache=new Map();
export function voicings(chords,settings={}){
 const key=JSON.stringify([chords.map(c=>[c.notes,c.item]),settings.voicing,settings.hands,settings.register,settings.smooth,settings.loop]);if(cache.has(key))return structuredClone(cache.get(key));
 const lists=chords.map(c=>candidates(c,settings));let chosen=settings.smooth===false?lists.map(l=>l[0]):optimisePath(lists,settings.loop===true);
 chosen=chosen.map((v,i)=>({...v,common:(i?chosen[i-1]:settings.loop?chosen.at(-1):null)?.rh.filter(n=>v.rh.some(p=>p.midi===n.midi)).map(n=>n.name)||[]}));
 if(cache.size>80)cache.clear();cache.set(key,chosen);return structuredClone(chosen);
}
export function performance(v,type,rhythm,key,minor,beats=4,startBeat=0){
 const upper=v.rh,low=v.lh,top=upper.at(-1);let order=[...upper],extra=[];
 if(type==='Broken chord')order=[upper[0],upper.at(-1),...upper.slice(1,-1),upper.at(-1)];
 if(type==='Repeated inner note')order=[upper[0],upper[Math.min(1,upper.length-1)],upper.at(-1),upper[Math.min(1,upper.length-1)]];
 if(type==='Neighbour movement'){const s=scale(key,minor),name=s.reduce((best,n)=>{let d=mod(pc(n)-pc(top.name))||12;return !best||d<best.d?{name:n,d}:best},null);let neighbour=noteAt(name.name,top.midi+name.d);order=[top,neighbour,top,top];extra=[neighbour];}
 const effective=type!=='Block'&&rhythm==='Whole bar'?'Quarter pulse':rhythm;
 const mask=effective==='Whole bar'?[0]:effective==='Quarter pulse'?[0,2,4,6]:effective==='Syncopated'?[0,3,4,7]:effective==='Held bass'?[0,2,3,4,5,6,7]:[0,1,2,3,4,5,6,7];
 let n=0;const events=[];for(let tick=0;tick<beats*2;tick++){
  const attack=mask.includes(tick%8),first=tick===0;const rh=attack?(type==='Block'?upper:[order[n++%order.length]]):[];
  const bass=first||(type==='Block'&&effective!=='Held bass'&&attack)?low:[];
  const heldRH=type==='Neighbour movement'?upper.slice(0,-1):[];
  events.push({tick,count:(startBeat+tick/2)%1===0?String((startBeat+tick/2)%4+1):'&',lhAttack:bass,rhAttack:rh,lhHold:bass.length?[]:low,rhHold:heldRH,lowerAttack:first?heldRH:[]});
 }
 // Short chords must still sound every upper harmony tone: group any remaining tones at the final attack.
 const sounded=events.flatMap(e=>[...e.rhAttack,...e.lowerAttack]).map(n=>n.midi);const missing=upper.filter(n=>!sounded.includes(n.midi));if(missing.length){const last=events.filter(e=>e.rhAttack.length).at(-1);last.rhAttack=[...last.rhAttack,...missing].sort((a,b)=>a.midi-b.midi);}
 return {events,extra,rhythm:effective,beats,tip:type==='Block'?'Play the written chord together on each marked count.':type==='Neighbour movement'?'Hold the lower RH harmony; move only the top voice.':'Hold LH through the chord; follow the counted RH attacks. Grouped notes sound together.',heldRH:type==='Neighbour movement'?upper.slice(0,-1):[]};
}
export function movement(v,type,key,minor){let p=performance(v,type,'Quarter pulse',key,minor);return {lh:v.lh.map(noteText).join(' + '),rh:p.events.filter(e=>e.rhAttack.length).map(e=>e.rhAttack.map(noteText).join(' + ')).join(' → '),tip:p.tip};}
export function connectionSuggestions(key,minor,from,to,settings={}){
 const target=chord(key,minor,to),current=chord(key,minor,from);let suggestions=[];
 for(const ext of ['maj7','add9','maj9','7','9']){if(ext===(from.ext||'triad'))continue;const item={...from,ext,lock:undefined,inversion:'auto',beats:2};const c=chord(key,minor,item);const added=c.notes.filter(n=>!current.notes.includes(n));const shared=c.notes.filter(n=>target.notes.some(t=>pc(t)===pc(n)));if(!added.some(n=>target.notes.some(t=>pc(t)===pc(n))))continue;
  suggestions.push({kind:'colour',item,chord:c,shared,reason:'Introduces '+added.filter(n=>target.notes.some(t=>pc(t)===pc(n))).join(' · ')+' from '+target.name+'.',score:shared.length-c.chromatic.length*.7});
 }
 if(!to.applied&&target.quality!=='dim'){const item={degree:to.degree,applied:true,appliedTargetBorrowed:!!to.borrowed,ext:'7',inversion:'auto',beats:2};let c=chord(key,minor,item);suggestions.push({kind:'bridge',item,chord:c,shared:c.notes.filter(n=>target.notes.some(t=>pc(t)===pc(n))),reason:'Dominant of '+target.name+'. '+c.notes[1]+' leads up a semitone to '+target.root+'.',score:0});}
 suggestions.sort((a,b)=>b.score-a.score);return suggestions.map(s=>{let seq=[from,s.item,to].map(i=>chord(key,minor,i));return {...s,voices:voicings(seq,{...settings,loop:false,smooth:true})};});
}
