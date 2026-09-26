import {arrangementCandidates,melodyMap} from './arrangement-v3.2.js';
import {pc,mod,noteAt,noteText,scale,optimisePath} from './music-v3.2.js';

export const LH_ROLES=['Bass','Harmony','Melody','None'];
export const RH_ROLES=['Harmony','Melody','Harmony + Melody','None'];
export const BASS_NOTES=['Root','Octave','Root + 5th','Root + 5th + Octave','10th','Follow RH Shape'];
export const LH_VOICINGS=['Auto','Closed','Open','Wide','Shell'];
export const SHAPES=['Auto','Root position','1st inversion','2nd inversion','3rd inversion','4th inversion'];
export const HAND_DEFAULTS={lhRole:'Bass',lhNotes:'Root + 5th',lhVoicing:'Auto',lhMovement:'Held',rhRole:'Harmony',rhShape:'Auto',rhMovement:'Held'};
export const harmonyRole=role=>role==='Harmony'||role==='Harmony + Melody';
export function movements(hand,role){
 if(role==='None'||role==='Melody')return [];
 if(role==='Bass')return ['Held','Pulse','Alternating','Octaves','Broken','Arpeggio','Rolling'];
 return ['Held','Pulse','Broken','Arpeggio','Rolling',...(hand==='lh'?['Alberti','Stride']:['Neighbour','Repeated inner note'])];
}
const rhLegacy={'Block':'Held','Broken chord':'Broken','Rolling':'Arpeggio','Neighbour movement':'Neighbour','Repeated inner note':'Repeated inner note'};
function legacyHands(s){
 const melody=['Melody + Chords','Melody + Broken Harmony','Stride'].includes(s.arrangement);
 return {...HAND_DEFAULTS,lhRole:melody||s.foundation==='Shell'?'Harmony':'Bass',lhNotes:(s.foundation==='Shell'?'Root + Fifth':s.foundation||({'Simple':'Root','Octave bass':'Octave'}[s.hands])||'Root + Fifth').replace('Fifth','5th'),lhVoicing:s.foundation==='Shell'?'Shell':'Auto',lhMovement:s.arrangement==='Stride'?'Stride':((!melody&&s.pattern==='Alberti')?'Rolling':{'Alternating Bass':'Alternating'}[s.pattern]||s.pattern||(s.arrangement==='Melody + Broken Harmony'?'Rolling':'Held')),rhRole:melody?'Melody':s.arrangement==='Melodic Chords'?'Harmony + Melody':'Harmony',rhMovement:rhLegacy[s.movement]||'Held'};
}
export function migrateHands(config){
 const s=structuredClone(config);s.progression??=[];s.loop??=true;s.smooth??=true;s.voicing??='Open';s.register??='Middle';s.rhythm??='Whole bar';s.melody??=true;
 if(s.handModel!==1){
  const defaults=legacyHands(s);Object.assign(s,defaults);
  s.progression=s.progression.map(item=>{
   const c={...item},old=c.overrides||{},converted=legacyHands({...config,...old}),overrides={};
   for(const key of Object.keys(HAND_DEFAULTS))if(converted[key]!==defaults[key])overrides[key]=converted[key];
   if(old.pattern)overrides.lhMovement=converted.lhMovement;
   if(old.movement)overrides.rhMovement=converted.rhMovement;
   if(old.foundation){overrides.lhNotes=converted.lhNotes;if(old.foundation==='Shell'){overrides.lhRole='Harmony';overrides.lhVoicing='Shell';}}
   if(old.arrangement){overrides.lhRole=converted.lhRole;overrides.rhRole=converted.rhRole;if(old.arrangement==='Stride')overrides.lhMovement='Stride';}
   if(old.voicing)overrides.voicing=old.voicing;
   if(old.register)overrides.register=old.register;
   if(old.topVoice)overrides.topVoice=old.topVoice;
   if(c.inversion&&c.inversion!=='auto')overrides.rhShape=SHAPES[Number(c.inversion)+1];
   c.overrides=overrides;delete c.inversion;delete c.beats;
   if(c.lock)c.lock.handModel=1;
   return c;
  });
  s.handModel=1;
 }
 for(const key of ['arrangement','foundation','pattern','movement','hands'])delete s[key];
 for(const [key,value] of Object.entries(HAND_DEFAULTS))s[key]??=value;
 return s;
}
export function effectiveHands(item,s){
 const v={...HAND_DEFAULTS,...s,...item.overrides};
 for(const hand of ['lh','rh']){const list=movements(hand,v[hand+'Role']);if(list.length&&!list.includes(v[hand+'Movement']))v[hand+'Movement']='Held';}
 if(v.lhNotes==='Follow RH Shape'&&!harmonyRole(v.rhRole))v.lhNotes='Root';
 return v;
}
const shiftNote=(n,amount)=>noteAt(n.name,n.midi+amount);
const above=(name,bottom)=>noteAt(name,bottom+mod(pc(name)-mod(bottom)));
const unique=notes=>[...new Map(notes.map(n=>[n.midi,n])).values()].sort((a,b)=>a.midi-b.midi);
function candidatesForHands(c,s){
 const shift=s.register==='Low'?-12:s.register==='High'?12:0;
 const rhActive=harmonyRole(s.rhRole),lhActive=s.lhRole==='Harmony';
 let inversion=SHAPES.indexOf(s.rhShape)-1;if(inversion>=c.notes.length||inversion===3&&c.degrees[3]!==6)inversion=-1;
 const source={...c,item:{...c.item,lock:undefined,inversion:inversion<0?'auto':String(inversion)}};
 const foundation=s.lhNotes.replace('5th','Fifth');
 let right=rhActive?arrangementCandidates(source,{...s,arrangement:s.rhRole==='Harmony + Melody'?'Melodic Chords':'Chordal',foundation:s.lhRole==='Bass'?foundation:'Root',fullHarmony:s.lhRole!=='Bass',topVoice:s.rhRole==='Harmony + Melody'?s.topVoice:undefined}):[{rh:[],lh:[],local:0,inversion:'',inversionIndex:-1}];
 let left=lhActive?arrangementCandidates({...source,item:{...source.item,inversion:'auto'}},{...s,arrangement:'Melody + Chords',pattern:s.lhMovement==='Alberti'?'Alberti':'Held',voicing:s.lhVoicing==='Auto'?'Open':s.lhVoicing,foundation:'Root'}):[{lh:[],local:0}];
 if(lhActive&&s.lhVoicing==='Shell')left=left.map(v=>{const root=above(c.root,43+shift);return {...v,lh:[root,above(c.notes[1],root.midi+1),...(c.degrees[3]===6?[above(c.notes[3],root.midi+1)]:[])]}});
 const all=[];
 for(const r of right)for(const l of left){
  let lh=s.lhRole==='Bass'?r.lh:l.lh,rh=r.rh;
  if(s.lhRole==='Bass'&&!rhActive){const bass=above(c.root,36+shift),fifth=above(c.notes[2],bass.midi+1);lh=[bass];if(s.lhNotes==='Octave')lh.push(shiftNote(bass,12));if(s.lhNotes.startsWith('Root + 5th'))lh.push(fifth);if(s.lhNotes==='Root + 5th + Octave')lh.push(shiftNote(bass,12));if(s.lhNotes==='10th')lh.push(above(c.notes[1],bass.midi+13));}
  let penalty=0;if(lh.length&&rh.length&&pattern(c,lh,'lh',s).notes.at(-1).midi>=rh[0].midi){rh=rh.map(n=>shiftNote(n,12));penalty=2;}
  if(rh.length&&rh.at(-1).midi>100)continue;
  const played=[...lh,...rh];all.push({...r,lh,rh,bass:lh[0]?.name||rh[0]?.name||null,local:r.local+(lhActive?l.local:0)+penalty,omitted:c.notes.filter(n=>!played.some(x=>pc(x.name)===pc(n))).map(n=>n+' omitted'),common:[]});
 }
 const distinct=new Map();all.sort((a,b)=>a.local-b.local);for(const v of all){const key=v.lh.map(n=>n.midi).join()+':'+v.rh.map(n=>n.midi).join();if(!distinct.has(key))distinct.set(key,v);}
 let result=[...distinct.values()];
 const lock=c.item.lock;if(lock?.signature===c.notes.join('|')){const match=result.find(v=>v.lh.map(n=>n.midi).join()===lock.lh.join()&&v.rh.map(n=>n.midi).join()===lock.rh.join());if(match)return [match];}
 // Bound the joint search while keeping different RH shapes and LH bass positions.
 if(result.length>64){const groups=new Map();for(const v of result){const key=v.inversionIndex+':'+v.lh[0]?.midi;const group=groups.get(key)||[];group.push(v);groups.set(key,group)}const selected=[];for(let round=0;selected.length<64;round++){let added=false;for(const group of groups.values())if(group[round]&&selected.length<64){selected.push(group[round]);added=true;}if(!added)break;}result=selected;}
 return result;
}
function pattern(c,notes,hand,s){
 const role=s[hand+'Role'],movement=s[hand+'Movement'];
 if(!notes.length)return {role,movement:role,steps:[],held:[],extra:[],notes:[],pulse:''};
 let steps=[],held=[],extra=[];const low=notes[0],high=notes.at(-1),middle=notes[Math.floor((notes.length-1)/2)];
 switch(movement){
  case 'Pulse':steps=[notes,notes,notes,notes];break;
  case 'Broken':steps=[[low],[high],...notes.slice(1,-1).map(n=>[n]),[high]];break;
  case 'Arpeggio':steps=notes.map(n=>[n]);if(high.midi<low.midi+12)steps.push([shiftNote(low,12)]);break;
  case 'Rolling':steps=[[low],[high],[middle],[high]];break;
  case 'Alberti':{const root=notes.find(n=>n.name===c.root)||low;const third=above(c.notes[1],root.midi+1),fifth=above(c.notes[2],third.midi+1);steps=[[root],[fifth],[third],[fifth]];break;}
  case 'Alternating':{const other=notes.length>1?notes[1]:above(c.notes[2],low.midi+1);steps=[[low],[other],[low],[other]];break;}
  case 'Octaves':{const tones=notes.filter((n,i)=>notes.findIndex(x=>pc(x.name)===pc(n.name))===i);steps=tones.flatMap(n=>[[n],[shiftNote(n,12)]]);if(steps.length===2)steps=[...steps,...steps];break;}
  case 'Stride':{const bass=above(c.root,(s.register==='Low'?24:s.register==='High'?48:36));steps=[[bass],notes,[bass],notes];break;}
  case 'Repeated inner note':steps=[[low],[notes[Math.min(1,notes.length-1)]],[high],[notes[Math.min(1,notes.length-1)]]];break;
  case 'Neighbour':{const target=scale(s.key,s.minor).map(name=>({name,d:mod(pc(name)-pc(high.name))||12})).sort((a,b)=>a.d-b.d)[0];const neighbour=noteAt(target.name,high.midi+target.d);steps=[[high],[neighbour],[high]];held=notes.slice(0,-1);extra=[neighbour];break;}
  default:steps=[notes];
 }
 if(role==='Harmony'||role==='Harmony + Melody'){const sounded=steps.flat();held=unique([...held,...notes.filter(n=>!sounded.some(x=>x.midi===n.midi))]);}
 const pulse=movement==='Held'?'':s.rhythm==='Eighth pulse'?'½ beat':s.rhythm==='Syncopated'?'1 · &2 · 3 · &4':s.rhythm==='Held bass'&&hand==='rh'?'1 · 2 · &2 · 3 · &3 · 4 · &4':'1 beat';
 return {role,movement,steps,held,extra,notes:unique([...steps.flat(),...held]),pulse};
}
export function planHands(chords,settings){
 const settingsList=chords.map(c=>effectiveHands(c.item,settings));
 const lists=chords.map((c,i)=>candidatesForHands(c,settingsList[i]));
 const selected=settings.smooth===false?lists.map(l=>l[0]):optimisePath(lists,settings.loop===true);
 return selected.map((v,i)=>{
  const s=settingsList[i],c=chords[i],lh=pattern(c,v.lh,'lh',s),rh=pattern(c,v.rh,'rh',s),map=melodyMap(c,s.key,s.minor);
  return {settings:s,voice:v,lh,rh,roles:{lh:s.lhRole,rh:s.rhRole},keyboard:{lh:lh.notes,rh:rh.notes},melody:{land:map.land,colour:map.colour,move:map.connect}};
 });
}
export function sequenceText(steps){return steps.map(ns=>ns.map(noteText).join(' · ')).join(' → ');}
