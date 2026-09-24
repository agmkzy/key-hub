import {candidates,optimisePath,voicings,pc,mod,noteAt,noteText,scale,performance} from './music-v3.0.js';

export const ARRANGEMENTS=['Chordal','Melody + Chords','Melody + Broken Harmony','Stride','Melodic Chords'];
export const FOUNDATIONS=['Root','Octave','Root + Fifth','Root + Fifth + Octave','10th','Shell','Follow RH Shape'];
export const PATTERNS=['Held','Broken','Rolling','Alberti','Alternating Bass','Pulse'];
export const melodyOnly=a=>['Melody + Chords','Melody + Broken Harmony','Stride'].includes(a);
export const defaultPattern=a=>a==='Melody + Broken Harmony'?'Rolling':'Held';
export function effectiveSettings(item,settings){
 const overrides=item.overrides||{}, arrangement=overrides.arrangement||settings.arrangement||'Chordal';
 return {...settings,arrangement,foundation:settings.foundation||({'Simple':'Root','Octave bass':'Octave','Root + fifth':'Root + Fifth'}[settings.hands])||'Root + Fifth',pattern:settings.pattern||defaultPattern(arrangement),...overrides};
}
const shifted=(n,octaves)=>noteAt(n.name,n.midi+12*octaves);
const atOrAbove=(name,bottom)=>noteAt(name,bottom+mod(pc(name)-mod(bottom)));
function foundationNotes(c,v,type,shift){
 const root=atOrAbove(c.root,36+shift),fifth=atOrAbove(c.notes[2],root.midi+1);
 if(type==='Follow RH Shape')return [atOrAbove(v.rh[0].name,36+shift)];
 if(type==='Octave')return [root,shifted(root,1)];
 if(type==='Root + Fifth + Octave')return [root,fifth,shifted(root,1)];
 if(type==='10th')return [root,atOrAbove(c.notes[1],root.midi+13)];
 if(type==='Shell')return [root,atOrAbove(c.notes[1],root.midi+1),...(c.degrees[3]===6?[atOrAbove(c.notes[3],root.midi+1)]:[])].sort((a,b)=>a.midi-b.midi);
 return type==='Root + Fifth'?[root,fifth]:[root];
}
function describeVoice(c,v){const sounded=[...v.lh,...v.rh].map(n=>pc(n.name));return {...v,bass:v.lh[0].name,omitted:c.notes.filter(n=>!sounded.includes(pc(n))).map(n=>n+' omitted'),doubled:[]};}
function arrangementCandidates(c,s){
 const shift=s.register==='Low'?-12:s.register==='High'?12:0;
 const hasMelody=melodyOnly(s.arrangement);
 // The existing candidate search and path optimiser remain the source of harmonic shapes.
 const source=hasMelody?{...c,item:{...c.item,inversion:s.pattern==='Alberti'?'0':'auto',lock:undefined}}:c;
 let shapes=candidates(source,{...s,hands:'Simple',harmonyHand:hasMelody?'left':undefined});
 if(hasMelody){
  shapes=shapes.filter(v=>v.rh.at(-1).midi-v.rh[0].midi<=12).map(v=>{
   let lh=v.rh.map(n=>shifted(n,-1));
   while(lh[0].midi<43+shift)lh=lh.map(n=>shifted(n,1));
   while(lh.at(-1).midi>67+shift)lh=lh.map(n=>shifted(n,-1));
   return describeVoice(c,{...v,lh,rh:[],local:Math.abs((lh[0].midi+lh.at(-1).midi)/2-(53+shift))*.12});
  });
 }else{
  // For standard Chordal settings preserve the previous voicings exactly.
  const legacy={'Root':'Simple','Octave':'Octave bass','Root + Fifth':'Root + fifth'}[s.foundation];
  if(legacy)shapes=candidates(c,{...s,hands:legacy});
  shapes=shapes.map(v=>{
   let rh=v.rh,lh=foundationNotes(c,v,s.foundation,shift);
   while(rh[0].midi<=lh.at(-1).midi)rh=rh.map(n=>shifted(n,1));
   if(s.arrangement==='Melodic Chords'&&s.topVoice){
    const allowed=[...c.notes,...scale(s.key,s.minor)];const name=allowed.find(n=>n===s.topVoice);
    if(name){
     // A fixed bottom and chosen top can leave less room for inner harmony.
     // Retain playable inner notes, removing duplicates or notes above the new top.
     let top=atOrAbove(name,Math.max(rh[0].midi+1,rh.at(-1).midi-5));
     if(top.midi-rh[0].midi>14)top=shifted(top,-1);
     const bottom=rh[0],lower=[bottom];
     for(let n of rh.slice(1,-1)){if(n.midi>=top.midi)n=shifted(n,-1);if(n.midi>bottom.midi&&n.midi<top.midi&&!lower.some(x=>x.midi===n.midi))lower.push(n);}
     rh=[...lower.sort((a,b)=>a.midi-b.midi),top];
    }
   }
   return describeVoice(c,{...v,lh,rh});
  }).filter(v=>v.rh.at(-1).midi-v.rh[0].midi<=16);
 }
 // Locks in melody arrangements hold the accompaniment shape, never invent melody notes.
 const lock=c.item?.lock;
 if(lock?.signature===c.notes.join('|')&&lock.arrangement===s.arrangement){const match=shapes.find(v=>v.lh.map(n=>n.midi).join()===lock.lh.join()&&v.rh.map(n=>n.midi).join()===lock.rh.join());if(match)return [match];}
 const unique=new Map();for(const v of shapes){const k=[...v.lh,...v.rh].map(n=>n.midi).join();if(!unique.has(k))unique.set(k,v);}
 return [...unique.values()].sort((a,b)=>a.local-b.local);
}
export function melodyMap(c,key,minor){
 const land=c.notes.slice(0,3),s=scale(key,minor);
 const seventh=s[(c.degree+6)%7];
 const colour=c.notes.slice(3);if(!colour.length&&!c.applied&&!c.borrowed&&!land.some(n=>pc(n)===pc(seventh)))colour.push(seventh);
 const connect=s.filter(n=>![...land,...colour].some(x=>pc(x)===pc(n)));
 return {land,colour,connect};
}
export function accompaniment(c,v,s){
 const shift=s.register==='Low'?-12:s.register==='High'?12:0;
 const root=atOrAbove(c.root,36+shift),fifth=atOrAbove(c.notes[2],root.midi+1);
 if(s.arrangement==='Stride')return {name:'Stride',steps:[[root],v.lh,[root],v.lh],timing:'One step per beat: bass → chord → bass → chord.'};
 const notes=v.lh,low=notes[0],high=notes.at(-1),middle=notes[Math.floor((notes.length-1)/2)];
 let steps;
 switch(s.pattern){
  case 'Broken':steps=notes.map(n=>[n]);break;
  case 'Rolling':{const spread=[...notes];if(spread.length===1)spread.push(shifted(low,1));else if(spread.at(-1).midi<low.midi+12)spread.push(shifted(low,1));steps=spread.map(n=>[n]);break;}
  case 'Alberti':{if(melodyOnly(s.arrangement)){const bass=notes.find(n=>n.name===c.root)||low;const third=atOrAbove(c.notes[1],bass.midi+1),fifth=atOrAbove(c.notes[2],third.midi+1);steps=[[bass],[fifth],[third],[fifth]];}else steps=[[low],[high],[middle],[high]];break;}
  case 'Alternating Bass':{const bass=melodyOnly(s.arrangement)?(notes.find(n=>n.name===c.root)||low):root;const other=melodyOnly(s.arrangement)?(notes.find(n=>n.name===c.notes[2])||atOrAbove(c.notes[2],bass.midi+1)):fifth;steps=[[bass],[other],[bass],[other]];break;}
  case 'Pulse':steps=[notes,notes,notes,notes];break;
  default:steps=[notes];
 }
 const timing=s.pattern==='Held'?'Hold LH through the harmony.':s.rhythm==='Eighth pulse'?'Two LH steps per beat; repeat.':s.rhythm==='Syncopated'?'LH attacks: 1, & of 2, 3, & of 4; repeat.':'One LH step per beat; repeat.';
 const sounded=steps.flat().map(n=>pc(n.name));const held=melodyOnly(s.arrangement)?notes.filter(n=>!sounded.includes(pc(n.name))):[];return {name:s.pattern,steps,held,timing:timing+(held.length?' Hold '+held.map(noteText).join(' · ')+' alongside.':'')};
}
export const sequenceText=steps=>steps.map(ns=>ns.length>1?'['+ns.map(noteText).join(' · ')+']':ns.map(noteText).join('')).join(' → ');
export function arrange(chords,settings){
 const effective=chords.map(c=>effectiveSettings(c.item,settings));
 const lists=chords.map((c,i)=>arrangementCandidates(c,effective[i]));
 const voices=settings.smooth===false?lists.map(l=>l[0]):optimisePath(lists,settings.loop===true);
 return voices.map((voice,i)=>{const c=chords[i],s=effective[i];const accompanimentPlan=accompaniment(c,voice,s);
  const lh=[...new Map([...accompanimentPlan.steps.flat(),...(accompanimentPlan.held||[])].map(n=>[n.midi,n])).values()].sort((a,b)=>a.midi-b.midi);
  const rhPlan=voice.rh.length?performance(voice,s.movement,s.rhythm,s.key,s.minor):null;
  const previous=i?voices[i-1]:settings.loop?voices.at(-1):null;
  const v={...voice,common:previous?.rh.filter(n=>voice.rh.some(x=>x.midi===n.midi)).map(n=>n.name)||[]};
  return {settings:s,voice:v,keyboard:{lh,rh:v.rh},accompaniment:accompanimentPlan,rhPlan,melody:melodyMap(c,s.key,s.minor),melodyOnly:melodyOnly(s.arrangement),roles:melodyOnly(s.arrangement)?{lh:s.arrangement==='Stride'?'Bass + chord':s.arrangement==='Melody + Broken Harmony'?'Moving harmony':'Harmony',rh:'Melody'}:{lh:'Foundation',rh:s.arrangement==='Melodic Chords'?'Harmony + melody':'Harmony'}};
 });
}
