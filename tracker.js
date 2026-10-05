// Multi-object tracker: ByteTrack association + camera-motion compensation (the BoT-SORT idea, without ReID).
// Why this one: the phone pans along a shelf, so nearly all motion is the camera. Shifting every track by the measured
// frame shift leaves boxes almost still, and plain IoU matching holds even at 1-5 detections/sec.
// ReID (DeepSORT/StrongSORT) is skipped on purpose: identical products look identical, so appearance can't separate them.
// ByteTrack's second pass re-attaches low-confidence detections (blurry or half-visible bottles) to existing tracks.
const TRK={high:.45,low:.2,matchHigh:.2,matchLow:.35,keep:15,confirm:2}; // keep = ticks a lost track survives; confirm = hits before it counts
function newTracker(){return {tracks:[],nextId:1,confirmed:new Set(),tick:0}}
function trkIoU(a,b){const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(w<=0||h<=0)return 0;const i=w*h;return i/(a.w*a.h+b.w*b.h-i)}
function greedyMatch(tr,ds,thr){ // ponytail: greedy by IoU, not Hungarian. Same result unless boxes overlap heavily; swap if IDs flicker in dense shelves.
  const p=[];tr.forEach((t,i)=>ds.forEach((d,j)=>{if(t.cls===d.cls){const o=trkIoU(t,d);if(o>thr)p.push([o,i,j])}}));
  p.sort((a,b)=>b[0]-a[0]);const ut=new Set(),ud=new Set(),m=[];
  for(const [,i,j] of p)if(!ut.has(i)&&!ud.has(j)){ut.add(i);ud.add(j);m.push([i,j])}return m}
// dets: [{cls,score,x,y,w,h}] in current-frame pixels. sx,sy: how far the camera moved since last tick, in pixels.
// Sets d.id on matched detections. Returns the tracker state.
// Matched boxes move 60% toward the new detection (smoothing, so boxes don't jitter).
function trackStep(S,dets,sx=0,sy=0){S.tick++;
  for(const t of S.tracks){t.x-=sx;t.y-=sy}
  const hi=dets.filter(d=>d.score>=TRK.high),lo=dets.filter(d=>d.score<TRK.high&&d.score>=TRK.low);
  const hit=(t,d)=>{const k=.6;Object.assign(t,{x:t.x+(d.x-t.x)*k,y:t.y+(d.y-t.y)*k,w:t.w+(d.w-t.w)*k,h:t.h+(d.h-t.h)*k,score:d.score,last:S.tick});d.id=t.id;if(++t.hits>=TRK.confirm)S.confirmed.add(t.id)};
  const m1=greedyMatch(S.tracks,hi,TRK.matchHigh);m1.forEach(([i,j])=>hit(S.tracks[i],hi[j]));
  const usedT=new Set(m1.map(p=>p[0])),usedD=new Set(m1.map(p=>p[1]));
  const rest=S.tracks.filter((_,i)=>!usedT.has(i));
  greedyMatch(rest,lo,TRK.matchLow).forEach(([i,j])=>hit(rest[i],lo[j]));
  hi.forEach((d,j)=>{if(!usedD.has(j)){const t={cls:d.cls,score:d.score,x:d.x,y:d.y,w:d.w,h:d.h,id:S.nextId++,hits:1,last:S.tick};S.tracks.push(t);d.id=t.id}});
  S.tracks=S.tracks.filter(t=>S.tick-t.last<=TRK.keep);return S}
if(typeof module!=='undefined')module.exports={newTracker,trackStep,TRK};
