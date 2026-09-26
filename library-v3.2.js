const c=(degree,extra={})=>({degree,ext:'triad',inversion:'auto',beats:4,...extra});
const p=(id,name,minor,group,sequence,description)=>({id,name,minor,group,sequence:sequence.map(x=>typeof x==='number'?c(x):x),description});
export const library=[
p('familiar','Familiar four-chord loop',false,'Loops',[0,4,5,3],'Home, tension, relative minor, then a broad return.'),
p('relative','Relative-minor opening',false,'Loops',[5,3,0,4],'Begin on vi while keeping the major-key landscape.'),
p('fifties','Classic turnaround',false,'Loops',[0,5,3,4],'Tonic and relative minor lead through IV to V.'),
p('pop-turn','Circle turnaround',false,'Loops',[0,5,1,4],'A chain of descending fifth relationships after I.'),
p('floating','Floating shared tones',false,'Loops',[0,2,3,0],'Connect tonic-related chords without a dominant cadence.'),
p('four-five','IV–V opening',false,'Loops',[3,4,2,5],'Delay tonic arrival; let iii move into vi.'),
p('cadence','Prepared resolution',false,'Cadences',[1,4,0],'ii prepares V; V resolves to I.'),
p('plagal','Plagal return',false,'Cadences',[0,3,0],'IV returns directly to I, without a dominant chord.'),
p('authentic','A complete cadence',false,'Cadences',[0,3,4,0],'Leave home, build dominant tension, and resolve.'),
p('deceptive','An unexpected landing',false,'Cadences',[0,3,4,5],'V lands on vi instead of the expected tonic.'),
p('minor-four','Borrowed minor iv',false,'Borrowed colour',[0,3,c(3,{borrowed:true}),0],'Lower IV’s third to make iv, then resolve inward to I.'),
p('flat-six','Parallel-minor colours',false,'Borrowed colour',[0,c(5,{borrowed:true}),c(6,{borrowed:true}),0],'Borrow ♭VI and ♭VII from the parallel minor.'),
p('applied-v','Prepare the dominant',false,'Connecting chords',[0,c(4,{applied:true,ext:'7'}),4,0],'V7/V introduces a raised fourth degree before V.'),
p('applied-vi','Lean into the relative minor',false,'Connecting chords',[0,c(5,{applied:true,ext:'7'}),5,3],'The dominant of vi makes the relative minor an arrival.'),
p('minor-loop','Minor four-chord loop',true,'Loops',[0,5,2,6],'Move from minor home through VI, III and VII.'),
p('minor-desc','Natural-minor descent',true,'Descending bass',[0,6,5,4],'Root notes descend 1–7–6–5; v keeps the natural minor seventh.'),
p('andalusian','Descent with major V',true,'Descending bass',[0,6,5,c(4,{borrowed:true})],'Raise the leading tone in V to strengthen the return to i.'),
p('minor-cadence','Minor-key resolution',true,'Cadences',[0,3,c(4,{borrowed:true}),0],'iv prepares major V; its raised leading tone resolves to i.'),
p('minor-natural','Gentle minor return',true,'Cadences',[0,3,4,0],'Natural-minor v gives a gentler return than major V.'),
p('minor-plagal','Minor plagal return',true,'Cadences',[0,3,0],'iv returns straight to i with shared tonic material.'),
p('minor-relative','Visit the relative major',true,'Loops',[0,2,5,6],'III brings the relative-major triad into the minor landscape.'),
p('minor-majoriv','Bright IV in minor',true,'Borrowed colour',[0,c(3,{borrowed:true}),6,0],'Major IV adds the raised sixth degree as a contrasting colour.'),
p('minor-applied','Prepare minor’s dominant',true,'Connecting chords',[0,c(4,{applied:true,appliedTargetBorrowed:true,ext:'7'}),c(4,{borrowed:true}),0],'An applied dominant leads to major V, then home to i.'),
p('minor-sigh','Minor stepwise bass',true,'Descending bass',[0,c(4,{inversion:'1'}),5,c(4,{borrowed:true})],'The v chord’s third in the bass connects tonic to VI by descending steps.')
];
