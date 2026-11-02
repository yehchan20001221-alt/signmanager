/* 기존 조합의 개별 판을 규격별로 조회한다. 원본 모델·배치·설치 조건은 병합하거나 저장하지 않는다. */
import {e} from './views.js';
import {shapes} from './guide-composition.js';
import {diagram} from './guide-panel-specs.js';

const positive=v=>v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>0;
const dimensions=p=>p.known?`${p.B} × ${p.H}`:'치수·모양 확인 필요';
const signCount=p=>new Set(p.uses.map(u=>u.sign['안내표지ID'])).size;
const searchText=v=>String(v).toLowerCase().replace(/[\s,×x*]/g,'');
const partForm=p=>({kind:'single',parts:p.known?[{shape:p.shape,B:p.B,H:p.H,name:'개별 판'}]:[],rows:p.known?[[0]]:[]});

export function catalog(specs,query=''){
 const groups=new Map();
 for(const displayed of specs)for(const spec of displayed.sources||[displayed]){
  const parts=spec.form.parts.length?spec.form.parts:[{}];
  parts.forEach((part,index)=>{
   const known=spec.form.kind!=='unconfirmed'&&!!shapes[part.shape]&&positive(part.B)&&positive(part.H);
   const B=known?String(Number(part.B)):'',H=known?String(Number(part.H)):'';
   const key=JSON.stringify(known?[part.shape,B,H]:['unknown',spec.key,index]);
   if(!groups.has(key))groups.set(key,{key,known,shape:part.shape,B,H,uses:[]});
   const group=groups.get(key);
   for(const {sign,rule} of spec.members||[]){
    const ruleId=rule['기준ID']||sign['안내표지ID']+'/'+((sign.rules||[]).indexOf(rule)+1);
    const useKey=JSON.stringify([key,spec.key,sign['안내표지ID'],ruleId]);
    let use=group.uses.find(u=>u.key===useKey);
    if(!use){
     use={key:useKey,spec:spec.key,road:spec.road,sign,rule,partIndices:[],names:[],position:spec.placements?.find(p=>p.rules.includes(ruleId))?.id||''};
     group.uses.push(use);
    }
    if(spec.form.parts.length&&!use.partIndices.includes(index)){use.partIndices.push(index);use.names.push(part.name||`${index+1}번 판`);}
   }
  });
 }
 const q=searchText(query);
 return [...groups.values()].filter(p=>searchText(`${dimensions(p)} ${shapes[p.shape]||''} ${p.uses.map(u=>`${u.sign['표지번호']} ${u.sign['명칭']} ${u.road}`).join(' ')}`).includes(q))
  .sort((a,b)=>Number(b.known)-Number(a.known)||Number(a.B)-Number(b.B)||Number(a.H)-Number(b.H)||String(a.shape).localeCompare(String(b.shape),'ko'));
}

function usages(piece){
 const signs=new Map();
 for(const use of piece.uses){
  const id=use.sign['안내표지ID'];if(!signs.has(id))signs.set(id,[]);signs.get(id).push(use);
 }
 return [...signs.values()].map(uses=>{
  const {sign}=uses[0],src=sign.registered?`/api/guides/${encodeURIComponent(sign['안내표지ID'])}/image`:sign['도안']?`/static/images/guide-registration/${encodeURIComponent(sign['도안'])}`:'';
  return `<section class="gpc-sign"><header>${src?`<img src="${e(src)}" alt="${e(sign['표지번호'])} 도안" loading="lazy">`:''}<div><strong>${e(sign['표지번호'])} <span>${e(sign['명칭'])}</span></strong><small>${e(sign['도로구분'])}</small></div></header>${uses.map(u=>`<div class="gpc-use"><div><span>${e(u.rule['조건']||'조건 미등록')}</span><small>${e(u.names.join(' · ')||'판 구성 미확인')} ${u.partIndices.length?`· ${u.partIndices.length}장`:''}</small></div><button type="button" class="sl-button" data-gs-key="piece-use" data-gs-value="${e(u.key)}" ${u.position?'':'disabled'}>${u.position?'조합·설치 보기':'설치 연결 없음'}</button></div>`).join('')}</section>`;
 }).join('')||'<p class="gs-empty">연결된 표지가 없습니다.</p>';
}

export function content(rows,state){
 const selected=rows.find(p=>p.key===state.piece)||rows[0];
 return `<div class="gpc-workspace"><section class="gs-specifications" aria-label="개별 판 규격"><header class="gpc-heading"><strong>개별 판</strong><small>${rows.length}개 규격 · mm</small></header><div class="gs-spec-scroll"><div class="gpc-grid">${rows.map(p=>`<button type="button" class="gs-spec-row" data-gs-key="piece" data-gs-value="${e(p.key)}" aria-pressed="${selected?.key===p.key}" aria-label="${e((shapes[p.shape]||'미확인')+' '+dimensions(p))} 개별 판"><span class="gs-kind-icon">${diagram(partForm(p))}</span><span>${e(dimensions(p))}</span><small>${e(shapes[p.shape]||'미확인')} · 표지 ${signCount(p)}개</small></button>`).join('')}</div>${rows.length?'':'<p class="gs-empty">검색 결과가 없습니다.</p>'}</div></section>${selected?`<section class="gpc-preview" aria-label="개별 판 정면"><header class="gpc-heading"><strong>${e(dimensions(selected))} <small>${selected.known?'mm':''}</small></strong><small>${e(shapes[selected.shape]||'미확인')}</small></header><div class="gs-diagram">${diagram(partForm(selected),true)}</div><p>정면 · 판 외곽</p></section><section class="gpc-usages" aria-label="개별 판 사용처"><header class="gpc-heading"><strong>사용 표지</strong><small>${signCount(selected)}개 · ${selected.uses.length}개 조건</small></header><div class="gpc-use-scroll">${usages(selected)}</div></section>`:''}</div>`;
}
