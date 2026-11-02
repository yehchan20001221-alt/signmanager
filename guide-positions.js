/* 공용 설치 좌표 편집. 판 규격·OBJ는 유지하고 좌표 치수만 직접 편집한다. */
import {e} from './views.js';
import {previewQueue} from './guide-cad.js';
import {positionDrawing,hasCoordinates} from './guide-position-drawing.js';
import {positioned} from './guide-composition.js';
import {modelStatus} from './guide-posts.js';
import {mappedModel,texture,withoutPosts} from './guide-model-preview.js';
import {initial as initialCamera} from './model-camera.js';
import * as panelLayout from './guide-panel-layout-editor.js';
import {viewbar,partsTable,signSection,caption} from './guide-panel-view.js';
import {showMappingWarning} from './guide-mapping-warning.js';
let api,stop,observer,drawCurrent;
export const bind=request=>{api=request;};
export function clear(){stop?.();observer?.disconnect();drawCurrent=null;}
export function drawModel(){drawCurrent?.();}
export function syncControls(app,s){
 const d=s.guideStandardsUI.positionDraft,area=app.querySelector('.gi-installation');if(!d||!area)return;
 const blocked=!!positionIssue({'지주형식':d.post},s.guidePostCatalog||[],s.guidePostModels);
 for(const [name,disabled] of [['postRoad',d.postLocked],['postKind',d.postLocked||!d.postRoad],['post',d.postLocked||!d.postKind]]){
  const select=area.querySelector(`[name=${name}]`);if(select)select.disabled=disabled;
 }
 area.querySelector('[data-gi-delete]').disabled=!d.id||!!d.rules.length;
 const defaults=area.querySelector('[data-gi-default]');if(defaults)defaults.disabled=blocked;
 area.querySelector('.gi-form [type=submit]').disabled=blocked||!hasCoordinates(d);
 const note=area.querySelector('[data-gi-edit-note]');if(note)note.textContent=blocked?'지주 연결 후 설치 좌표를 편집할 수 있습니다.':'좌표 더블클릭 · m';
}
export function draft(spec,id,sourceKey){
 const item=spec.placements?.find(p=>p.id===id||(p.sourceId===id&&p.sourceSpec===sourceKey))||(!id?(spec.placements?.find(p=>p.sourceSpec===sourceKey)||spec.placements?.[0]):null);
 const defaultAxes=['X','Y','Z'].filter(k=>item?.[k]===''||item?.[k]==null);
 return {spec:item?.sourceSpec||spec.sources?.find(r=>r.key===sourceKey)?.key||spec.key,displaySpec:spec.key,selection:item?.id||'',id:item?.sourceId||item?.id||'',post:item?.['지주형식']||'',postLocked:!!(item?.['지주형식']&&item.rules.length),...Object.fromEntries(['X','Y','Z'].map(k=>[k,defaultAxes.includes(k)?'0':item[k]])),defaultAxes,rules:item?.rules||[],conditions:[...item?.conditions||[]]};
}
export const toMillimetres=v=>v===''||v==null?'':String(Math.round(Number(v)*1e6)/1000);
export const fromMillimetres=v=>v===''?'':String(Number(v)/1000);
export const appliedSigns=spec=>[...new Map((spec.members||[]).map(m=>[m.sign['안내표지ID'],m.sign])).values()];
function signRules(spec,id){return (spec.members||[]).filter(m=>m.sign['안내표지ID']===id).map(m=>m.rule['기준ID']);}
export function chooseSign(spec,state,id){
 const rules=signRules(spec,id),current=state.positionDraft;
 const p=spec.placements?.find(p=>p.id===(current?.selection||current?.id)&&p.rules.some(r=>rules.includes(r)))||spec.placements?.find(p=>p.rules.some(r=>rules.includes(r)));
 state.positionSign=id;
 if(p&&p.id!==(current?.selection||current?.id)){state.positionDraft=draft(spec,p.id);state.positionSelected=p.id;}
}
function selectedSign(spec,state){
 const signs=appliedSigns(spec),rules=state.positionDraft?.rules||[];
 const compatible=sign=>!rules.length||signRules(spec,sign['안내표지ID']).some(r=>rules.includes(r));
 const sign=signs.find(v=>v['안내표지ID']===state.positionSign&&compatible(v))||signs.find(compatible)||signs[0];
 state.positionSign=sign?.['안내표지ID']||'';return sign;
}
export function cancel(state,spec){
 state.positionDraft=draft(spec,state.positionSelected);state.positionChanged=false;
}
export function defaultCoordinates(spec,post,specs=[spec],id=''){
 const chosen=spec.placements?.find(p=>p.id===id&&p['지주형식']===post&&hasCoordinates(p));
 const coordinates=p=>Object.fromEntries(['X','Y','Z'].map(k=>[k,p[k]]));
 if(chosen)return coordinates(chosen);
 if(!post||!spec.form?.parts.length||spec.form.parts.some(p=>!(Number(p.B)>0&&Number(p.H)>0)))return null;
 const signature=row=>{
  const parts=positioned(row.form).parts,x=Math.min(...parts.map(p=>Number(p.x))),y=Math.min(...parts.map(p=>Number(p.y)));
  return JSON.stringify(parts.map(p=>[p.shape,Number(p.B),Number(p.H),Number(p.x)-x,Number(p.y)-y]).sort());
 };
 const key=signature(spec),values=new Map();
 for(const row of specs)if(row.form&&signature(row)===key)for(const p of row.placements||[]){
  if(p['지주형식']===post&&hasCoordinates(p))values.set(['X','Y','Z'].map(k=>Number(p[k])).join(','),coordinates(p));
 }
 return values.size===1?[...values.values()][0]:null;
}
export function positionIssue(p,posts,models){
 if(!p?.['지주형식'])return '지주 미연결';
 const post=posts.find(v=>v.key===p['지주형식']);if(!post)return '지주 형식 미연결';
 if(!post.models?.length)return '지주 OBJ 없음';
 if(models&&post.models.some(name=>!models.some(m=>m.name===name&&m.available)))return '지주 OBJ 없음';
 const status=modelStatus(post,models);return status.severity==='warning'?'':status.message;
}
const warning=(label,yellow=false)=>label?`<span class="gp-model-warning${yellow?' is-warning':''}" role="img" aria-label="${e(label)}" title="${e(label)}">!</span>`:'';
export function specWarning(spec,posts,models){
 const modelIssues=[...new Set((spec.sources||[spec]).flatMap(r=>[r.modelIssue,r.formIssue]).filter(Boolean))];
 if(modelIssues.length)return warning(modelIssues.join(' · '));
 const rows=spec.placements?.length?spec.placements:[{}];
 const errors=rows.map(p=>positionIssue(p,posts,models)).filter(Boolean);
 const warnings=rows.flatMap(p=>{
  if(positionIssue(p,posts,models))return [];
  const missing=['X','Y','Z'].filter(k=>p[k]===''||p[k]==null||!Number.isFinite(Number(p[k])));
  return [missing.length?`설치 좌표 미등록 (${missing.join('·')})`:''];
 }).filter(Boolean);
 return warning([...new Set([...errors,...warnings])].join(' · '),!errors.length);
}
const postLabel=(posts,key)=>{const p=posts.find(p=>p.key===key);return p?`${p.kind} · ${p.label}`:key||'지주 미연결';};
export function changePost(d,posts,name,value){
 if(d.postLocked)return;
 if(name==='postRoad'){
  d.postRoad=posts.some(p=>p.road===value)?value:'';d.postKind='';d.post='';
 }else if(name==='postKind'){
  d.postKind=posts.some(p=>p.road===d.postRoad&&p.kind===value)?value:'';d.post='';
 }else if(name==='post')d.post=posts.find(p=>p.key===value&&p.road===d.postRoad&&p.kind===d.postKind)?.key||'';
}
function postFields(d,posts){
 const select=(name,label,placeholder,items,disabled=false)=>`<select name="${name}" aria-label="${label}" required ${disabled?'disabled':''}><option value="">${placeholder}</option>${items.map(([key,text])=>`<option value="${e(key)}" ${key===d[name]?'selected':''}>${e(text)}</option>`).join('')}</select>`;
 const roads=[...new Set(posts.map(p=>p.road))],kinds=[...new Set(posts.filter(p=>p.road===d.postRoad).map(p=>p.kind))];
 return select('postRoad','도로 구분','도로 선택',roads.map(v=>[v,v]))+select('postKind','지주 종류','종류 선택',kinds.map(v=>[v,v]),!d.postRoad)+select('post','지주 형식','형식 선택',posts.filter(p=>p.road===d.postRoad&&p.kind===d.postKind).map(p=>[p.key,p.label]),!d.postKind);
}
function guidance(d,posts,models,error=''){
 if(error)return `${warning(error)}<span>${e(error)}</span>`;
 const issue=error||positionIssue({'지주형식':d.post},posts,models);
 if(issue){
  const post=posts.find(p=>p.key===d.post);
  return `${warning(issue)}<span><strong>${e(issue)}</strong> · ${post?'해당 형식에 맞는 지주 OBJ를 먼저 등록하세요.':'지주를 먼저 선택하세요.'}</span>${post?`<button type="button" class="sl-button" data-gs-key="post-model" data-gs-value="${e(d.post)}">지주 OBJ 등록</button>`:''}`;
 }
 if(d.defaultAxes?.length)return `<span>미등록 좌표 ${e(d.defaultAxes.join('·'))}는 기본값 0 m로 표시합니다. 별도로 지정하지 않고 저장하면 이 값으로 저장됩니다.</span>`;
 return hasCoordinates(d)?'':`<span>판의 설치 좌표를 입력하세요.</span><div>${['X','Y','Z'].map(k=>`<button type="button" class="sl-button" data-gi-axis="${k}" aria-label="설치 ${k} 입력">${k} ${e(d[k]===''?'입력':d[k])}</button>`).join('')}</div>`;
}
export function content(spec,state,posts,models,context={}){
 if(!spec)return '';
 const drawingKey=context.piece?.key||spec.key;
 if(state.drawingKey!==drawingKey){state.drawingKey=drawingKey;state.positionMode=state.privatePosition?'installation':'panels';state.positionView='front';}
 if((state.positionDraft?.displaySpec||state.positionDraft?.spec)!==spec.key)state.positionDraft=draft(spec,state.positionSelected,state.spec);
 const d=state.positionDraft,rows=spec.placements||[],sign=selectedSign(spec,state),view=state.positionView||'front',blocked=!!positionIssue({'지주형식':d.post},posts,models);
 const selectedPost=posts.find(p=>p.key===d.post);
 d.postRoad??=selectedPost?.road||'';d.postKind??=selectedPost?.kind||'';
 if(d.id)state.positionSelected=d.selection||d.id;
 const number=v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:3});
 const conditions=[...new Set((spec.members||[]).map(m=>m.rule['조건']).filter(c=>c&&c!=='기본값'))];
 const sources=spec.sources||[spec],currentSource=sources.find(r=>r.key===d.spec)||spec;
 const row=(p,index)=>{
  const codes=sources.length>1?[...new Set((spec.members||[]).filter(m=>p.rules.includes(m.rule['기준ID'])).map(m=>m.sign['표지번호']).filter(Boolean))].join(', '):'';
  const post=posts.find(post=>post.key===p['지주형식']),road=post?.road||p.road||currentSource.road;
  const active=p.id===(d.selection||d.id),details=[codes?`표지 ${codes}`:'',p.conditions?.join(' · ')||`배치 ${index+1}`].filter(Boolean).join(' · '),condition=[road,details].filter(Boolean).join(' · ');
  return `<tr class="gi-post-row ${active?'is-selected':''}" data-gi-row="${e(p.id)}"><td colspan="4">${active&&!d.postLocked?`<div class="gi-post-picker">${postFields(d,posts)}</div>`:`<button type="button" class="gi-post-summary" data-gi-select="${e(p.id)}" aria-label="${e(postLabel(posts,p['지주형식']))}" aria-pressed="${active}"><span>${e(road)}</span><span>${e(post?.kind||'—')}</span><span>${e(post?.label||p['지주형식']||'지주 미연결')}</span></button>`}</td></tr>
  <tr class="gi-coordinate-row ${active?'is-selected':''}"><td><div class="gi-condition-cell">${active&&!d.rules.length?`<input name="condition" aria-label="적용 조건" list="gi-condition-options" placeholder="적용 조건" maxlength="100" required value="${e(d.conditions.join(' · '))}">`:`<span class="gi-condition-text" title="${e(condition)}">${e(details)}</span>`}<span ${active?'data-gi-row-warning':''}>${specWarning({placements:[p]},posts,models)}</span></div></td>${['X','Y','Z'].map(axis=>`<td>${active?`<label class="gi-axis-input"><span>${axis}</span><input name="${axis}" aria-label="설치 ${axis} (mm)" type="number" step="any" required value="${e(toMillimetres(d[axis]))}"></label>`:`<button type="button" class="gi-cell-value" data-gi-edit="${e(p.id)}" data-gi-coordinate="${axis}" aria-label="${e(postLabel(posts,p['지주형식']))} ${e(condition)} ${axis} 수정"><span class="gi-axis">${axis}</span><span>${p[axis]===''||p[axis]==null?'입력':e(number(toMillimetres(p[axis])))}</span></button>`}</td>`).join('')}</tr>`;
 };
 const parts=context.piece?[{...context.piece,name:context.piece.variant}]:spec.form?.parts||[];
 const signs=appliedSigns(spec),signCards=signs.map(r=>`<button type="button" data-gi-sign="${e(r['안내표지ID'])}" aria-pressed="${r['안내표지ID']===state.positionSign}" aria-label="${e(r['표지번호']+' '+r['명칭'])}"><img src="${r.registered?`/api/guides/${encodeURIComponent(r['안내표지ID'])}/image`:`/static/images/guide-registration/${encodeURIComponent(r['도안']||'')}`}" alt="" loading="lazy"><span>${e(r['표지번호'])}</span></button>`).join('');
 return `<section class="gi-installation gi-workspace" aria-label="지주별 설치 위치">
 <header class="gi-heading"><strong>${e(context.piece?.B||spec.B||'—')} × ${e(context.piece?.H||spec.H||'—')} <small>mm</small></strong><span>${parts.length}장${!currentSource.model?` <button type="button" class="sl-button" data-gs-action="edit" aria-label="판 치수 수정">치수 수정</button>`:''}</span></header>
 <div class="gi-columns"><section class="gi-preview">${viewbar(view,postLabel(posts,d.post),'data-gi-view',state.privatePosition?'':state.positionMode||'panels')}<div class="gi-model" data-gi-model><p class="sl-empty">모델을 불러오는 중…</p></div>${caption(sign?{code:sign['표지번호'],name:sign['명칭']}:null)}<div class="gi-message" data-gi-message role="status">${guidance(d,posts,models)}</div></section>
 <aside class="gi-details">${context.piece||state.privatePosition?'':partsTable(parts,true)}${context.signSection||signSection(signs.length,signCards)}
 <form class="gi-form" aria-label="공용 설치 위치"><header><h3>지주 · 설치위치 <small>mm</small></h3><button type="button" class="sl-button" data-gi-new aria-label="설치 위치 추가">+ 추가</button></header>
 <datalist id="gi-condition-options">${conditions.map(c=>`<option value="${e(c)}">`).join('')}</datalist><table class="gi-position-table"><colgroup><col class="gi-condition-column"><col><col><col></colgroup><tbody>${rows.map(row).join('')}${!d.id?row({id:'',지주형식:d.post,conditions:d.conditions,rules:[],X:d.X,Y:d.Y,Z:d.Z},rows.length):''}</tbody></table>
 <footer><span class="sl-sub">${d.rules.length?`연결된 ${d.rules.length}개 설치 조건`:''}</span><div><button type="button" class="sl-button" data-gi-delete ${!d.id||d.rules.length?'disabled':''}>삭제</button><button type="button" class="sl-button" data-gi-cancel>취소</button><button type="submit" class="sl-button sl-primary" ${blocked||!hasCoordinates(d)?'disabled':''}>저장</button></div></footer></form>
 </aside></div></section>`;
}
export function mount(app,s,spec,posts,afterRemount,context={}){
 clear();const area=app.querySelector('.gi-installation');if(!area||!api||!spec)return;
 const state=s.guideStandardsUI,models=s.guidePostModels,target=area.querySelector('[data-gi-model]'),message=area.querySelector('[data-gi-message]');
 const sign=selectedSign(spec,state);
 const rule=spec.members?.find(m=>m.sign['안내표지ID']===sign?.['안내표지ID']&&state.positionDraft.rules.includes(m.rule['기준ID']))?.rule;
 const sourceModel=rule?.['판OBJ']||sign?.['판OBJ']||spec.model;
 const common=(spec.sources||[spec]).find(p=>p.saved&&p.form?.model&&!p.ruleIds.length);
 const needsLayout=!state.privatePosition&&!!(sourceModel&&((sign?.registered&&rule)||common));
 let cadReady=!sign;
 let model,frame,layout,textures=[],cad=null,cadError='',previewError='',timer,alive=true;
 const issue=()=>positionIssue({'지주형식':state.positionDraft.post},posts,models);
 const showMessage=()=>{message.innerHTML=(state.positionMode||'panels')==='panels'?e(cadError||previewError):guidance(state.positionDraft,posts,models,previewError||cadError);message.classList.toggle('is-warning',!previewError&&!issue());};
 const sync=()=>{
  const d=state.positionDraft,blocked=!!issue();
  const displayed={...d,지주형식:d.post};
  for(const axis of d.defaultAxes)displayed[axis]='';
  area.querySelector('[data-gi-row-warning]').innerHTML=specWarning({placements:[displayed]},posts,models);
  area.querySelector('.gi-form [type=submit]').disabled=blocked||!hasCoordinates(d)||!!previewError;
  area.querySelector('[data-gi-delete]').disabled=!d.id||!!d.rules.length;
  layout?.sync();
  area.querySelectorAll('[data-gi-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.giView===(state.positionView||'front'))));
  area.querySelectorAll('[data-gi-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.giMode===(state.positionMode||'panels'))));
 };
 const draw=()=>{
  showMappingWarning(area,model?.mapping_error||'');
  if(!model?.available||!target.isConnected)return;
  const box=target.getBoundingClientRect(),view=state.positionView||'front';
  const mode=state.positionMode||'panels',painted=mappedModel(model,textures,true);
  const entry=document.activeElement?.matches('.gpa-inline')&&target.contains(document.activeElement)?document.activeElement:null;
  const start=entry?.selectionStart,end=entry?.selectionEnd;
  const displayed={...(layout?.draft&&context.piece?{...layout,draft:layout.preview(),selected:0}:layout),mode};
  target.innerHTML=positionDrawing(mode==='panels'?withoutPosts(painted):painted,issue()||previewError?{}:state.positionDraft,s.guidePositionCamera||undefined,[0,0,box.width,box.height],frame,[view],displayed);
  if(entry){const next=target.querySelector(`[data-gpa-gap="${entry.dataset.gpaGap}"]`);if(next){next.replaceWith(entry);entry.focus({preventScroll:true});entry.setSelectionRange(start,end);}}
 };drawCurrent=draw;
 area.addEventListener('guide-assets-editor-open',draw);
 area.addEventListener('guide-assets-preview',ev=>{model=ev.detail;frame=null;draw();});
 const queue=previewQueue(value=>layout?.draft?api('/api/guide-assets/preview',{...value,configuration:layout.preview()}):api('/api/guide-position-preview',value),value=>{
  model=value;previewError=value.warningSeverity==='warning'?'':value.warning||'';frame??=model.vertices;sync();showMessage();draw();
 },err=>{previewError=err.message;model=null;target.innerHTML=`<p class="sl-empty" role="alert">${e(err.message)}</p>`;sync();showMessage();});
 const update=()=>{
  clearTimeout(timer);queue.invalidate();previewError='';sync();showMessage();
  // 분리된 판·치수·도안을 모두 준비한 뒤 첫 프레임을 그린다.
  if(!cadReady||(needsLayout&&!layout?.draft))return;
  const d=state.positionDraft,sign=selectedSign(spec,state);
  const rule=spec.members?.find(m=>m.sign['안내표지ID']===sign?.['안내표지ID']&&d.rules?.includes(m.rule['기준ID']))?.rule;
  const value={...d,...(rule?.['판OBJ']||sign?.['판OBJ']?{model:rule?.['판OBJ']||sign['판OBJ']}:{}),...(issue()?{post:'',X:0,Y:0,Z:0}:{}),...(cad?.available?{block:cad.block,cad:sign?.['CAD파일']||''}:{})};
  timer=setTimeout(()=>queue.update(value),120);
 };
 observer=new window.ResizeObserver(draw);observer.observe(target);
 stop=()=>{alive=false;clearTimeout(timer);queue.stop();};
 const changeView=view=>{state.positionView=view;s.guidePositionCamera={...initialCamera(),yaw:view==='front'?0:view==='plan'?0:-.18,pitch:view==='plan'?-Math.PI/2:view==='front'?0:-.05};sync();showMessage();draw();};
 const remount=(axis='')=>{area.outerHTML=content(spec,state,posts,models,context);mount(app,s,spec,posts,afterRemount,context);afterRemount?.();if(axis)app.querySelector(`.gi-form [name="${axis}"]`)?.focus();};
 const discard=()=>!(state.positionChanged||area.dataset.layoutChanged==='true')||window.confirm('저장하지 않은 판 배치·설치위치 변경을 취소할까요?');
 area.addEventListener('focusin',ev=>{
  if(['X','Y','Z'].includes(ev.target.name)){state.positionMode='installation';changeView(ev.target.name==='Y'?'plan':'front');}
  if(ev.target.matches('[data-gpa-piece],.gpa-inline')&&(state.positionMode!=='panels'||state.positionView!=='front')){state.positionMode='panels';changeView('front');}
 });
 area.addEventListener('keydown',ev=>{if(ev.target.matches('[data-gi-axis]')&&['Enter',' '].includes(ev.key)){ev.preventDefault();area.querySelector(`[name="${ev.target.dataset.giAxis}"]`)?.focus();}});
 area.addEventListener('input',ev=>{
  const d=state.positionDraft;
  if(['X','Y','Z'].includes(ev.target.name)){state.positionChanged=true;d[ev.target.name]=fromMillimetres(ev.target.value);d.defaultAxes=d.defaultAxes.filter(k=>k!==ev.target.name);update();}
  if(ev.target.name==='condition'){state.positionChanged=true;d.conditions=ev.target.value.split('·').map(v=>v.trim()).filter(Boolean);layout?.sync();}
 });
 area.addEventListener('change',ev=>{if(['postRoad','postKind','post'].includes(ev.target.name)){
  state.positionChanged=true;const d=state.positionDraft;changePost(d,posts,ev.target.name,ev.target.value);
  if(ev.target.name!=='post'){
   const fields=document.createElement('div');fields.innerHTML=postFields(d,posts);
   // 현재 입력은 유지해야 상위 폼의 변경 감지가 끊기지 않는다.
   for(const name of ['postKind','post'])if(name!==ev.target.name)area.querySelector(`[name=${name}]`).replaceWith(fields.querySelector(`[name=${name}]`));
   area.querySelector(`[name=${ev.target.name==='postRoad'?'postKind':'post'}]`)?.focus();
  }
  const sources=spec.sources||[spec];
  const source=sources.find(r=>r.key===d.spec)||spec;
  const coordinates=defaultCoordinates(source,d.post,s.guidePanelSpecs||[source]);
  if(coordinates){Object.assign(d,coordinates);d.defaultAxes=[];}
  frame=null;area.querySelector('[data-gi-caption]').textContent=postLabel(posts,d.post);
  area.querySelectorAll('input[name=X],input[name=Y],input[name=Z]').forEach(input=>{input.value=toMillimetres(d[input.name]);});update();
 }});
 area.addEventListener('click',ev=>{
  const mode=ev.target.closest('[data-gi-mode]');if(mode){state.positionMode=mode.dataset.giMode;changeView('front');return;}
  const view=ev.target.closest('[data-gi-view]');if(view){changeView(view.dataset.giView);return;}
  const axis=ev.target.closest('[data-gi-axis]');if(axis){area.querySelector(`[name="${axis.dataset.giAxis}"]`)?.focus();return;}
  const selected=ev.target.closest('[data-gi-select]'),add=ev.target.closest('[data-gi-new]'),edit=ev.target.closest('[data-gi-edit]'),sign=ev.target.closest('[data-gi-sign]');
  if(!selected&&!add&&!edit&&!sign)return;
  if(sign){
   if(sign.dataset.giSign===state.positionSign)return;
   const next={...state};chooseSign(spec,next,sign.dataset.giSign);
   if((next.positionDraft!==state.positionDraft||layout?.changed||area.querySelector('[data-guide-asset-editor][data-changed=true]'))&&!discard())return;
   if(next.positionDraft!==state.positionDraft)next.positionChanged=false;
   Object.assign(state,next);s.guidePositionCamera=null;remount();return;
  }
  if(!discard())return;
  state.positionChanged=false;state.positionDraft=draft(spec,add?'new':selected?.dataset.giSelect||edit.dataset.giEdit,state.positionDraft?.spec||state.spec);s.guidePositionCamera=null;
  remount(edit?.dataset.giCoordinate);
 });
 if(needsLayout){
  layout=panelLayout.mount(area,api,{commonId:!sign&&common?.key,shape:spec.form?.parts[0]?.shape,sign:sign?.['안내표지ID'],rules:sign?spec.members.filter(m=>m.sign['안내표지ID']===sign['안내표지ID']&&state.positionDraft.rules.includes(m.rule['기준ID'])).map(m=>m.rule['기준ID']):[],piece:context.piece,position:()=>state.positionChanged?window.structuredClone(state.positionDraft):null,valid:()=>!state.positionChanged||(!issue()&&hasCoordinates(state.positionDraft)&&!previewError),
   value:{model:sourceModel,block:sign?(sign['CAD블록명']||'CMRG'+sign['표지번호']):'',cad:sign?.['CAD파일']||''}},changed=>{
    if(changed){frame=null;update();}else draw();
   });
 }
 if(sign){
  const request=sign.registered?api('/api/guides/cad-preview',{id:sign['안내표지ID'],values:{}}):api('/api/guide-registration/preview',{road:sign['도로구분']||spec.road,code:sign['표지번호'],block:sign['CAD블록명']||'CMRG'+sign['표지번호'],cad:sign['CAD파일']||'',values:{}});
  request.then(async result=>{
   if(!alive)return;cad=result;
   if(result.available){
    const images=await Promise.all((result.textures||[]).map(texture));
    if(result.texture_sheet)images[-1]=await texture(result.texture_sheet);
    if(!alive)return;textures=images;
   }else cadError='CAD 도안 미연결';
   cadReady=true;update();
  }).catch(err=>{if(alive){cadError=err.message;cadReady=true;update();}});
 }
 update();
}



