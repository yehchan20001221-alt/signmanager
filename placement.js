/* 형식별 거리·간격 편집과 서버가 계산한 판별 X·Z 조회. OBJ 변환은 포함하지 않는다. */
import {e} from './views.js';
import {illustration,coordinatePicture} from './placement-diagram.js';

const blank=()=>({direction:'',x:null,z:null,main_gap:null,aux_gap:null,distances:[],site:{fill:{x:null,z:null},cut:{x:null,z:null}}});
const shown=v=>v===null||v===undefined||v===''?'미설정':e(v);
const number=(name,label,value)=>`<label class="sl-field"><span>${label}</span><input class="sl-input" name="placement_${name}" type="number" ${name.endsWith('_gap')?'min="0"':''} step="any" value="${e(value??'')}" placeholder="미설정"></label>`;
const names=['삼각형','원형','역삼각형','팔각형','정사각형','오각형','사각형','보조_사각형 A'];
const short=name=>name.replace('보조_사각형 ','보조사각 ');
const options=(values,selected)=>values.map(([v,label])=>`<option value="${e(v)}" ${v===selected?'selected':''}>${e(label)}</option>`).join('');
const select=(name,values,selected,label)=>`<label class="sl-field"><span>${label}</span><select class="sl-input" name="${name}">${options(values,selected)}</select></label>`;
export function modeChoices(attribute){
 return `<div class="sl-installation-navigation"><div class="sl-view-tabs sl-installation-types" role="group" aria-label="설치 대상"><button type="button" ${attribute}="panels" aria-pressed="true">표지판 설치</button></div></div>`;
}
function cells(rule,definitions,catalog){
 const result=[];
 const candidates=catalog?catalog.map(r=>({name:r.panels[0].name,size:r.size})):definitions?definitions.filter(o=>o.combinationReady!==false&&(!o.auxiliary||o.name==='보조_사각형 A')).flatMap(o=>(o.auxiliary?['소형','중형','대형']:o.specs.map(p=>p.name)).map(size=>({name:o.name,size}))):names.flatMap(name=>['소형','중형','대형'].filter(size=>size!=='대형'||!['정사각형','오각형','사각형'].includes(name)).map(size=>({name,size})));
 for(const {size,name} of candidates){
  const saved=rule.distances.find(r=>r.size===size&&r.name===name);
  result.push({size,name,x:saved?.x??rule.x??(rule.direction==='세로'?0:null),z:saved?.z??rule.z});
 }
 for(const r of rule.distances)if(!result.some(p=>p.size===r.size&&p.name===r.name))result.push(r);
 return result;
}
function distanceTable(rule,editing,definitions,catalog){
 const rows=cells(rule,definitions,catalog),horizontal=rule.direction!=='세로';
 const sizes=['소형','중형','대형'].filter(size=>rows.some(r=>r.size===size));
 const axes=horizontal?['x','z']:['z'];
 return `<div class="sl-table-scroll"><table class="sl-distance-matrix"><thead><tr><th scope="col" rowspan="2">구분</th>${sizes.map(size=>`<th scope="colgroup" data-placement-size="${size}" colspan="${axes.length}">${size}</th>`).join('')}</tr><tr>${sizes.flatMap(size=>axes.map(axis=>`<th scope="col" data-placement-size="${size}">${axis==='z'?'Z (−)':'X'}</th>`)).join('')}</tr></thead><tbody>${[...new Set(rows.map(r=>r.name))].map(name=>`<tr data-distance-sizes="${rows.filter(r=>r.name===name).map(r=>r.size).join(' ')}"><th scope="row">${e(short(name))}</th>${sizes.map(size=>{
  const r=rows.find(p=>p.size===size&&p.name===name);
  if(!r)return `<td data-placement-size="${size}" colspan="${axes.length}">—</td>`;
  return axes.map(axis=>{
   const value=r[axis]==null?null:axis==='z'?-r[axis]:r[axis];
   return `<td data-placement-size="${size}" class="sl-distance-cell" data-size="${size}" data-name="${e(name)}" data-axis="${axis}">${editing?`<input class="sl-input" type="number" step="any" data-distance="${axis}" aria-label="${e(size+' '+short(name)+' '+axis.toUpperCase())}" value="${e(value??'')}" placeholder="미설정">${!horizontal?`<input type="hidden" data-distance="x" value="${e(r.x??'')}">`:''}`:shown(value)}</td>`;
  }).join('');
 }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function siteTable(rule,editing){
 return `<div class="sl-site-tables" data-placement-mode="site" hidden>${['fill','cut'].map((k,i)=>`<section><h3>${i?'절토부':'성토부'}</h3><figure class="sl-site-example"><img src="/static/images/installation-${k}.png" alt="알고리즘 문서 ${i?'절토부':'성토부'} 지주 설치위치"></figure><table class="sl-site-table"><thead><tr><th>X축 이격거리 (mm)</th><th>Z축 이격거리 (mm)</th></tr></thead><tbody><tr>${['x','z'].map(axis=>`<td>${editing?number(`${k}_${axis}`,`${i?'절토부':'성토부'} ${axis.toUpperCase()}축 이격거리`,rule.site[k][axis]):shown(rule.site[k][axis])}</td>`).join('')}</tr></tbody></table></section>`).join('')}</div>`;
}
function installation(rule,editing,definitions,catalog){
 const horizontal=rule.direction==='가로';
 const drawing=illustration(rule.direction||'세로');
 return `<section data-placement-mode="panels"><h3>표지판 설치 · mm</h3><div class="sl-placement-layout"><figure>${drawing}<figcaption>설치 기준점: 표지판 중앙 하단</figcaption></figure><div>${distanceTable(rule,editing,definitions,catalog)}<p class="sl-sub">${horizontal?'X·Z는 각 모양의 설치 기준점까지의 거리입니다.':'첫 번째 표지판의 Z입니다. 나머지는 높이와 이격거리로 계산합니다.'}</p></div></div><div class="sl-placement-gaps">${['main_gap','aux_gap'].map((key,i)=>editing?number(key,`${i?'본표지 ↔ 보조표지':'본표지 ↔ 본표지'} 이격거리 (mm)`,rule[key]):`<div><span>${i?'본표지 ↔ 보조표지':'본표지 ↔ 본표지'} 이격거리</span><strong>${shown(rule[key])} mm</strong></div>`).join('')}</div></section>${siteTable(rule,editing)}`;
}
export function editor(s,override){
 const isNew=s.screen==='new',kind=isNew&&!override?'단주식':s.detail?.support?.형식||'단주식';
 const rule=override||(!isNew&&s.detail?.placement?.rule)||{...blank(),direction:kind==='단주식'?'세로':kind==='내민식'?'가로':'',main_gap:kind==='단주식'?50:100,aux_gap:100};
 if(!isNew&&!s.detail?.placement)return '';
 const direction=['단주식','내민식'].includes(kind)?`<input type="hidden" name="placement_direction" value="${kind==='단주식'?'세로':'가로'}">`:select('placement_direction',[['','선택'],['세로','위에서 아래'],['가로','왼쪽에서 오른쪽']],rule.direction,'배치 방향');
 return `<section class="sl-placement-editor sl-section" data-kind="${e(kind)}" data-direction="${e(rule.direction)}"><div class="sl-placement-controls">${isNew?select('placement_template',[['','직접 입력'],...(s.supportForms||[]).filter(f=>f.kind===kind).map(f=>[f.key,f.label])],'','다른 형식의 입력값 가져오기'):''}${s.section==='installation'?'':modeChoices('data-placement-mode-choice')}${direction}</div>${installation(rule,true,s.registrationOptions,s.section==='installation'?s.detail?.placement?.catalog:undefined)}</section>`;
}
export function panelEditor(s){
 const rule=s.detail.placement.rule;
 return `<section class="sl-placement-editor"><input type="hidden" name="placement_direction" value="${e(rule.direction)}">${distanceTable(rule,true,s.registrationOptions,s.detail.placement.catalog)}<div class="sl-placement-gaps">${number('main_gap','본표지 ↔ 본표지 이격거리 (mm)',rule.main_gap)}${number('aux_gap','본표지 ↔ 보조표지 이격거리 (mm)',rule.aux_gap)}</div></section>`;
}
export function siteEditor(s){
 const rule=s.detail.placement.rule;
 return `<section class="sl-placement-editor" data-kind="${e(s.detail.support.형식)}" data-direction="${e(rule.direction)}"><input type="hidden" name="placement_direction" value="${e(rule.direction)}">${siteTable(rule,true)}</section>`;
}
export function roadEditor(s){
 const site=(s.screen!=='new'||s.copyId?s.detail?.placement?.rule.site:null)||blank().site;
 return `<section class="sl-support-road" data-road-position><h3>도로 설치위치</h3><table><thead><tr><th>구분</th><th>가로 이격 X (mm)</th><th>높이차 Z (mm)</th></tr></thead><tbody>${['fill','cut'].map((key,i)=>`<tr data-road-site-row="${key}"><th scope="row"><button type="button" data-road-site="${key}" aria-pressed="false">${i?'절토부':'성토부'}</button></th>${['x','z'].map(axis=>`<td><input class="sl-input" name="placement_${key}_${axis}" type="number" step="any" aria-label="${i?'절토부':'성토부'} ${axis==='x'?'가로 이격 X':'높이차 Z'} (mm)" value="${e(site[key][axis]??'')}" placeholder="미설정"></td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
}
export function gapEditor(s){
 const saved=s.screen!=='new'||s.copyId?s.detail?.placement?.rule:null;
 const kind=s.screen==='new'&&!s.copyId?'단주식':s.detail?.support?.형식||'단주식';
 const rule=saved||{main_gap:kind==='단주식'?50:100,aux_gap:100};
 return `<div class="sl-support-gaps" data-panel-gaps data-kind="${e(kind)}" ${kind==='부착식'?'hidden':''}>${number('main_gap','본표지 ↔ 본표지 간격 (mm)',rule.main_gap)}${number('aux_gap','본표지 ↔ 보조표지 간격 (mm)',rule.aux_gap)}</div>`;
}
export function gapPayload(form){
 if(!form?.querySelector('[data-panel-gaps]:not([hidden])'))return undefined;
 return Object.fromEntries(['main_gap','aux_gap'].map(key=>[key,form.elements['placement_'+key].value===''?null:Number(form.elements['placement_'+key].value)]));
}
export function updateGaps(form,s){
 const area=form.querySelector('[data-panel-gaps]');if(!area)return;
 const kind=form.elements['형식'].value;
 area.hidden=kind==='부착식';
 if(s.screen==='new'&&area.dataset.kind!==kind){
  form.elements.placement_main_gap.value=kind==='단주식'?50:100;
  form.elements.placement_aux_gap.value=100;
 }
 area.dataset.kind=kind;
}
export function roadPayload(form){
 if(!form?.querySelector('[data-road-position]:not([hidden])'))return undefined;
 return Object.fromEntries(['fill','cut'].map(key=>[key,Object.fromEntries(['x','z'].map(axis=>{
  const value=form.elements[`placement_${key}_${axis}`].value;
  return [axis,value===''?null:Number(value)];
 }))]));
}
export function updateRoad(form){
 const section=form.querySelector('[data-road-position]');if(!section)return;
 section.hidden=form.elements['형식'].value==='부착식';
 for(const row of section.querySelectorAll('[data-road-site-row]')){
  const inputs=[...row.querySelectorAll('input')],started=inputs.some(input=>input.value!=='');
  for(const input of inputs){
   const missing=!section.hidden&&started&&input.value==='';
   input.setCustomValidity(missing?`${input.getAttribute('aria-label')}를 입력하세요.`:'');
   input.setAttribute('aria-invalid',String(missing));
  }
 }
}
export function payload(form){
 if(!form.querySelector('.sl-placement-editor'))return undefined;
 const values=new FormData(form),num=name=>{const v=values.get('placement_'+name);return v===''||v===null?null:Number(v);};
 const distances=new Map();
 for(const cell of form.querySelector('.sl-placement-editor').querySelectorAll('.sl-distance-cell')){
  const {size,name}=cell.dataset,key=size+':'+name;
  if(!distances.has(key))distances.set(key,{size,name,x:null,z:null});
  for(const input of cell.querySelectorAll('[data-distance]')){
   const axis=input.dataset.distance;
   distances.get(key)[axis]=input.value===''?null:Number(input.value)*(axis==='z'?-1:1);
  }
 }
 return {direction:values.get('placement_direction'),x:null,z:null,main_gap:num('main_gap'),aux_gap:num('aux_gap'),distances:[...distances.values()],site:Object.fromEntries(['fill','cut'].map(k=>[k,{x:num(k+'_x'),z:num(k+'_z')}]))};
}
export function missingSite(form){return [...form.querySelectorAll('.sl-site-table input')].find(input=>input.value==='');}
export function setMode(form){
 form?.querySelectorAll('[data-placement-mode]').forEach(el=>el.hidden=el.dataset.placementMode!=='panels');
 const nav=form?.querySelector('.sl-installation-navigation');
 if(nav)nav.outerHTML=modeChoices('data-placement-mode-choice');
}
export function update(form,s){
 let area=form.querySelector('.sl-placement-editor');if(!area)return;
 const kind=form.querySelector('[name=형식]')?.value||s.detail?.support?.형식,template=form.querySelector('[name=placement_template]')?.value;
 const direction=kind==='단주식'?'세로':kind==='내민식'?'가로':form.querySelector('[name=placement_direction]').value;
 if(area.dataset.kind!==kind||area.dataset.direction!==direction||template){
  const source=template?s.supportForms.find(f=>f.key===template)?.placement:payload(form);
  if(source){
   const next={...source,direction};
   if(area.dataset.kind!==kind&&kind==='단주식'){next.x=0;next.distances=source.distances.map(r=>({...r,x:0}));}
   area.outerHTML=editor({...s,detail:{...s.detail,support:{...s.detail?.support,형식:kind}}},next);area=form.querySelector('.sl-placement-editor');
  }
 }
 const selected=s.section==='installation'&&s.detail?.placement?.catalog?[...new Set(s.detail.placement.catalog.map(r=>r.size))]:form.querySelector('[name=form_sizes]')?[...form.querySelectorAll('[name=form_sizes]:checked')].map(el=>el.value):(s.supportForms||[]).find(f=>f.key===(s.detail?.support?.기준형식||s.detail?.support?.회사모델코드))?.sizes||[];
 area.dataset.columns=String((direction==='세로'?1:2)*(selected.length||2));
 for(const cell of area.querySelectorAll('[data-placement-size]'))cell.hidden=selected.length>0&&!selected.includes(cell.dataset.placementSize);
 for(const row of area.querySelectorAll('[data-distance-sizes]'))row.hidden=selected.length>0&&!selected.some(size=>row.dataset.distanceSizes.split(' ').includes(size));
}
export function validateForm(form){
 const required=[...form.querySelectorAll('.sl-placement-gaps input,[data-panel-gaps]:not([hidden]) input,.sl-distance-cell input:not([type=hidden])')].filter(el=>!el.closest('[data-placement-size][hidden],[data-distance-sizes][hidden]'));
 const fields=[...form.querySelectorAll('[name=단면규격],[name=form_number],[data-support-dimension],[data-new-quantities] [required]')];
 let valid=true;
 for(const input of [...required,...fields]){
  const missing=input.value.trim()===''||(input.type==='number'&&!Number.isFinite(Number(input.value)))||!input.checkValidity();
  input.classList.toggle('sl-missing',missing);input.setAttribute('aria-invalid',String(missing));if(missing)valid=false;
 }
 for(const name of ['form_sizes','form_patterns'])if(form.querySelector(`[name=${name}]`)&&!form.querySelector(`[name=${name}]:checked`))valid=false;
 const direction=form.querySelector('[name=placement_direction]');if(direction&&!direction.value)valid=false;
 const submit=form.querySelector('[type=submit]');if(submit)submit.disabled=!valid;
 return valid;
}
export function coordinates(result){
 if(!result?.complete)return `<p class="sl-sub">${e(result?.message||'거리·간격 미설정')}</p>`;
 return coordinatePicture(result);
}
const group=r=>`${r.size}:${r.pattern.join(':')}`;
function calculatorBody(info,current={}){
 const results=info.results||[];if(!results.length)return '<p class="sl-sub">가용조합을 선택하세요.</p>';
 const groups=[...new Map(results.map(r=>[group(r),`${r.size} · 본표지 ${r.pattern[0]}장${r.pattern[1]?' + 보조표지 B 1장':''}`])).entries()];
 const selected=groups.some(([k])=>k===current.group)?current.group:groups[0][0];
 const rows=results.filter(r=>group(r)===selected),count=rows[0].pattern[0];
 // 미설정 결과에도 모양 선택은 유지할 수 있도록 원본 계획을 사용한다.
 const source=rows.map(r=>r.sourcePanels||r.panels);
 const chosen=Array.from({length:count},(_,i)=>{const values=[...new Set(source.map(p=>p[i]?.name).filter(Boolean))];return values.includes(current[i])?current[i]:values[0];});
 const row=rows.find((r,index)=>chosen.every((n,i)=>source[index][i]?.name===n));
 return `<div class="sl-form-grid">${select('position_group',groups,selected,'크기·장수')}${chosen.map((n,i)=>select('position_'+i,[...new Set(source.map(p=>p[i]?.name).filter(Boolean))].map(v=>[v,short(v)]),n,`${i+1}번째 표지판`)).join('')}</div>${coordinates(row)}`;
}
export function calculator(info,context){
 return `<details class="sl-fold" open><summary>좌표 확인</summary><div class="sl-position-calculator" data-position-context="${context}">${calculatorBody(info)}</div></details>`;
}
export function changeCalculator(target,info){
 const area=target.closest('.sl-position-calculator');if(!area||!info)return false;
 const current={group:area.querySelector('[name=position_group]').value};
 for(const select of area.querySelectorAll('select[name^=position_]'))if(select.name!=='position_group')current[select.name.slice(9)]=select.value;
 const focus=target.name;area.innerHTML=calculatorBody(info,current);area.querySelector(`[name="${focus}"]`)?.focus({preventScroll:true});return true;
}

export function readOnly(info,context='detail'){
 if(!info)return '<p class="sl-sub">등록된 설치위치가 없습니다.</p>';
 const sizes=[...new Set((info.results||[]).map(r=>r.size))];
 return `<section class="sl-section sl-placement-summary" data-placement-sizes="${e(sizes.join(' '))}" data-columns="${(info.rule.direction==='세로'?1:2)*(sizes.length||2)}">${installation(info.rule,false)}${calculator(info,context)}</section>`;
}
