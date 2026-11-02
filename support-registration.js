/* 지주 등록의 형식·조합·수량 초안. 저장 전까지 실제 연결과 값은 바꾸지 않는다. */
import {e} from './views.js';
import {supportFormKey} from './catalog-supports.js';
import {quantityValues,quantityRow as storedQuantityRow,inlineRow,inlineQuantities} from './quantity-editor.js';
import {changeMaterial} from './quantity-material.js';
import {effectiveRows} from './quantity-auto.js';
import {factorView} from './combination-view.js';
import * as placement from './placement.js';

const input=(name,label,value='',type='text')=>`<label class="sl-field"><span>${label}</span><input class="sl-input" name="${name}" aria-label="${label}" type="${type}" value="${e(value)}" ${type==='number'?'step="any"':''}></label>`;
export function formSummary(s,key){
 const f=s.supportForms?.find(f=>f.key===key);if(!f)return '';
 return `<div class="sl-form-sizes">표지판 크기 <strong>${e((f.sizes||[]).join(' · '))}</strong></div>${automaticView(s,f.sizes,f.patterns||[[1,0]])}`;
}

export function automaticView(s,sizes,patterns){
 const definition=s.screen==='new'?null:s.supportForms?.find(f=>f.key===supportFormKey(s.detail?.support||{}));
 const rows=(s.combinationOptions||[]).filter(r=>sizes.includes(r.size)&&patterns.some(p=>p.join(':')===r.pattern.join(':'))&&(!definition?.shapeFilter||(r.panels[0].shape==='삼각'||r.panels[0].shape==='역삼각')===(definition.shapeFilter==='triangle')));
 if(!sizes.length||!patterns.length)return '<p class="sl-sub">크기와 가용조합을 선택하세요.</p>';
 if(!s.combinationOptions)return '';
 const groups=new Map();
 for(const r of rows){const key=`${r.size} · ${patternLabel(r.pattern)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return `<div class="sl-auto-combinations"><h3>가용조합 <span>${rows.length}가지</span></h3>${[...groups].map(([name,items])=>{
   const main=items[0].pattern[0];
   const factors=items[0].panels.map((_,index)=>[...new Map(items.map(r=>{const p=r.panels[index];return [`${p.name}|${p.width}|${p.height}`,p];})).values()]);
   return `<details class="sl-auto-group"><summary>${e(name)}<strong>${items.length}가지</strong></summary>${factorView(factors,main,{dependentAux:true})}</details>`;
 }).join('')}<p class="sl-sub">치수 mm · 위에서 아래, 내민식은 왼쪽에서 오른쪽 순서</p></div>`;
}

const patternLabel=([main,aux])=>`표지판 ${main}장${aux?` + 보조표지 B ${aux}장`:''}`;
const selectionKey=(sizes,patterns)=>JSON.stringify([sizes.slice().sort(),patterns.map(p=>p.join(':')).sort()]);
function patternCard(pair,selectable=false,checked=false){
 const content=`<span>${patternLabel(pair)}</span>`;
 return selectable?`<label class="sl-pattern-card"><input type="checkbox" name="form_patterns" value="${pair.join(':')}" ${checked?'checked':''}>${content}</label>`:`<div class="sl-pattern-card sl-pattern-static">${content}</div>`;
}
export function patternOptions(s,kind){
 const forms=(s.supportForms||[]).filter(f=>f.kind===kind&&(!f.road||f.road===(s.postRoad||'고속도로'))),pairs=forms.flatMap(f=>[...f.patterns||[],...f.originalPatterns||[]]);
 // 교통표지는 회사 형식의 장수, 나머지는 해당 종류의 기존 DB 조합을 표시한다.
 if(!['단주식','내민식','미확정'].includes(kind)){
   const t=s.tables||{},posts=new Set((t.supports||[]).filter(p=>p['형식']===kind).map(p=>p['지주기초ID']));
   for(const c of t.configs||[]){
     if(!posts.has(c['지주기초ID']))continue;
     const panels=(t.slots||[]).filter(p=>p['구성ID']===c['구성ID']).map(p=>(t.panels||[]).find(x=>x['판ID']===p['판ID']));
     if(!panels.length||panels.some(p=>!p?.['형태']))continue;
     const aux=panels.filter(p=>p['형태']==='보조'&&!(p['폭_mm']>0&&p['폭_mm']===p['높이_mm'])).length;
     if(panels.length>aux)pairs.push([panels.length-aux,aux]);
   }
 }
 return [...new Map(pairs.map(p=>[p.join(':'),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
}
export function newForm(s){
 if(s.screen!=='new'){
   const post=s.detail?.support,definition=s.supportForms?.find(f=>f.key===(post?.기준형식||post?.회사모델코드));
   if(!definition||!['단주식','내민식','부착식'].includes(definition.kind))return '';
   const patterns=patternOptions(s,definition.kind),selected=definition.patterns||patterns;
   return `<input type="hidden" name="form_mode" value="edit"><input type="hidden" name="form_initial" value="${e(selectionKey(definition.sizes,selected))}"><fieldset class="sl-new-form"><legend>가용조합 수정</legend><div class="sl-form-sizes">표지판 크기 ${['소형','중형','대형'].map(v=>`<label><input type="checkbox" name="form_sizes" value="${v}" ${definition.sizes.includes(v)?'checked':''}> ${v}</label>`).join('')}</div><div class="sl-pattern-options" data-kind="${e(definition.kind)}">${patterns.map(p=>patternCard(p,true,selected.some(q=>q.join(':')===p.join(':')))).join('')}</div><div class="sl-matching-combinations" aria-live="polite"></div></fieldset>`;
 }
 const next=Math.max(6,...(s.supportForms||[]).filter(f=>!f.road||f.road===(s.postRoad||'고속도로')).map(f=>f.number||0))+1;
 const source=s.copyId?s.supportForms?.find(f=>f.key===(s.detail?.support?.기준형식||s.detail?.support?.회사모델코드)):null;
 const kind=source?.kind||'단주식',patterns=patternOptions(s,kind);
 return `<input type="hidden" name="form_mode" value="new"><input type="hidden" name="form_road" value="${e(s.postRoad||'고속도로')}"><fieldset class="sl-new-form"><legend>새 형식</legend>${input('form_number','형식 번호',next,'number')}<div class="sl-form-sizes">표지판 크기 ${['소형','중형','대형'].map(v=>`<label><input type="checkbox" name="form_sizes" value="${v}" ${source?.sizes.includes(v)?'checked':''}> ${v}</label>`).join('')}</div><h3 class="sl-section-title">가용조합</h3><div class="sl-pattern-options" data-kind="${e(kind)}">${patterns.map(p=>patternCard(p,true,source?.patterns?.some(q=>p.join(':')===q.join(':')))).join('')}</div><div class="sl-matching-combinations" aria-live="polite"></div></fieldset>`;
}

export function draftQuantities(s){
 const source=s.modelSource||s.copyId;
 const saved=source?(s.tables?.quantities||s.detail?.quantities||[]).filter(q=>q['대상종류']==='지주기초'&&q['대상ID']===source&&q['수량항목']):[];
 return effectiveRows(saved).map(q=>({...q,수량ID:'',근거:''}));
}
export function initialQuantities(s){
 return `<div data-new-quantities>${inlineQuantities(draftQuantities(s),true)}</div>`;
}
export function refreshQuantities(form,s){
 const area=form.querySelector('[data-new-quantities]');if(!area)return;
 // 입력을 시작한 수량은 기본 모델을 바꿔도 덮어쓰지 않는다.
 if(quantityValues(area).length)return;
 area.innerHTML=inlineQuantities(draftQuantities(s),true);
}
export function payload(form){
 const v=new FormData(form),result={};
 const positions=placement.payload(form);if(positions)result.placement=positions;
 const site=placement.roadPayload(form);if(site)result.site=site;
 const gaps=placement.gapPayload(form);if(gaps)result.gaps=gaps;
 if(v.get('form_mode')==='new'){
   result.new_form={road:v.get('form_road')||'고속도로',number:v.get('form_number'),kind:v.get('형식'),sizes:v.getAll('form_sizes'),patterns:v.getAll('form_patterns').map(value=>value.split(':').map(Number))};
   result.auto_connections=true;
 }
 if(v.get('form_mode')==='edit'){
   const sizes=v.getAll('form_sizes'),patterns=v.getAll('form_patterns').map(value=>value.split(':').map(Number));
   result.form_update={sizes,patterns};
 }
 const quantities=form.querySelector('[data-new-quantities]');
 if(quantities)result.quantities=quantityValues(quantities,true).filter(q=>q.value!==''||q.material);
 if(form.querySelector('[data-common-quantity-editor]'))result.quantity_edits=quantityValues(form);
 if(v.get('model_file_id')||v.get('model_name')||v.get('model_url'))result.model={file_id:v.get('model_file_id')||'',name:v.get('model_name')||'',url:v.get('model_url')||'',role:'3D형상 OBJ·MTL'};
 return result;
}
export function update(form,s){
 placement.update(form,s);
 placement.updateRoad(form);
 placement.updateGaps(form,s);
 const fresh=form.querySelector('[name=form_mode]')?.value==='new';
 if(fresh){
   let values=new FormData(form);const kind=values.get('형식'),options=form.querySelector('.sl-pattern-options');
   if(options.dataset.kind!==kind){
     const selected=new Set(values.getAll('form_patterns'));
     options.innerHTML=patternOptions(s,kind).map(p=>patternCard(p,true,selected.has(p.join(':')))).join('')||'<p class="sl-sub">등록된 가용조합이 없습니다.</p>';
     options.dataset.kind=kind;values=new FormData(form);
   }
 }
 const generated=form.querySelector('.sl-matching-combinations');
 if(generated){const values=new FormData(form);generated.innerHTML=automaticView(s,values.getAll('form_sizes'),values.getAll('form_patterns').map(v=>v.split(':').map(Number)));}
 const model=form.querySelector('.sl-new-model-fields');if(model)model.hidden=!!form.querySelector('[name=model_file_id]').value;
 for(const input of form.querySelectorAll('[data-draft-section="models"] input,[data-draft-section="models"] select'))input.disabled=!!form.elements.model_source?.value;
 placement.validateForm(form);
}
export function click(s,form,target){
 if(form.querySelector('[data-common-quantity-editor],[data-new-quantities]')){
  const add=target.closest('[data-action=more-quantity],[data-action=more-rebar]');
  if(add){const inline=form.querySelector('[data-inline-quantities]'),q=add.dataset.action==='more-rebar'?{수량항목:'철근',단위:'t'}:{};(inline||form.querySelector('.sl-bulk-quantities')).querySelector('tbody').insertAdjacentHTML('beforeend',inline?inlineRow(q,!!form.querySelector('[data-new-quantities]')):storedQuantityRow(q));return true;}
  const remove=target.closest('[data-remove-quantity]');if(remove){remove.closest('tr').remove();return true;}
 }
 return false;
}
export {changeMaterial};
