/* 공용 판의 모양·크기·모델 관리. 저장 전 관련 규격과 사용 표지판을 확인한다. */
import {e} from './views.js';
import {drawing,solid,label,thumbnail} from './master-preview.js';
import * as shape from './plate-shape.js';
import * as positions from './standard-installation.js';
import {meshSvg} from './mesh-preview.js';
import {drawing as positionDrawing,assembly as positionAssembly,topDrawing} from './standard-position-preview.js';
import {supportFormKey} from './catalog-supports.js';
import {read as positionValues,issue as positionIssue} from './standard-position-editor.js';
const button=(text,action)=>`<button type="button" class="sl-button" data-action="${action}">${text}</button>`;
const field=(label,name,value='',type='text',readOnly=false)=>`<label class="sl-field"><span>${label}</span><input class="sl-input" name="${name}" value="${e(value)}" type="${type}" ${type==='number'?'min="0.001" step="any"':''} ${readOnly?'data-master-edit readonly title="더블클릭 또는 Enter로 수정"':''} required></label>`;
export function sizeChoices(option,missing=false){
 if(missing)return option&&!option.auxiliary?['소형','중형','대형'].filter(v=>!option.specs.some(p=>p.name===v)):[];
 return option?option.specs.map(p=>p.name):['소형','중형','대형'];
}
export function rows(s){
 return (s.registrationOptions||[]).filter(o=>o.name.includes(s.search||'')).flatMap(o=>o.specs.map(p=>{
  const ids=new Set(s.tables.panels.filter(r=>r['형태']===o.shape&&r['폭_mm']===p.width&&r['높이_mm']===p.height).map(r=>r['판ID']));
  const files=new Set(s.tables.filelinks.filter(r=>r['대상종류']==='판'&&ids.has(r['대상ID'])).map(r=>r['파일ID']));
  return {...p,shape:o.name,auxiliary:o.auxiliary,files:s.tables.files.filter(f=>files.has(f['파일ID'])&&/\.obj$/i.test(f['파일명']))};
 }));
}
export function grid(s){
 const choices=(s.registrationOptions||[]).map(o=>({...o,specs:o.specs.filter(p=>`${o.displayName||o.name} ${p.name} ${p.width} ${p.height}`.includes(s.search||''))}));
 return `<div class="sl-common-cards" aria-label="표지판 모양 목록">${choices.filter(o=>o.specs.length).map(o=>{
  const p=o.specs.find(p=>p.name===s.masterSize)||o.specs[0];
  return `<button type="button" class="sl-common-card" data-master-select="${e(o.name)}" data-master-size="${e(p.name)}" aria-pressed="${s.screen!=='new'&&s.masterName===o.name}">${thumbnail(o)}<strong>${e(label(o.displayName||o.name))}</strong></button>`;
 }).join('')||'<p class="sl-empty">검색 결과가 없습니다.</p>'}</div>`;
}
export function selection(s){
 const option=s.registrationOptions?.find(o=>o.name===s.masterName)||s.registrationOptions?.[0];
 return {option,spec:option?.specs.find(p=>p.name===s.masterSize)||option?.specs[0]};
}
export async function loadSupport(root,s,form,api){
 const position=positions.selected(form);
 if(!position||position.kind==='부착식'){s.standardPositionModel=null;draw(root,s,form);return;}
 if(s.standardPositionModel?.key===position.key)return;
 const entry={key:position.key,model:null};s.standardPositionModel=entry;
 draw(root,s,form);
 const post=s.tables.supports.find(p=>supportFormKey(p)===position.key);
 try{entry.model=post?await api('/api/supports/'+encodeURIComponent(post['지주기초ID'])+'/model'):{available:false,message:'연결된 지주 모델이 없습니다.'};}
 catch(err){entry.model={available:false,message:err.message};}
 if(form.isConnected&&s.standardPositionModel===entry)draw(root,s,form.matches?.('[data-master-row]')?active(root):form);
}
export function draw(root,s,form){
 if(form?.matches?.('.sl-master-form'))form=active(form);
 const area=root.querySelector('[data-master-drawing]');if(!area)return;
 const choices=root.querySelector('[data-standard-view-supports]');if(choices)choices.innerHTML=positions.previewChoices(form);
 const selected=selection(s);
 let option=selected.option,width=selected.spec?.width,height=selected.spec?.height,thickness=option?.thickness||3;
 if(form){
  const parent=form.matches?.('[data-master-row]')?outer(form):form,isNew=parent.elements.name.value==='__new__';
  option=isNew?{name:parent.elements.new_name.value||'새 모양',geometry:shape.fromForm(parent)}:s.registrationOptions.find(o=>o.name===parent.elements.name.value);
  if(isNew&&option.geometry.profile&&parent.dataset.copyOutline)option.outline=JSON.parse(parent.dataset.copyOutline);
  width=form.elements.width.value;height=form.elements.height.value;
  thickness=form.elements.thickness.value;
 }
 const raw=form?.matches?.('[data-master-row]')?(draft(form).draftModel||draft(form).model):s.standardDraftModel||s.standardModel;
 const editable=form?.elements.width.dataset.derived!=='true';
 const position=positions.selected(form),post=position?.key===s.standardPositionModel?.key?s.standardPositionModel?.model:null;
 const assembled=s.plateView==='solid'?positionAssembly(option,width,height,thickness,position,raw,post):null;
 area.innerHTML=s.plateView==='solid'
  ?assembled?meshSvg(assembled,'표지판과 지주 설치위치',s.plateYaw??-.55,s.platePitch??-.2,s.plateCamera):raw?meshSvg(raw,'표지판 OBJ',s.plateYaw??-.55,s.platePitch??-.2,s.plateCamera):solid(option,width,height,thickness,s.plateYaw,s.platePitch,s.plateCamera)
  :s.plateView==='top'?topDrawing(option,width,height,thickness,position,raw,post)
  :positionDrawing(option,width,height,position,raw,post,editable)||drawing(option,width,height,raw,editable);
 if((!s.plateView||s.plateView==='front')&&position&&position.kind!=='부착식'&&(!post?.available||!post.origin))area.innerHTML+=`<p class="sl-standard-model-status" role="status">${e(!post?'지주 OBJ를 불러오는 중입니다…':post.message||'지주 OBJ의 설치 기준점을 확인할 수 없습니다.')}</p>`;
 if(form&&form.dataset.mode!=='edit'&&!raw&&!(Number(width)>0&&Number(height)>0))area.innerHTML='<p class="sl-empty">OBJ를 업로드하거나 폭·높이를 입력하세요.</p>';
 root.querySelectorAll('[data-master-select]').forEach(b=>b.setAttribute('aria-pressed',String(form?.dataset.mode!=='shape'&&b.dataset.masterSelect===option?.name)));
 root.querySelectorAll('[data-plate-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plateView===(s.plateView||'front'))));
}
// 크기마다 독립된 초안을 보관하고, 선택한 크기만 큰 도면에 표시한다.
const drafts=new WeakMap();
export function draft(row){if(!drafts.has(row))drafts.set(row,{});return drafts.get(row);}
export const allRows=root=>[...(root?.querySelectorAll('[data-master-row]')||[])];
export function active(root){return root?.matches?.('[data-master-row]')?root:root?.querySelector('[data-master-row][data-active="true"]')||allRows(root)[0];}
export const outer=row=>row.closest('.sl-master-form');
export function values(row){return Object.fromEntries([...row.querySelectorAll('[name]')].map(el=>[el.name,el.value]));}
export function rowGeometry(row,s){const form=outer(row);return shape.fromForm(form,s.registrationOptions.find(o=>o.name===form.elements.name.value));}
export function started(row){return row.dataset.mode==='edit'||!!(row.elements.width.value||row.elements.height.value||draft(row).upload);}
export function changed(row,s){
 if(row.dataset.enabled==='false')return false;
 const name=outer(row).elements.name.value,option=s.registrationOptions.find(o=>o.name===name),spec=option?.specs.find(p=>p.name===row.elements.size.value);
 return !!draft(row).upload||positions.changed(row)||(!spec?started(row):outer(row).elements.new_name.value.trim()!==(option.displayName||name)||['width','height'].some(key=>Number(row.elements[key].value)!==spec[key]));
}
export function activate(root,s,row){
 if(!row||row.dataset.enabled==='false')return;
 const form=outer(row);for(const item of allRows(form)){const on=item===row;item.dataset.active=String(on);item.querySelector('[data-master-size-choice]').setAttribute('aria-pressed',String(on));}
 s.masterSize=row.elements.size.value;if(form.elements.name.value!=='__new__')s.masterName=form.elements.name.value;
 const remove=form.querySelector('[data-action=master-delete]');if(remove){remove.hidden=row.dataset.mode!=='edit';remove.textContent=row.elements.size.value+' 삭제';}
 draw(root,s,row);
}
function sizeRow(s,option,size,preferred){
 const spec=option?.specs.find(p=>p.name===size),enabled=!option||!!spec;
 return `<fieldset class="sl-master-size-row" data-master-row data-mode="${spec?'edit':option?'size':'shape'}" data-enabled="${enabled}" data-active="${enabled&&size===preferred}"><legend>${e(size)}</legend><div class="sl-master-size-head"><button type="button" data-master-size-choice="${e(size)}" aria-pressed="${enabled&&size===preferred}" ${enabled?'':'disabled'}>${e(size)}</button><div class="sl-master-model-controls" ${enabled?'':'hidden'}></div>${!enabled?'<button type="button" class="sl-master-add-size" data-master-enable aria-label="'+e(size)+' 규격 추가">+</button>':''}</div><div data-master-size-body ${enabled?'':'hidden'}><input type="hidden" name="size" value="${e(size)}"><div class="sl-form-grid sl-master-dimensions">${field('폭 (mm)','width',spec?.width??'','number',!!spec)}${field('높이 (mm)','height',spec?.height??'','number',!!spec)}<input type="hidden" name="thickness" value="${option?.thickness||3}"></div><div class="sl-standard-installation" data-standard-connections>${positions.view(s,spec?option:null,spec)}</div><div class="sl-master-preview" hidden></div></div></fieldset>`;
}
export function form(s,name='',size=''){
 const option=s.registrationOptions.find(o=>o.name===name),sizes=option?.auxiliary?option.specs.map(p=>p.name):['소형','중형','대형'],preferred=size||option?.specs[0]?.name||sizes[0];
 const common=`<input type="hidden" name="name" value="${e(option?name:'__new__')}"><div class="sl-master-new">${field('모양 이름 (필수)','new_name',option?.displayName||option?.name||'')}</div>`;
 const viewport=`<div class="sl-common-model"><div class="sl-view-tabs" role="group" aria-label="판 보기">${[['front','정면'],['top','평면'],['solid','3D']].map(([key,text])=>`<button type="button" data-plate-view="${key}" aria-pressed="${(s.plateView||'front')===key}">${text}</button>`).join('')}<div class="sl-standard-view-supports" data-standard-view-supports role="group" aria-label="미리보기 지주"></div></div><div class="sl-master-stage" data-master-drawing></div></div>`;
 return `<form novalidate class="sl-master-form sl-canvas-form sl-common-detail sl-master-stacked" data-mode="${option?'edit':'shape'}"><header class="sl-panel-head"><h2>${option?e(label(option.displayName||name)):'표지판 신규등록'}</h2>${button('닫기','master-cancel')}</header><div class="sl-common-body"><div class="sl-common-columns">${viewport}<div class="sl-common-information"><div class="sl-master-common-fields">${common}${shape.controls()}</div><div class="sl-master-size-list">${sizes.map(v=>sizeRow(s,option,v,preferred)).join('')}</div>${option?`<div class="sl-master-copy">${button('복사 후 수정','master-copy')}</div>`:''}<p class="sl-error" role="alert" hidden></p></div></div></div><footer class="sl-footer"><div data-workspace-save><button type="submit" class="sl-button sl-primary">${option?'저장':'등록'}</button></div>${option?'<button type="button" class="sl-button sl-delete-button" data-action="master-delete">삭제</button>':''}</footer></form>`;
}
export function update(target,s){
 const form=target.matches('[data-master-row]')?outer(target):target,name=form.elements.name.value,isNew=name==='__new__';
 form.elements.new_name.disabled=false;shape.update(form,s.registrationOptions.find(o=>o.name===name));
 form.elements.new_name.setCustomValidity(s.registrationOptions.some(o=>o.name!==name&&[o.name,o.displayName].includes(form.elements.new_name.value.trim()))?'이미 등록된 모양입니다. 다른 이름을 입력하세요.':'');
 const records=rows({...s,search:''});
 for(const row of allRows(form)){
  const enabled=row.dataset.enabled!=='false',state=draft(row),record=records.find(r=>r.shape===name&&r.name===row.elements.size.value),file=record?.files.find(f=>f['서버주소']);
  row.querySelector('[data-master-size-choice]').disabled=!enabled;
  for(const el of row.querySelectorAll('input,select'))el.disabled=!enabled;
  if(!enabled)continue;
  positions.update(row);
  if(row.dataset.mode==='edit'&&!positions.changed(row))for(const input of row.querySelectorAll('[data-standard-axis]'))input.required=false;
  for(const key of ['width','height']){const input=row.elements[key];input.required=started(row);const derived=!!(state.upload||file);input.readOnly=row.dataset.mode==='edit'||derived;input.dataset.derived=String(derived);input.tabIndex=derived?-1:0;if(derived){input.removeAttribute('data-master-edit');input.title='OBJ 치수';}else if(row.dataset.mode==='edit'){input.setAttribute('data-master-edit','');input.title='더블클릭 또는 Enter로 수정';}}
  row.querySelector('.sl-master-dimensions').hidden=!!(state.upload||file);
  const url=file?.['확인상태']==='OBJ 업로드'?file['서버주소']:file?.['서버주소']?.replace(/(\/api\/plate-models\/[a-f0-9]{64})\/plate\.obj$/,'$1/model.zip');
  row.querySelector('.sl-master-model-controls').innerHTML=`<div class="sl-model-file"><span>${state.upload?`${e(state.filename)} · 저장 대기`:file?`<a href="${e(url)}" download title="모델 내려받기">${e(file['파일명'])}</a>`:'OBJ 미등록'}</span><label class="sl-button">${file||state.upload?'OBJ 교체':'OBJ 업로드'}<input type="file" accept=".obj" data-standard-upload aria-label="${e(row.elements.size.value)} 표지판 OBJ ${file||state.upload?'교체':'업로드'}" title="m 단위 · 최대 20MB"></label></div>`;
 }
 const modified=allRows(form).some(row=>changed(row,s));
 form.querySelector('[type=submit]').disabled=(!isNew&&!modified)||allRows(form).some(row=>row.dataset.connectionsPending==='true');
 const root=form.closest('#sign-library-screen');if(root)activate(root,s,active(form));
 return modified||isNew&&!!form.elements.new_name.value;
}
export function enable(row,s){row.dataset.enabled='true';row.querySelector('[data-master-size-body]').hidden=false;row.querySelector('.sl-master-model-controls').hidden=false;row.querySelector('[data-master-enable]').hidden=true;row.querySelector('[data-master-size-choice]').disabled=false;update(row,s);}
export function payload(row,s){
 row=active(row);const form=outer(row),v=values(row),geometry=rowGeometry(row,s),name=form.elements.name.value;
 const copied=form.dataset.copyName&&JSON.stringify(geometry)===form.dataset.copyGeometry;
 return {...positions.payload(row),name:name==='__new__'?form.elements.new_name.value.trim():name,display_name:form.elements.new_name.value.trim(),size:v.size,width:v.width,height:v.height,thickness:v.thickness,geometry,...(copied?{copy_name:form.dataset.copyName}:{}),...(draft(row).upload?{uploaded_model:draft(row).upload}:{})};
}
export function entries(form,s){return allRows(form).filter(row=>changed(row,s)).map(row=>payload(row,s));}
export function validation(form,s,onlyRow){
 const name=form.elements.new_name.value.trim(),key=form.elements.name.value;
 if(!name)return {message:'모양 이름을 입력하세요.',field:form.elements.new_name};
 if(name.length>60)return {message:'모양 이름은 60자 이내로 입력하세요.',field:form.elements.new_name};
 if(s.registrationOptions.some(o=>o.name!==key&&[o.name,o.displayName].includes(name)))return {message:'이미 등록된 모양 이름입니다. 다른 이름을 입력하세요.',field:form.elements.new_name};
 const rows=(onlyRow?[onlyRow]:allRows(form)).filter(row=>row.dataset.enabled!=='false'&&started(row));
 if(!rows.length)return {message:'소형·중형·대형 중 등록할 규격의 OBJ를 업로드하거나 폭·높이를 입력하세요.',field:allRows(form)[0]?.elements.width};
 const geometry=shape.fromForm(form,s.registrationOptions.find(o=>o.name===key));
 if(geometry.kind==='polygon'&&(!Number.isInteger(geometry.sides)||geometry.sides<3||geometry.sides>32))return {message:'모양의 꼭짓점 수를 3~32 사이의 정수로 입력하세요.',field:form.elements.geometry_sides};
 for(const row of rows){
  const size=row.elements.size.value;
  for(const [key,label] of [['width','폭'],['height','높이']]){
   const field=row.elements[key],value=Number(field.value);
   const subject=`${size}의 ${label}${key==='width'?'을':'를'}`;
   if(!field.value)return {message:`${subject} 입력하세요.`,field,row};
   if(!(value>0&&value<=20000))return {message:`${subject} 0보다 크고 20,000mm 이하로 입력하세요.`,field,row};
  }
  if(row.dataset.mode!=='edit'||positions.changed(row)){
   const changedKeys=new Set(positions.changes(row).map(item=>item.key));
   const position=positionIssue(positionValues(row).filter(item=>row.dataset.mode!=='edit'||changedKeys.has(item.key)),size);
   if(position)return {message:position.message,row,position};
  }
 }
 return null;
}
export function preview(result){
 return `<h3>${result.before?result.before.join(' × ')+' → ':''}${result.after.join(' × ')} mm</h3><p>함께 적용되는 규격: ${result.standards.map(r=>e(label(r.name)+' '+r.size)).join(', ')}</p><p>기존 조합 ${result.config_count}개 · 표지판 ${result.affected.length}개${result.generated_count?` · 추가 조합 ${result.generated_count}개`:''}</p>${result.affected.length?`<details><summary>적용 표지판 확인</summary><div class="sl-chips">${result.affected.map(r=>`<span title="${e(r.name)}">${e(r.code)}</span>`).join(' · ')}</div></details>`:''}${result.combination_ready===false?'<p>이 모양의 지주 적용 기준은 아직 없습니다. 판과 OBJ만 관리합니다.</p>':''}<p>판 규격과 OBJ를 함께 저장합니다.</p>`;
}
