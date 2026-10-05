// node test_tracker.js — simulates a phone panning past a shelf of identical bottles at low fps with noisy, flickering detections.
const {newTracker,trackStep}=require('./tracker.js');const assert=require('assert');
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function run(useShift){const S=newTracker(),W=640,bottles=[];
  for(let r=0;r<3;r++)for(let c=0;c<20;c++)bottles.push({x:c*70+10,y:r*110+20,w:50,h:90}); // 60 bottles over a 1400px shelf
  let cam=0;const ids={};
  for(let t=0;t<40;t++){const step=20+rnd()*40;cam+=step;               // ~3-7% frame width per tick, uneven hand speed
    const dets=bottles.map((b,gt)=>({gt,cls:'bottle',x:b.x-cam+(rnd()-.5)*8,y:b.y+(rnd()-.5)*8,w:b.w,h:b.h,score:rnd()<.2?.3:.8}))
      .filter(d=>d.x>-d.w/2&&d.x+d.w/2<W&&rnd()>.1);                    // 10% missed, 20% low-confidence
    trackStep(S,dets,useShift?step+(rnd()-.5)*6:0,0);for(const d of dets)if(d.id)(ids[d.id]??=new Set()).add(d.gt)}                    // measured shift has a few px of error
  const seen=new Set(bottles.filter(b=>b.x<cam+W).map((_,i)=>i)).size;  // bottles that entered the view
  const switches=[...S.confirmed].filter(i=>ids[i].size>1).length;  // one ID covering 2+ bottles = wrong count
  return {count:S.confirmed.size,seen,switches}}
const a=run(true),b=run(false);
console.log('with camera-motion compensation:',a,' without:',b);
assert(Math.abs(a.count-a.seen)<=a.seen*.1,'compensated count should be within 10% of truth');
assert(a.switches===0,'no ID should jump between bottles');
console.log('ok');
