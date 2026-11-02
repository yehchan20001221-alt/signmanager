/* CAD 판 영역과 실제 mm 규격의 연결. 최초 축척만 배치를 계산하고 이후 편집 간격은 보존한다. */
import {gaps,setDimension,mainParts,numberParts} from './guide-panel-layout.js';
const rounded=v=>Math.round(v*1000)/1000;
export const sizeValid=size=>Array.isArray(size)&&size.length===2&&size.every(v=>v!==''&&Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=50000);
export const ready=draft=>!!draft?.parts?.length&&draft.parts.every(p=>sizeValid(p.size)&&(!p.shape||p.shape!=='unknown'));
export function fromRegions(regions){
 const parts=regions.boxes.map((box,i)=>({box,shape:regions.shapes?.[i]||'rectangle'})).sort((a,b)=>a.box[1]-b.box[1]||a.box[0]-b.box[0]).slice(0,8).map(({box,shape},i)=>({id:`p${i+1}`,name:`${i+1}번 판`,piece:'',shape,size:['',''],X:0,Y:0,Z:0,background:'',cadPanel:-1,cadRegion:box.slice()}));
 numberParts(parts,false);return {parts};
}
export function calibrate(draft,index){
 const reference=draft.parts[index],region=reference?.cadRegion;
 if(!region||!sizeValid(reference.size))return false;
 const scale=Number(reference.size[0])/region[2];
 const boxes=draft.parts.map(p=>p.cadRegion).filter(Boolean);
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.min(...boxes.map(b=>b[1]));
 draft.parts.forEach(p=>{const b=p.cadRegion;if(!b)return;p.X=rounded((b[0]-(left+right)/2)*scale);p.Z=rounded((b[1]-bottom)*scale);p.estimate=[rounded(b[2]*scale),rounded(b[3]*scale)];});
 draft.calibrated=true;return true;
}
export function resizePart(draft,index,size){
 const before=draft.parts.map(p=>({...p})),links=gaps(before,[]),fixed=mainParts(before);
 draft.parts[index].size=size.map(v=>v===''?'':Number(v));
 if(!draft.calibrated){calibrate(draft,index);return;}
 if(!sizeValid(size))return;
 for(const axis of ['X','Z']){
  const moved=new Set([index]);
  for(const link of links.filter(g=>g.axis===axis).sort((a,b)=>before[a.from][axis]-before[b.from][axis])){
   if(moved.has(link.from)&&!moved.has(link.to)&&!fixed.has(link.to)){setDimension(draft.parts,[],link,link.value);moved.add(link.to);}
  }
 }
}
export function placeRegion(draft,index,region){
 const part=draft.parts[index],reference=draft.parts.find((p,i)=>i!==index&&p.cadRegion&&sizeValid(p.size));
 if(draft.calibrated&&reference){
  const scale=Number(reference.estimate?.[0]||reference.size[0])/reference.cadRegion[2];
  part.X=rounded(reference.X+(region[0]-reference.cadRegion[0])*scale);
  part.Z=rounded(reference.Z+(region[1]-reference.cadRegion[1])*scale);
  part.estimate=region.slice(2).map(v=>rounded(v*scale));
 }
}
export function ratioWarning(part){
 const r=part.cadRegion;if(!r||!sizeValid(part.size))return '';
 return Math.abs((part.size[0]/part.size[1])/(r[2]/r[3])-1)>.015?'도안과 판의 가로·세로 비율이 다릅니다. 판 크기 또는 연결한 도안 영역을 확인하세요.':'';
}
