/* 판 조합의 로컬 mm 좌표와 인접 판의 외곽 간격. 지주 설치 좌표와 CAD 연결은 바꾸지 않는다. */
import {e} from './views.js';
const number=v=>Math.round(Number(v)*1000)/1000;
const display=v=>Math.round(Number(v)*10)/10;
const size=(part,assets,axis)=>Number(part.size?.[axis==='X'?0:1]||part.estimate?.[axis==='X'?0:1]||assets.find(a=>a.key===part.piece)?.[axis==='X'?'B':'H']||part.cadRegion?.[axis==='X'?2:3]||0);
const overlap=(a,b,axis,assets)=>Math.min(Number(a[axis])+size(a,assets,axis),Number(b[axis])+size(b,assets,axis))-Math.max(Number(a[axis]),Number(b[axis]));
export function mainParts(parts,assets=[]){
 // CAD에서 새로 읽은 판에는 역할명이 없다. 가장 높은 판들을 기준 본판으로 둔다.
 const height=Math.max(...parts.filter(p=>!p.referencePart).map(p=>size(p,assets,'Z')));
 return new Set(parts.flatMap((p,i)=>typeof p.referencePart==='string'?(p.referencePart?[]:[i]):/본판/.test(p.name||'')||Math.abs(size(p,assets,'Z')-height)<1?[i]:[]));
}
export function numberParts(parts,measured=true){
 if(!parts.length)return;
 for(const p of parts)if(p.referencePart&&!parts.some(other=>other.id===p.referencePart))delete p.referencePart;
 const mains=[...mainParts(parts)],position=(p,axis)=>measured?Number(p[axis]):Number(p.cadRegion?.[axis==='X'?0:1]||0);
 mains.sort((a,b)=>position(parts[a],'X')-position(parts[b],'X')||position(parts[a],'Z')-position(parts[b],'Z'));
 for(const i of mains)parts[i].referencePart='';
 for(const [i,p] of parts.entries()){
  if(mains.includes(i))continue;
  if(mains.some(j=>parts[j].id===p.referencePart))continue;
  const center=position(p,'X')+size(p,[],'X')/2;
  const parent=mains.reduce((best,j)=>Math.abs(center-position(parts[j],'X')-size(parts[j],[],'X')/2)<Math.abs(center-position(parts[best],'X')-size(parts[best],[],'X')/2)?j:best,mains[0]);
  p.referencePart=parts[parent].id;
 }
 const ordered=mains.flatMap(i=>[parts[i],...parts.filter(p=>p.referencePart===parts[i].id).sort((a,b)=>position(a,'Z')-position(b,'Z')||position(a,'X')-position(b,'X'))]);
 parts.splice(0,parts.length,...ordered);
}
export function positionPart(parts,selected,assets=[]){
 const fixed=mainParts(parts,assets);
 // 본판·보조판 한 쌍이면 선택과 관계없이 보조판 위치 치수를 보여준다.
 return parts.length===2&&fixed.size===1?parts.findIndex((_,i)=>!fixed.has(i)):selected;
}
export function gaps(parts,assets){
 const rows=[];
 for(const axis of ['X','Z']){
  const cross=axis==='X'?'Z':'X';
  parts.forEach((a,from)=>parts.forEach((b,to)=>{
   const end=Number(a[axis])+size(a,assets,axis),start=Number(b[axis]);
   if(from===to||!size(a,assets,axis)||start<end-.001||overlap(a,b,cross,assets)<=.001)return;
   const blocked=parts.some((c,i)=>i!==from&&i!==to&&Number(c[axis])>=end-.001&&Number(c[axis])+size(c,assets,axis)<=start+.001&&overlap(a,c,cross,assets)>.001&&overlap(b,c,cross,assets)>.001);
   if(!blocked)rows.push({from,to,axis,value:number(Math.max(0,start-end))});
  }));
 }
 return rows;
}
export function setDimension(parts,assets,edit,value){
 if(value===''||!Number.isFinite(Number(value)))throw Error('치수를 숫자로 입력하세요.');
 const n=Number(value),part=parts[edit.kind==='reverse'?edit.from:edit.to??edit.part],axis=edit.axis;
 if(!part||!['X','Y','Z'].includes(axis))throw Error('수정할 판과 축을 확인하세요.');
 const result=edit.kind==='reverse'?Number(parts[edit.to][axis])-size(part,assets,axis)-n:edit.from===undefined?n:Number(parts[edit.from][axis])+(edit.kind==='offset'?0:size(parts[edit.from],assets,axis))+n;
 if((edit.from!==undefined&&edit.kind!=='offset'&&n<0)||Math.abs(result)>50000)throw Error('간격은 0 이상, 판 위치는 ±50,000 mm 안에서 입력하세요.');
 const delta=number(result)-Number(part[axis]);
 const children=part.id?parts.filter(p=>p.referencePart===part.id):[];
 if(children.some(p=>Math.abs(Number(p[axis])+delta)>50000))throw Error('판 위치는 ±50,000 mm 안에서 입력하세요.');
 part[axis]=number(result);
 for(const child of children)child[axis]=number(Number(child[axis])+delta);
}
export function horizontalOffsets(parts,assets){
 const spaces=gaps(parts,assets);
 return parts.flatMap((part,to)=>{
  const below=spaces.find(g=>g.axis==='Z'&&g.to===to);
  if(!to||(!below&&spaces.some(g=>g.axis==='X'&&g.to===to)))return [];
  const from=below?.from??0;
  return [{from,to,axis:'X',kind:'offset',value:number(Number(part.X)-Number(parts[from].X))}];
 });
}
export function dimensionLayout(parts,assets,selected=0,readonly=false,auxiliaryOnly=false){
 const fixed=auxiliaryOnly?mainParts(parts,assets):new Set();
 if(auxiliaryOnly)selected=positionPart(parts,selected,assets);
 let related=readonly?[]:[...gaps(parts,assets),...horizontalOffsets(parts,assets)].filter(row=>row.from===selected||row.to===selected);
 if(auxiliaryOnly&&!readonly){
  const first=[...fixed][0],part=parts[selected];
  if(fixed.has(selected))related=selected===first?[]:[
   {from:first,to:selected,axis:'X',value:number(part.X-parts[first].X-size(parts[first],assets,'X'))},
   {from:first,to:selected,axis:'Z',kind:'offset',value:number(part.Z-parts[first].Z)}];
  else{
   const reference=parts.findIndex(p=>p.id&&p.id===part.referencePart);
   const from=reference>=0?reference:[...fixed].sort((a,b)=>Math.abs(Number(part.X)-Number(parts[a].X))-Math.abs(Number(part.X)-Number(parts[b].X)))[0];
   const below=Number(part.Z)+size(part,assets,'Z')<=Number(parts[from].Z)+.001;
   related=[{from,to:selected,axis:'X',kind:'offset',value:number(Number(part.X)-Number(parts[from].X))},
    below?{from:selected,to:from,axis:'Z',kind:'reverse',value:number(Number(parts[from].Z)-Number(part.Z)-size(part,assets,'Z'))}:
     {from,to:selected,axis:'Z',value:number(Number(part.Z)-Number(parts[from].Z)-size(parts[from],assets,'Z'))}];
  }
 }
 const horizontal=related.filter(row=>row.axis==='X').sort((a,b)=>Math.abs(a.value)-Math.abs(b.value));
 const vertical=related.filter(row=>row.axis==='Z').sort((a,b)=>Math.abs(a.value)-Math.abs(b.value));
 return {horizontal,vertical,margin:{top:54,right:58,bottom:horizontal.length?34+horizontal.length*40:30,left:vertical.length?20+vertical.length*80:30}};
}
export function dimensionEdit(key){const [from,to,axis,kind]=key.split(',');return {from:Number(from),to:Number(to),axis,...(kind?{kind}:{})};}
export function replacePiece(parts,assets,index,key){
 const replacement=assets.find(a=>a.key===key&&a.kind==='piece');
 if(!parts[index]||!replacement)throw Error('판 규격을 선택하세요.');
 const links=gaps(parts,assets),before=parts.map(p=>({...p})),next=parts.map(p=>({...p}));
 next[index].piece=key;
 // 판이 커져도 인접 판의 기존 간격을 유지한다. CAD 연결·절단 영역은 그대로 둔다.
 for(const axis of ['X','Z']){
  const moved=new Set([index]);
  for(const link of links.filter(g=>g.axis===axis).sort((a,b)=>before[a.from][axis]-before[b.from][axis])){
   if(moved.has(link.from)&&!moved.has(link.to)){setDimension(next,assets,link,link.value);moved.add(link.to);}
  }
 }
 parts.splice(0,parts.length,...next);
}
export function dimensions(project,draft,assets,selected,view,w,h,offset={X:0,Y:0,Z:0},readonly=false,auxiliaryOnly=false,sizeValues=null){
 if(view!=='front'||!draft.parts.length)return '';
 const parts=draft.parts,part=parts[selected]||parts[0];
 const point=(p,x=0,z=0)=>project(['X','Y','Z'].map(k=>(Number(p[k])+({X:x,Z:z}[k]||0))/1000+Number(offset[k]||0)));
 const corners=parts.flatMap(p=>[point(p),point(p,size(p,assets,'X'),size(p,assets,'Z'))]);
 const left=Math.min(...corners.map(p=>p[0])),right=Math.max(...corners.map(p=>p[0])),top=Math.min(...corners.map(p=>p[1])),bottom=Math.max(...corners.map(p=>p[1]));
 const layout=dimensionLayout(parts,assets,parts.indexOf(part),readonly,auxiliaryOnly);
 const dim=(a,b,horizontal,lane,label,edit=null,sizeAxis=null)=>{
  const editable=edit&&!edit.readonly;
  const p=horizontal?[a[0],lane]:[lane,a[1]],q=horizontal?[b[0],lane]:[lane,b[1]];
  const x=horizontal?Math.max(35,Math.min(w-35,(p[0]+q[0])/2)):lane-(editable?38:-14),y=horizontal?lane-7:Math.max(18,Math.min(h-18,(p[1]+q[1])/2));
  const rotation=horizontal?'':` transform="rotate(-90 ${x} ${y})"`;
  const description=edit?.kind==='offset'?`${edit.from+1}번 판 ${edit.axis==='X'?'왼쪽':'아래쪽'} 기준 ${edit.to+1}번 판 ${edit.axis==='X'?'가로':'세로'} 위치 (mm)`:edit?`${edit.from+1}번 판과 ${edit.to+1}번 판 사이 ${edit.axis==='X'?'가로':'세로'} 간격 (mm)`:'';
  let value=editable?`<foreignObject x="${Math.max(0,Math.min(w-66,x-33))}" y="${y-14}" width="66" height="28"><input xmlns="http://www.w3.org/1999/xhtml" class="gpa-inline" type="text" inputmode="decimal" autocomplete="off" data-gpa-gap="${edit.from},${edit.to},${edit.axis}${edit.kind?','+edit.kind:''}" value="${e(label)}" aria-label="${e(description)}" title="${e(description)}" /></foreignObject>`:`<text x="${x}" y="${y}" text-anchor="middle"${rotation}>${e(label)}</text>`;
  if(sizeValues&&sizeAxis!==null){
   const fieldX=horizontal?x-33:lane+8,fieldY=horizontal?lane-27:y-14,name=sizeAxis===0?'폭':'높이',size=sizeValues[sizeAxis];
   value=`<text x="${horizontal?fieldX-5:fieldX+33}" y="${horizontal?fieldY+18:fieldY-6}" text-anchor="${horizontal?'end':'middle'}">${name}</text><foreignObject x="${fieldX}" y="${fieldY}" width="66" height="28"><input xmlns="http://www.w3.org/1999/xhtml" class="gpa-inline gsp-size-inline" type="text" inputmode="decimal" autocomplete="off" data-gsp-size="${sizeAxis}" value="${e(size===''||size==null?'':display(size))}" aria-label="${selected+1}번 판 ${name} (mm)" title="${selected+1}번 판 ${name} (mm)" placeholder="입력" /></foreignObject>`;
  }
  return `<g class="gpa-dimension${editable?' is-editable':''}">${description?`<title>${e(description)}</title>`:''}<path d="M${a.join(' ')}L${p.join(' ')}L${q.join(' ')}L${b.join(' ')}M${p[0]-4} ${p[1]+4}l8 -8M${q[0]-4} ${q[1]+4}l8 -8"/>${value}</g>`;
 };
 const origin=point(part),end=point(part,size(part,assets,'X'),size(part,assets,'Z'));
 // 치수는 전체 도안 바깥에 둔다. 연장선도 판을 가로질러 지나가지 않는다.
 const measured=dim([origin[0],top-6],[end[0],top-6],true,top-28,`폭 ${display(size(part,assets,'X'))}`,null,0)+dim([right+6,origin[1]],[right+6,end[1]],false,right+26,`높이 ${display(size(part,assets,'Z'))}`,null,1);
 const horizontal=layout.horizontal.map((row,index)=>{
  const a=point(parts[row.from],row.kind==='offset'?0:size(parts[row.from],assets,'X')),b=point(parts[row.to]);
  return dim([a[0],bottom+6],[b[0],bottom+6],true,bottom+34+index*40,String(display(row.value)),row);
 }).join('');
 const vertical=layout.vertical.map((row,index)=>{
  const a=point(parts[row.from],0,row.kind==='offset'?0:size(parts[row.from],assets,'Z')),b=point(parts[row.to]);
  return dim([left-6,a[1]],[left-6,b[1]],false,left-20-index*80,String(display(row.value)),row);
 }).join('');
 return `<g class="gpa-layout">${measured}${horizontal}${vertical}</g>`;
}
