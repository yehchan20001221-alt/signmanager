/* 검토한 판 외곽·배치로 조회용 규격을 묶는다. 저장 행과 지주·차로 연결은 합치지 않는다. */
import {e} from './views.js';
import {positioned} from './guide-composition.js';
// 도로·OBJ 파일명이 달라도 치수와 상대 배치가 같으면 묶고, 저장 대상은 원본별로 유지한다.
export function displaySpecifications(rows){
 const groups=new Map();
 for(const row of rows){
  // 문서 모델을 교체한 뒤 남은 보관용 규격은 사용 중인 조합처럼 표시하지 않는다.
  if(row.saved&&row.form.document&&!row.ruleIds?.length)continue;
  const parts=positioned(row.form).parts;
  const known=parts.length&&row.form.kind!=='unconfirmed'&&parts.every(p=>positive(p.B)&&positive(p.H)&&['x','y'].every(k=>Number.isFinite(Number(p[k]))));
  const x=Math.min(...parts.map(p=>Number(p.x))),y=Math.min(...parts.map(p=>Number(p.y)));
  const key=known?JSON.stringify(parts.map(p=>[p.shape,Number(p.B),Number(p.H),Number(p.x)-x,Number(p.y)-y]).sort()):row.key;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 return [...groups.values()].map(sources=>sources.length===1?sources[0]:({...sources[0],sources,
  ruleIds:sources.flatMap(r=>r.ruleIds||[]),members:sources.flatMap(r=>r.members||[]),
  placements:sources.flatMap(r=>(r.placements||[]).map(p=>({...p,id:r.key+'/'+p.id,sourceId:p.id,sourceSpec:r.key,road:r.road})))
 }));
}
export const kinds=[
 {key:'rectangle-single',label:'사각형 · 한 장'},
 {key:'arrow-single',label:'화살표형 · 한 장'},
 {key:'rectangle-top',label:'사각형 · 상단판 조합'},
 {key:'rectangle-bottom',label:'사각형 · 하단판 조합'},
 {key:'rectangle-stack',label:'사각형 · 상하 조합'},
 {key:'rectangle-side',label:'사각형 · 좌우 조합'},
 {key:'rectangle-complex',label:'사각형 · 상하·좌우 조합'},
 {key:'arrow-side',label:'화살표형 · 좌우 조합'},
 {key:'arrow-stack',label:'화살표형 · 상하 조합'},
 {key:'mixed',label:'사각·화살표 조합'},
 {key:'unconfirmed',label:'구성 확인 필요'}
];
const positive=v=>/^\d+(?:\.\d+)?$/.test(v)&&Number(v)>0;
function formFor(sign,B,H,forms){
 let reference=forms[sign['안내표지ID']];
 const unknown=note=>({kind:'unconfirmed',parts:[],rows:[],note});
 if(!reference||reference.image!==sign['도안'])return unknown('이 도안의 판 모양과 구성이 아직 연결되지 않았습니다.');
 const variant=reference.variants?.find(v=>v.size[0]===B&&v.size[1]===H);
 if(variant)reference={...reference,...variant,sizes:[variant.size]};
 if(reference.kind==='unconfirmed')return unknown(reference.note);
 const matched=reference.sizes?.some(size=>size[0]===B&&size[1]===H);
 if([B,H].some(v=>v!==''&&!positive(v))&&!matched)return unknown(reference.unresolvedNote||'이 치수 조건에 해당하는 판 배치가 등록되지 않았습니다.');
 if(!reference.parts.some(p=>p.live)&&!matched)return unknown('등록 치수가 바뀌어 각 판의 치수와 구성을 다시 확인해야 합니다.');
 return {...reference,parts:reference.parts.map(p=>({...p,B:p.live?B:p.B,H:p.live?H:p.H}))};
}
export function specifications(signs,forms={}){
 const specs=new Map();
 for(const sign of signs)for(const rule of sign.rules){
  if(rule['조건']==='기본값')continue;
  let B=String(rule.B??'').trim(),H=String(rule.H??'').trim();const road=sign['도로구분'];
  const form=formFor(sign,B,H,forms);
  if(form.dimensions)[B,H]=form.dimensions;
  // 개별 치수가 없는 판은 서로 같은 규격이라고 단정할 수 없다.
  const incomplete=form.kind==='unconfirmed'||form.parts.some(p=>!positive(p.B)||!positive(p.H));
  const key=JSON.stringify([road,form.kind,B,H,form.rows,form.parts.map(p=>[p.shape,p.B,p.H]),incomplete?sign['안내표지ID']:'']);
  if(!specs.has(key))specs.set(key,{key,road,B,H,kind:form.kind,form,members:[]});
  specs.get(key).members.push({sign,rule});
 }
 return [...specs.values()].sort((a,b)=>(!a.B||!a.H)-(!b.B||!b.H)||a.B.localeCompare(b.B,'ko',{numeric:true})||a.H.localeCompare(b.H,'ko',{numeric:true}));
}
export function diagram(form,showDimensions=false){
 if(!form.parts.length)return '<svg viewBox="0 0 140 100" aria-hidden="true"><rect x="20" y="25" width="100" height="55" rx="2" stroke-dasharray="4 4"/><text x="70" y="61" text-anchor="middle">?</text></svg>';
 const {parts,rows}=form,viewW=showDimensions?260:140,viewH=showDimensions?210:100;
 const areaW=showDimensions?200:124,areaH=showDimensions?150:78,gap=showDimensions?26:6;
 // 치수 미등록 판은 개요 비율만 사용하고 치수선에 임의 수치를 표시하지 않는다.
 const baseW=Math.max(...parts.map(p=>Number(p.B)||0))||1000,baseH=Math.max(...parts.map(p=>Number(p.H)||0))||700;
 const widths=parts.map(p=>positive(p.B)?Number(p.B):baseW*.6),heights=parts.map(p=>positive(p.H)?Number(p.H):baseH*.35);
 const rowW=rows.map(row=>row.reduce((n,i)=>n+widths[i],0)),rowH=rows.map(row=>Math.max(...row.map(i=>heights[i])));
 const scale=Math.min(...rows.map((row,i)=>(areaW-gap*(row.length-1))/rowW[i]),(areaH-gap*(rows.length-1))/rowH.reduce((a,b)=>a+b,0));
 let cursorY=(viewH-rowH.reduce((a,b)=>a+b,0)*scale-gap*(rows.length-1))/2;
 return `<svg viewBox="0 0 ${viewW} ${viewH}" aria-hidden="true">${rows.map((indices,row)=>{
  const width=rowW[row]*scale+gap*(indices.length-1),top=cursorY;cursorY+=rowH[row]*scale+gap;
  let cursorX=form.kind.includes('top')&&row===0?(viewW+areaW)/2-width:(viewW-width)/2;
  return indices.map(index=>{
   const p=parts[index],w=widths[index]*scale,h=heights[index]*scale,x=cursorX,y=top+(rowH[row]-heights[index])*scale;cursorX+=w+gap;
   const edge=Math.min(15,w*.25),title=`<title>${e(p.name)}</title>`;
   const left=p.shape==='arrow-left'||p.shape==='arrow-both',right=p.shape==='arrow-right'||p.shape==='arrow-both';
   const shape=left||right?`<path d="M${x+(left?edge:0)} ${y}H${x+w-(right?edge:0)}${right?`L${x+w} ${y+h/2}L${x+w-edge} ${y+h}`:`V${y+h}`}H${x+(left?edge:0)}${left?`L${x} ${y+h/2}`:''}Z">${title}</path>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2">${title}</rect>`;
   if(!showDimensions)return shape;
   return shape+`<g class="gs-dimensions">${positive(p.B)?`<path d="M${x} ${y-3}V${y-12}M${x+w} ${y-3}V${y-12}M${x} ${y-9}H${x+w}M${x-1.5} ${y-7.5}l3 -3M${x+w-1.5} ${y-7.5}l3 -3"/><text x="${x+w/2}" y="${y-12}" text-anchor="middle">${e(p.B)}</text>`:''}${positive(p.H)?`<path d="M${x+w+3} ${y}H${x+w+12}M${x+w+3} ${y+h}H${x+w+12}M${x+w+9} ${y}V${y+h}M${x+w+7.5} ${y+1.5}l3 -3M${x+w+7.5} ${y+h+1.5}l3 -3"/><text transform="translate(${x+w+15} ${y+h/2}) rotate(-90)" text-anchor="middle">${e(p.H)}</text>`:''}</g>${parts.length>1?`<text class="gs-part-name" x="${x+w/2}" y="${y+h/2+2}" text-anchor="middle">${e(p.name)}</text>`:''}`;
  }).join('');
 }).join('')}</svg>`;
}
export function groupApplications(members,keys){
 const groups=new Map();
 for(const member of members){
  const key=JSON.stringify(keys.map(k=>member.rule[k]));
  if(!groups.has(key))groups.set(key,{rule:member.rule,members:[]});
  groups.get(key).members.push(member);
 }
 return [...groups.values()];
}
export function placementRules(rules){
 return rules.filter(r=>r['조건']!=='기본값'||!rules.some(other=>other['조건']!=='기본값'
  &&['B','H'].every(k=>r[k]===''||r[k]===other[k])
  &&['지주형식','X','Y','Z'].every(k=>r[k]===other[k])));
}
