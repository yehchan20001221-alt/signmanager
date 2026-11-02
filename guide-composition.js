/* 안내판의 모양·치수·평면 배치. 기존 행 배치는 읽을 때 변환하고 저장 전까지 원본을 보존한다. */
import {e} from './views.js';

export const shapes={rectangle:'사각형','arrow-left':'왼쪽 화살표','arrow-right':'오른쪽 화살표','arrow-both':'양방향 화살표'};
const size=(v,fallback)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):fallback;
const number=v=>Number.isFinite(Number(v))?Number(v):0;
export function positioned(form){
 const copy=JSON.parse(JSON.stringify(form));
 if(copy.version===2)return copy;
 const parts=copy.parts,rows=copy.rows||[parts.map((_,i)=>i)];
 const widths=parts.map(p=>size(p.B,1000)),heights=parts.map(p=>size(p.H,700));
 const rowWidths=rows.map(r=>r.reduce((n,i)=>n+widths[i],0)),rowHeights=rows.map(r=>Math.max(...r.map(i=>heights[i])));
 const width=Math.max(0,...rowWidths);let y=rowHeights.reduce((a,b)=>a+b,0);
 rows.forEach((row,r)=>{
  y-=rowHeights[r];let x=copy.kind?.includes('top')&&r===0?width-rowWidths[r]:(width-rowWidths[r])/2;
  row.forEach(i=>{Object.assign(parts[i],{id:'p'+(i+1),x:String(x),y:String(y)});x+=widths[i];});
 });
 return {...copy,version:2};
}
export function bounds(parts){
 const x=Math.min(...parts.map(p=>number(p.x))),y=Math.min(...parts.map(p=>number(p.y)));
 return {x,y,B:Math.max(...parts.map(p=>number(p.x)+size(p.B,1000)))-x,H:Math.max(...parts.map(p=>number(p.y)+size(p.H,700)))-y};
}
export function summary(form){
 const rectangles=form.parts.filter(p=>p.shape==='rectangle').length,arrows=form.parts.length-rectangles;
 return [rectangles?`사각형 ${rectangles}장`:'',arrows?`화살표형 ${arrows}장`:''].filter(Boolean).join(' + ')||'판 미등록';
}
export function modify(draft,action){
 const parts=draft.form.parts,current=parts[draft.part]||parts[0];
 if(action==='remove'){
  if(parts.length===1)throw new Error('마지막 판은 삭제할 수 없습니다.');
  parts.splice(draft.part,1);draft.part=Math.min(draft.part,parts.length-1);return;
 }
 if(parts.length>=8)throw new Error('판은 8장까지 추가할 수 있습니다.');
 let n=1;while(parts.some(p=>p.id==='p'+n))n++;
 parts.push({...current,id:'p'+n,name:'판 '+n,shape:action==='add-arrow'?'arrow-right':action==='add-rectangle'?'rectangle':current.shape,
  x:String(number(current.x)+size(current.B,1000)),y:current.y});
 draft.part=parts.length-1;
}
export function compositionDiagram(form,selected=0,thumbnail=false){
 const parts=positioned(form).parts;if(!parts.length)return '';
 const box=bounds(parts),left=thumbnail?box.x:Math.min(0,box.x),bottom=thumbnail?box.y:Math.min(0,box.y);
 const width=Math.max(box.x+box.B,thumbnail?-Infinity:0)-left,height=Math.max(box.y+box.H,thumbnail?-Infinity:0)-bottom;
 const scale=Math.min(560/Math.max(width,1),300/Math.max(height,1));
 const px=v=>(760-width*scale)/2+(v-left)*scale,py=v=>500-(500-height*scale)/2-(v-bottom)*scale;
 const rendered=parts.map((p,i)=>{
  const x=px(number(p.x)),y=py(number(p.y)+size(p.H,700)),w=size(p.B,1000)*scale,h=size(p.H,700)*scale,edge=Math.min(h*.4,w*.25);
  const arrowLeft=['arrow-left','arrow-both'].includes(p.shape),arrowRight=['arrow-right','arrow-both'].includes(p.shape);
  const outline=arrowLeft||arrowRight?`<path d="M${x+(arrowLeft?edge:0)} ${y}H${x+w-(arrowRight?edge:0)}${arrowRight?`L${x+w} ${y+h/2}L${x+w-edge} ${y+h}`:`V${y+h}`}H${x+(arrowLeft?edge:0)}${arrowLeft?`L${x} ${y+h/2}`:''}Z"/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
  return `<g class="gc-plate${i===selected&&!thumbnail?' is-selected':''}"${thumbnail?'':` data-gs-part="${i}" role="button" tabindex="0" aria-label="판 ${i+1} 선택" aria-pressed="${i===selected}"`}>${outline}${thumbnail||parts.length===1?'':`<text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle">${i+1}</text>`}</g>`;
 }).join('');
 const p=parts[selected]||parts[0];
 if(thumbnail)return `<svg viewBox="0 0 760 500">${rendered}</svg>`;
 const x=px(number(p.x)),y=py(number(p.y)+size(p.H,700)),w=size(p.B,1000)*scale,h=size(p.H,700)*scale,ox=px(0),oy=py(0);
 const labels={B:'폭',H:'높이',x:'가로 위치',y:'세로 위치'};
 const text=(axis,tx,ty,rotate=false)=>`<text ${rotate?`transform="translate(${tx} ${ty}) rotate(-90)"`:`x="${tx}" y="${ty}"`} text-anchor="middle" data-gs-axis="${axis}" role="button" tabindex="0" aria-label="${labels[axis]} ${e(p[axis]||'입력')} 수정">${e(['x','y'].includes(axis)?`${axis==='x'?'가로':'세로'} ${p[axis]}`:p[axis]||`${labels[axis]} 입력`)}</text>`;
 const dx=Math.max(oy,y+h)+48,dy=Math.min(ox,x)-48;
 const dimensions=`<g class="gc-dimensions"><path d="M${x} ${y-5}v-24M${x+w} ${y-5}v-24M${x} ${y-20}h${w}M${x-4} ${y-16}l8 -8M${x+w-4} ${y-16}l8 -8"/>${text('B',x+w/2,y-31)}<path d="M${x+w+5} ${y}h24M${x+w+5} ${y+h}h24M${x+w+20} ${y}v${h}M${x+w+16} ${y+4}l8 -8M${x+w+16} ${y+h+4}l8 -8"/>${text('H',x+w+39,y+h/2,true)}
 <path class="gc-position-line" d="M${ox} ${oy}V${dx+5}M${x} ${y+h}V${dx+5}M${ox} ${dx}H${x}M${ox} ${oy}H${dy-5}M${x} ${y+h}H${dy-5}M${dy} ${oy}V${y+h}"/>${text('x',(ox+x)/2,dx+20)}${text('y',dy-12,(oy+y+h)/2,true)}<path class="gc-origin" d="M${ox-5} ${oy}h10M${ox} ${oy-5}v10"/></g>`;
 return `<svg viewBox="0 0 760 500" aria-label="판 배치">${rendered}${dimensions}</svg>`;
}
