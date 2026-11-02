/* 교통표지 신규등록과 상세 모양 선택. 크기·조합은 공통 규격을 사용한다. */
import {e} from './views.js';
import {slot as coordinateSlot} from './sign-coordinates.js';
import {tabs as pageTabs,select as selectPage} from './panel-pages.js';
import {linkedCombinations} from './combination-view.js';
import {cadFields,categories,categoryForCode,updateCAD} from './sign-fields.js';

const field=(label,name,value='',required=false)=>`<label class="sl-field"><span>${label}</span><input class="sl-input" name="${name}" value="${e(value)}" ${required?'required':''}></label>`;
const action=(label,name)=>`<button type="button" class="sl-button" data-action="${name}">${label}</button>`;
const sizeSummary=option=>`<div class="sl-chips">${option.specs.map(p=>`<span class="sl-size">${option.auxiliary?'':e(p.name)+' · '}${p.width} × ${p.height}</span>`).join('')}</div>`;
const shapeChoice=(value,label,checked)=>`<label class="sl-shape-option"><input type="radio" name="registration_shape" value="${e(value)}" ${checked?'checked':''} required><span>${e(label)}</span></label>`;
export function selectionFields(options,category,chosen='',sizes=[],flat=false){
  const available=options.filter(o=>o.auxiliary===(String(category)==='3'));
  const selected=available.find(o=>o.name===chosen);
  const choices=available.map(o=>shapeChoice(o.name,(o.displayName||o.name).replaceAll('_',' '),selected===o)).join('');
  if(flat)return `<section class="sl-section sl-sign-specs" aria-label="표지판 모양·크기"><div class="sl-specs-heading"><div class="sl-shape-options sl-shape-text" role="group" aria-label="표지판 모양">${choices}</div><span>폭 × 높이 (mm)</span></div><div class="sl-specs-value">${selected?sizeSummary(selected):'<span class="sl-sub">모양을 선택하세요.</span>'}</div></section>`;
  const specs=selected?.specs.map(p=>`<div class="sl-spec-option"><label><input type="checkbox" name="registration_sizes" value="${e(p.name)}" ${sizes.includes(p.name)?'checked':''}><strong>${selected.auxiliary?'':e(p.name)+' · '}${p.width} × ${p.height}</strong></label>${linkedCombinations(p.models,{shape:selected.shape,width:p.width,height:p.height},flat)}</div>`).join('');
  const sizeFields=selected?`<div class="sl-spec-heading"><span>B×H (mm)</span><button type="button" class="sl-button" data-action="all-sizes">전체선택</button></div>${selected.auxiliary&&!selected.name.endsWith(' A')?'<p class="sl-sub">함께 쓰는 본표지판의 너비에 맞춰 선택하세요.</p>':''}<div class="sl-spec-options">${specs}</div><p class="sl-sub">크기를 선택하면 같은 판을 사용하는 조합에 자동으로 연결됩니다. OBJ의 실제 제원은 직접 확인하세요.</p>`:'<p class="sl-sub">모양을 선택하면 크기와 가용조합이 표시됩니다.</p>';
  return `<fieldset class="sl-registration-step" data-panel-page="shape"><legend><b>2</b> 모양</legend><div class="sl-shape-options sl-shape-text">${choices}</div></fieldset><fieldset class="sl-registration-step" data-panel-page="size" hidden><legend><b>3</b> 표지판 크기</legend>${sizeFields}</fieldset>`;
}
export function initialSelection(s,copy=false){
  const selected=s.detail?.panelSelections||[];
  if(selected.length)return {shape:selected[0]['모양'],sizes:selected.filter(p=>p['모양']===selected[0]['모양']).map(p=>p['제원명']),multiple:new Set(selected.map(p=>p['모양'])).size>1};
  if(!copy)return {shape:'',sizes:[]};
  const panels=[...(s.detail?.configs||[]).flatMap(c=>c.slots.filter(p=>p.own).map(p=>p.panel)),...(s.detail?.wayRules||[]).map(r=>r.panel)];
  const auxiliary=s.detail?.sign['분류코드']===3;
  const options=(s.registrationOptions||[]).filter(o=>o.auxiliary===auxiliary);
  const exact=options.filter(o=>o.specs.some(spec=>panels.some(p=>p['형태']===o.shape&&p['폭_mm']===spec.width&&p['높이_mm']===spec.height)));
  // 보조 B1/B2처럼 같은 치수를 공유하면 임의로 모양을 선택하지 않는다.
  if(exact.length!==1)return {shape:'',sizes:[]};
  return {shape:exact[0].name,sizes:exact[0].specs.map(p=>p.name)};
}
function auxiliaryFields(options,rows=[],flat=false){
 const selected=new Set(rows.map(r=>`${r['모양']}|${r['제원명']}`));
 if(flat)return `<div class="sl-auxiliary-sizes">${options.filter(o=>o.auxiliary).map(o=>`<fieldset><legend><label><input type="checkbox" name="registration_shapes" value="${e(o.name)}" ${rows.some(r=>r['모양']===o.name)?'checked':''}>${e((o.displayName||o.name).replace('_',''))}</label></legend>${sizeSummary(o)}</fieldset>`).join('')}</div><span class="sl-sub">선택한 모양의 모든 규격이 적용됩니다. (mm)</span>`;
 return `<div class="sl-auxiliary-sizes">${options.filter(o=>o.auxiliary).map(o=>`<fieldset><legend>${e((o.displayName||o.name).replace('_',''))}</legend>${o.specs.map(p=>`<label><input type="checkbox" name="auxiliary_size" value="${e(JSON.stringify([o.name,p.name]))}" ${selected.has(`${o.name}|${p.name}`)?'checked':''}>${p.width} × ${p.height}</label>`).join('')}</fieldset>`).join('')}</div>`;
}
export function selectionEditor(s){
 const names=[...new Set((s.detail.panelSelections||[]).map(p=>p['모양']))],current=JSON.stringify(names);
 const options=(s.registrationOptions||[]).filter(o=>o.auxiliary===(String(s.detail.sign['분류코드'])==='3')).map(o=>[o.name]);
 if(names.length>1)options.unshift(names);
 const choices=options.map(group=>shapeChoice(JSON.stringify(group),group.map(name=>(s.registrationOptions.find(o=>o.name===name)?.displayName||name).replaceAll('_',' ')).join(' · '),JSON.stringify(group)===current)).join('');
 return `<form class="sl-inline-form sl-inline-field sl-shape-editor" data-field="registration" data-shape-only data-initial="${e(current)}"><div class="sl-shape-options sl-shape-text" role="group" aria-label="표지판 모양">${choices}</div><button type="button" class="sl-inline-cancel" data-action="inline-cancel" aria-label="취소" title="취소 (Esc)">×</button><span class="sl-inline-saving" role="status" hidden>저장 중…</span><p class="sl-error" role="alert" hidden></p></form>`;
}
export function shapeSelection(options,names){
 const selections=names.map(shape=>{const option=options.find(o=>o.name===shape);if(!option?.specs.length)throw new Error('등록된 모양과 규격을 확인하세요.');return {shape,sizes:option.specs.map(p=>p.name)};});
 if(!selections.length)throw new Error('표지판 모양을 선택하세요.');
 return selections.length===1?selections[0]:{selections};
}
export function selectionPayload(form,options=[]){
 const values=new FormData(form);
 if(form.hasAttribute('data-shape-only'))return shapeSelection(options,JSON.parse(values.get('registration_shape')));
 if(form.classList.contains('sl-registration-flat'))return shapeSelection(options,form.querySelector('[name=registration_shapes]')?values.getAll('registration_shapes'):[values.get('registration_shape')].filter(Boolean));
 if(!form.querySelector('[name=auxiliary_size]'))return {shape:values.get('registration_shape'),sizes:values.getAll('registration_sizes')};
 const groups=new Map();
 for(const value of values.getAll('auxiliary_size')){
  const [shape,size]=JSON.parse(value);if(!groups.has(shape))groups.set(shape,[]);
  groups.get(shape).push(size);
 }
 return {selections:[...groups].map(([shape,sizes])=>({shape,sizes}))};
}
export function updateCategory(form,options){
 const category=form.querySelector('[data-category-auto]');if(!category)return;
 const next=categoryForCode(form.elements.code.value);
 if(next!==''&&next!==category.value){
  category.value=next;
  const shape=form.querySelector('[name=registration_shape]:checked')?.value||'';
  const sizes=[...form.querySelectorAll('[name=registration_sizes]:checked')].map(el=>el.value);
  form.querySelector('.sl-registration-selection').innerHTML=selectionFields(options,next,shape,sizes,form.classList.contains('sl-registration-flat'));
 }
 selectPage(form,form.dataset.page||'info');updateCAD(form);
}
export function registrationForm(s,isNew,copy){
  const r=isNew&&!copy?{}:s.detail.sign,initial=isNew&&!copy?{shape:'',sizes:[]}:initialSelection(s,copy);
  const categoryField=`<select class="sl-input" name="category" ${isNew?'data-category-auto':''} required><option value="">선택</option>${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${String(r['분류코드'])===id?'selected':''}>${label}</option>`).join('')}</select>`;
  return `<div class="sl-panel-head"><h2>${isNew?'표지판 신규등록':'표지판 정보 수정'}</h2>${action('닫기',isNew?'close':'cancel')}</div><form class="sl-form sl-registration${isNew?' sl-registration-flat':''}">${isNew?'':pageTabs([['info','기본정보'],['shape','모양'],['size','크기'],['cad','CAD']])}<div class="sl-body">${copy?`<p class="sl-sub">${e(r['표지번호'])}의 기본정보를 가져왔습니다. 사용할 모양·제원을 확인하세요.</p>`:''}<fieldset class="sl-registration-step" data-panel-page="info"><legend><b>1</b> 기본정보</legend><div class="sl-form-grid sl-sign-basics">${field('표지번호','code',isNew?'':r['표지번호'],true)}${field('표지 이름','name',r['명칭']||'',true)}<label class="sl-field"><span>분류</span>${categoryField}</label></div></fieldset><div class="sl-registration-selection">${initial.multiple?auxiliaryFields(s.registrationOptions,s.detail.panelSelections,isNew):selectionFields(s.registrationOptions||[],r['분류코드'],initial.shape,initial.sizes,isNew)}</div><fieldset class="sl-registration-step sl-registration-cad" data-panel-page="cad" ${isNew?'':'hidden'}>${isNew?cadUploadSlot():'<legend><b>4</b> CAD 정보</legend>'}<div class="sl-form-grid">${isNew?'<label class="sl-field sl-wide"><span>CAD 블록명</span><output data-registration-block>표지번호 입력 후 자동 연결</output></label>':''}${cadFields(isNew?{}:r)}</div>${coordinateSlot()}</fieldset>${isNew?'<section class="sl-sign-preview" data-sign-preview aria-label="3D 미리보기"><div data-sign-model><p class="sl-empty">모양을 선택하면 3D를 확인할 수 있습니다.</p></div></section>':''}<p class="sl-error" role="alert" hidden></p></div><footer class="sl-footer${isNew?' sl-sign-footer':''}">${isNew?'':'<div><button type="button" class="sl-delete" data-action="delete">표지판 삭제</button></div>'}<div class="sl-actions">${isNew?'':action('취소','cancel')}<button type="submit" class="sl-button sl-primary">${isNew?'등록':'저장'}</button></div></footer></form>`;
}

export function cadUploadSlot(replace=false,fileView=true){
 return `<div data-cad-upload><div class="sl-cad-file-head"><h3>CAD 정보</h3><label class="sl-button sl-cad-file-pick">CAD 블록 ${replace?'재업로드':'업로드'}<input type="file" accept=".dwg,.dxf" data-registration-cad-file aria-label="CAD 블록 파일 선택"></label></div><div class="sl-cad-file-row" ${fileView?'':'hidden'}><span data-registration-cad-name>${fileView?'선택한 파일 없음':''}</span>${fileView?'<button type="button" class="sl-button" data-registration-cad-view disabled>파일 보기</button>':''}</div><div class="sl-cad-file-info" data-registration-cad-info hidden></div></div>`;
}
