/* 판별 CAD 영역을 실제 크기로 보여주는 정면 편집 뷰. 도안을 늘이지 않고 좌하단에서 자른다. */
import {dimensions,dimensionLayout} from './guide-panel-layout.js';
import {sizeValid,ratioWarning} from './guide-cad-layout.js';
import {e} from './views.js';
export function plan(draft,frame,sheet,selected,w=640,h=440,highlight=''){
 if(!draft.parts.length)return `<div class="gsp-plan-empty"><span>${sheet?'판을 찾지 못했습니다. 도안에서 영역을 지정해 주세요.':'CAD 블록을 업로드하면 도안이 표시됩니다.'}</span><button type="button" data-gsp-tools>판 추가</button></div>`;
 const measured=!!draft.calibrated,parts=draft.parts.map(p=>{
  const b=p.cadRegion||[0,0,...(p.size||[100,100])];
  return {...p,X:measured?Number(p.X):b[0],Z:measured?Number(p.Z):b[1],size:measured?(sizeValid(p.size)?p.size:p.estimate||b.slice(2)):b.slice(2)};
 });
 const left=Math.min(...parts.map(p=>p.X)),bottom=Math.min(...parts.map(p=>p.Z)),right=Math.max(...parts.map(p=>p.X+Number(p.size[0]))),top=Math.max(...parts.map(p=>p.Z+Number(p.size[1])));
 const margin=measured?dimensionLayout(parts,[],selected,false,true).margin:{left:30,top:54,bottom:30};
 margin.top=60; margin.right=108;
 w=Math.max(w,margin.left+margin.right+180);h=Math.max(h,margin.top+margin.bottom+150);
 const width=w-margin.left-margin.right,height=h-margin.top-margin.bottom;
 const scale=Math.min(width/Math.max(1,right-left),height/Math.max(1,top-bottom));
 const ox=margin.left+(width-(right-left)*scale)/2-left*scale,oy=margin.top+(height+(top-bottom)*scale)/2+bottom*scale;
 const project=v=>[ox+v[0]*1000*scale,oy-v[2]*1000*scale];
 const href=sheet?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sheet):'';
 let origin='';
 const body=parts.map((p,i)=>{
  const [b,ph]=p.size.map(Number),x=ox+p.X*scale,y=oy-(p.Z+ph)*scale,pw=b*scale,height=ph*scale,tip=Math.min(height/2,pw/4),r=p.cadRegion;
  const leftArrow=['arrow-left','arrow-both'].includes(p.shape),rightArrow=['arrow-right','arrow-both'].includes(p.shape);
  const path=p.shape==='circle'?`M${x},${y+height/2}a${pw/2},${height/2} 0 1,0 ${pw},0a${pw/2},${height/2} 0 1,0 ${-pw},0Z`:`M${x+(leftArrow?tip:0)},${y}H${x+pw-(rightArrow?tip:0)}${rightArrow?`L${x+pw},${y+height/2}L${x+pw-tip},${y+height}`:`V${y+height}`}H${x+(leftArrow?tip:0)}${leftArrow?`L${x},${y+height/2}`:''}Z`;
  const cs=r?pw/r[2]:1;
  const image=href&&r&&frame?[href,...(highlight?['data:image/svg+xml;charset=utf-8,'+encodeURIComponent(highlight)]:[])].map((src,index)=>`<image ${index?'data-cad-highlight ':''}href="${src}" pointer-events="none" x="${x-(r[0]-frame[0])*cs}" y="${y+height-(frame[1]+frame[3]-r[1])*cs}" width="${frame[2]*cs}" height="${frame[3]*cs}" preserveAspectRatio="none" clip-path="url(#gsp-clip-${i})"/>`).join(''):'';
  const warning=ratioWarning(draft.parts[i]);
  if(i===selected)origin=`<g class="gsp-plan-origin" data-gsp-origin="${i}" transform="translate(${x} ${y+height})" role="img" aria-label="${i+1}번 판 좌하단 기준점"><path class="gsp-origin-halo" d="M-3.5 -3.5L3.5 3.5M-3.5 3.5L3.5 -3.5"/><path d="M-3.5 -3.5L3.5 3.5M-3.5 3.5L3.5 -3.5"/></g>`;
  return `<g data-gsp-plan-part="${i}" role="button" tabindex="0" aria-label="${i+1}번 판 선택${warning?', '+e(warning):''}" class="gsp-plan-part${i===selected?' is-selected':''}"><title>${i+1}번 판${warning?' · '+e(warning):' · 선택 후 빨간 치수 수정'}</title><defs><clipPath id="gsp-clip-${i}"><path d="${path}"/></clipPath></defs><path class="gsp-plan-fill" d="${path}"/>${image}<path class="gsp-plan-outline" d="${path}"/><rect class="gsp-plan-tag" x="${x+5}" y="${y+5}" width="25" height="22" rx="3"/><text class="gsp-plan-number" x="${x+17}" y="${y+21}" text-anchor="middle">${i+1}</text>${warning?`<g class="gsp-plan-warning" role="img" aria-label="${e(warning)}"><title>${e(warning)}</title><circle cx="${x+44}" cy="${y+16}" r="10"/><text x="${x+44}" y="${y+20}" text-anchor="middle">!</text></g>`:''}</g>`;
 }).join('');
 return `<svg class="gsp-plan-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="CAD 도안과 판 간격 편집">${body}${dimensions(project,{parts},[],selected,'front',w,h,{},!measured,true,draft.parts[selected].size||['',''])}${origin}</svg><div class="gsp-plan-caption"><span>${measured?'빨간 치수를 눌러 수정 · mm':'폭과 높이를 입력하세요 · mm'}</span><button type="button" data-gsp-tools>판·도안 수정</button></div>`;
}
