/* 안내표지 원문 도안과 차로별 기준. 프로젝트의 지명·STA 입력값과 DB 정의를 구분한다. */
import {e} from './views.js';
import * as assetEditor from './guide-sign-panels.js';
import * as detailResize from './detail-resize.js';
import * as cad from './guide-cad.js';
import * as modelPreview from './guide-model-preview.js';
import * as registration from './guide-registration.js';
import * as panelLayout from './guide-panel.js';
import * as cadUpload from './guide-cad-upload.js';
import * as postLinks from './guide-post-links.js';
import * as positions from './guide-sign-position.js';

const imageUrl=r=>`/api/guides/${encodeURIComponent(r['안내표지ID'])}/image`;
let modelEvents;
export function records(s){
 const q=s.search.trim().toLowerCase();
 return (s.tables.guidesigns||[]).filter(r=>(!s.guideRoad||r['도로구분']===s.guideRoad)&&(!s.guideFilter||r['분류']===s.guideFilter)&&`${r['표지번호']} ${r['명칭']}`.toLowerCase().includes(q));
}
export function toolbar(s){
 const rows=s.tables?.guidesigns||[],roads=[...new Set(rows.map(r=>r['도로구분']))],categories=[...new Set(rows.filter(r=>!s.guideRoad||r['도로구분']===s.guideRoad).map(r=>r['분류']))];
 return `<div class="sl-toolbar"><select class="sl-input sl-road-select" data-guide-road aria-label="안내표지 도로 구분">${['',...roads].map(v=>`<option value="${e(v)}" ${(s.guideRoad||'')===v?'selected':''}>${e(v||'전체 도로')}</option>`).join('')}</select><div class="sl-filters" aria-label="안내표지 분류">${['',...categories].map(v=>`<button type="button" class="sl-filter" data-guide-filter="${e(v)}" aria-pressed="${(s.guideFilter||'')===v}">${e(v||'전체')}</button>`).join('')}</div><button type="button" class="sl-button" data-section="guide-standards">공통 데이터</button><input class="sl-search" type="search" aria-label="표지번호 또는 이름 검색" placeholder="표지번호 또는 이름 검색" value="${e(s.search)}"><button type="button" class="sl-button sl-primary" data-guide-new>안내표지 신규등록</button></div>`;
}
export function list(s){
 return records(s).map(r=>{
  const issue=s.guideIssues?.[r['안내표지ID']],message=issue?.messages.join(' · ');
  return `<button type="button" data-guide="${e(r['안내표지ID'])}" aria-label="${e(r['표지번호']+' '+r['명칭'])}" aria-pressed="${s.guideSelected===r['안내표지ID']}"><img src="${imageUrl(r)}" alt="" loading="lazy"><span><span>${e(r['명칭'])}</span><b>${e(r['표지번호'])}${message?` <span class="gp-model-warning${issue.severity==='warning'?' is-warning':''}" role="img" aria-label="${e(message)}" title="${e(message)}">!</span>`:''}</b></span></button>`;
 }).join('')||'<p class="sl-empty">검색 결과가 없습니다.</p>';
}
function editable(field,value,label,extra={},display=value){
 return `<button type="button" class="sl-guide-value" data-guide-edit="${e(JSON.stringify({field,value,...extra}))}" aria-label="${e(label)}, 더블클릭 또는 Enter로 수정" title="더블클릭 또는 Enter로 수정">${e(display===''?'—':display)}</button>`;
}
function postLabel(s,key){const p=s.tables.guideposts.find(r=>r['지주형식']===key);return p?`${p['지주종류']} · ${p['형식']}`:key||'—';}
// 원본의 기본 행은 차로별 조건이 없을 때만 사용한다. 원본 데이터는 삭제하지 않는다.
export function conditionRules(rules){
 const named=rules.filter(r=>r['조건']!=='기본값');
 return named.length?named:rules;
}
export function detail(s){
 const d=s.tables.guidesigns.find(r=>r['안내표지ID']===s.guideSelected);
 if(!d)return '<p class="sl-empty">안내표지를 선택하세요.</p>';
 const basics=[['도로 구분','도로구분'],['표지번호','표지번호'],['표지 이름','명칭'],['분류','분류']].map(([label,key])=>panelLayout.field(label,editable(key,d[key]||'',label))).join('');
 const model=panelLayout.modelSection(`<span data-guide-current-model>규격</span><span data-guide-model-sizes role="status"></span>`,'<p class="sl-sub">규격을 불러오는 중…</p>');
 const block=editable('CAD블록명',d['CAD블록명']||'','CAD 블록명').replace('<button ','<button data-guide-cad-block '),layer=editable('레이어변수',d['레이어변수']||'','CAD 레이어 변수');
 const rules=(s.tables.guiderules||[]).filter(r=>r['안내표지ID']===s.guideSelected);
 const first=rules.find(r=>r['조건']!=='기본값'),same=r=>first&&['판OBJ','지주형식','X','Y','Z'].every(k=>r[k]===first[k]);
 const duplicate=rules.filter(r=>r['조건']==='기본값'&&same(r));
 const placement=conditionRules(rules).map(r=>{
  const ids=[r['기준ID'],...(r===first?duplicate.map(p=>p['기준ID']):[])];
  return `<div class="gg-post-row" data-gsp-rule="${e(r['기준ID'])}"><span class="sl-sub">${r['출처']==='작업자 등록'?editable('조건',r['조건'],'적용 조건',{rules:[r['기준ID']],model:r['판OBJ']||d['판OBJ']}):e(r['조건']==='기본값'?'공통':r['조건'])}</span>${editable('연결지주',r['지주형식'],'지주 형식',{rules:ids},postLabel(s,r['지주형식']))}${positions.fields(r,r['조건']==='기본값'?'공통':r['조건'],!r['지주형식'],(s.guidePostCatalog||[]).find(p=>p.key===r['지주형식']))}${`<button type="button" class="gg-post-remove" data-guide-post-remove="${e(r['기준ID'])}" aria-label="지주 연결 삭제" title="이 표지에서 지주 연결 삭제">×</button>`}</div>`;
 }).join('')||'<p class="sl-sub">모델을 연결하면 지주를 선택할 수 있습니다.</p>';
 return panelLayout.header(false)+panelLayout.body(basics,model,block,layer,placement);
}
async function mountCadFile(panel,s,api){
 const sign=s.tables.guidesigns.find(r=>r['안내표지ID']===s.guideSelected);
 const signal=modelEvents.signal;let asset=null;
 try{
  asset=sign['CAD파일']?await api('/api/guide-cad-file?key='+encodeURIComponent(sign['CAD파일'])):null;
 }catch(err){if(!signal.aborted){const error=panel.querySelector('.sl-error');error.textContent=err.message;error.hidden=false;}}
 if(signal.aborted||!panel.isConnected)return;
 const choose=(file,block)=>{if(block)panel.dispatchEvent(new window.CustomEvent('guide-model-replace',{bubbles:true,detail:{id:sign['안내표지ID'],field:'CAD파일',value:file.key,block}}));};
 cadUpload.mount(panel,api,asset,sign['CAD블록명']||s.guideCadPreview?.block||'',choose);
}
export function drawList(app,s){app.querySelector('.sl-guide-list').innerHTML=list(s);}
export function drawDetail(app,s,api){
 modelEvents?.abort();modelEvents=new window.AbortController();
 const work=app.querySelector('.sl-work'),panel=work.querySelector('.sl-guide-detail');cad.clear();registration.clear();modelPreview.clear();s.guideModel=null;s.guideTextures=[];s.guideTextureMessage='';
 panel.hidden=!s.guideSelected&&!s.guideNew;work.classList.toggle('sl-open',!!s.guideSelected||!!s.guideNew);panel.classList.toggle('sl-guide-new-panel',!!s.guideNew);
 panel.innerHTML=s.guideNew?registration.shell():s.guideSelected?detail(s):'';detailResize.mount(work);
 if(s.guideNew&&api)registration.mount(panel,s,api);
 else if(s.guideSelected&&api){mountCadFile(panel,s,api);modelPreview.mount(panel,s);s.guideHidePost=false;s.guideSignCamera=null;cad.load(app,s,api,result=>{modelPreview.update(app,s,result);panel.dispatchEvent(new window.CustomEvent('guide-cad-preview'));},tag=>modelPreview.highlight(app,s,tag));
  const sign=s.tables.guidesigns.find(r=>r['안내표지ID']===s.guideSelected),rules=s.tables.guiderules.filter(r=>r['안내표지ID']===s.guideSelected);
  const conditions=conditionRules(rules);
  postLinks.mount(panel,s,conditions,modelEvents.signal);
  let positionEditor,panelEditor;
  panelEditor=assetEditor.mount(panel,s,api,{current:s.guideModelRule,conditions:postLinks.conditionChoices(conditions,s.tables.guideposts),source:id=>{
   const rule=rules.find(r=>r['기준ID']===id)||rules[0],spec=s.guidePanelSpecs.find(p=>p.ruleIds.includes(rule?.['기준ID']));
   return {plateGroup:s.guidePlateGroups?.[rule?.['기준ID']],model:rule?.['판OBJ']||sign['판OBJ']||spec?.model,road:sign['도로구분'],block:sign['CAD블록명']||s.guideCadPreview?.block||'CMRG'+sign['표지번호'],cad:sign['CAD파일']||'',post:rule?.['지주형식']||'',...Object.fromEntries(['X','Y','Z'].map(k=>[k,positionEditor?.source(rule?.['기준ID'])?.[k]??rule?.[k]??'0']))};
  },apply:(configuration,id)=>{const selected=rules.find(r=>r['기준ID']===id);const ids=rules.filter(r=>r===selected||(r['조건']==='기본값'&&r['지주형식']===selected?.['지주형식']&&['판OBJ','X','Y','Z'].every(k=>r[k]===selected[k]))).map(r=>r['기준ID']);return positionEditor.save({rules:ids,configuration});},cancel:()=>drawDetail(app,s,api)});
  positionEditor=positions.mount(panel,s,api,rules,()=>panelEditor,modelEvents.signal);
 }
}
export function mount(app,s,api){
 if(!s.tables.guidesigns?.length){app.querySelector('.sl-work').innerHTML='<p class="sl-empty">연결된 안내표지 자료가 없습니다.</p>';return;}
 if(!s.tables.guidesigns.some(r=>r['안내표지ID']===s.guideSelected)){s.guideSelected='';s.guidePart=-1;}
 const work=app.querySelector('.sl-work');work.classList.add('sl-guide-work');
 work.innerHTML='<div class="sl-library"><nav class="sl-guide-list" aria-label="안내표지 목록"></nav></div><section class="sl-panel sl-guide-detail" aria-label="안내표지 상세"></section>';
 drawList(app,s);drawDetail(app,s,api);
}
export function edit(target,app,s){
 const data=JSON.parse(target.dataset.guideEdit);
 const sign=s.tables.guidesigns.find(r=>r['안내표지ID']===s.guideSelected),road=sign?.['도로구분'];
 let input=data.field==='CAD블록명'?`<input name="value" aria-label="CAD 블록 수정" value="${e(data.value==='-'?'':data.value)}" maxlength="250" spellcheck="false">`:['지주형식','연결지주'].includes(data.field)?`<select name="value" aria-label="지주형식"><option value="">미지정</option>${s.tables.guideposts.filter(p=>p['삭제여부']!=='삭제'&&(p['도로구분']||(p['지주형식'].startsWith('GR_')?'일반도로':'고속도로'))===road).map(p=>`<option value="${e(p['지주형식'])}" ${p['지주형식']===data.value?'selected':''}>${e(postLabel(s,p['지주형식']))}</option>`).join('')}</select>`:`<input name="value" aria-label="${e(data.field)} 수정" value="${e(data.value)}" maxlength="250" ${['명칭','name','variable'].includes(data.field)?'required':''}>`;
 if(data.field==='분류')input=`<select name="value" aria-label="분류">${panelLayout.categories[road].map(v=>panelLayout.option(v,v,data.value)).join('')}</select>`;
 if(data.field==='조건')input=`<select name="value" aria-label="적용 조건">${[...new Set([...postLinks.laneConditions(road),data.value])].map(v=>panelLayout.option(v,v,data.value)).join('')}</select>`;
 const actions='<button type="submit" aria-label="변경 저장">✓</button><button type="button" data-guide-cancel aria-label="수정 취소">×</button>';
 if(data.field==='도로구분'){
  const fields=panelLayout.field('도로 구분',`<select name="value" aria-label="도로 구분">${Object.keys(panelLayout.categories).map(v=>panelLayout.option(v,v,data.value)).join('')}</select>`)+panelLayout.field('표지번호',e(sign['표지번호']))+panelLayout.field('표지 이름',e(sign['명칭']))+panelLayout.field('분류',`<select name="category" aria-label="분류">${panelLayout.categories[road].map(v=>panelLayout.option(v,v,sign['분류'])).join('')}</select>${actions}`);
  target.closest('.gg-basics').innerHTML=`<form class="sl-guide-editor sl-guide-road-editor" data-guide-payload="${e(JSON.stringify(data))}">${fields}<small class="gg-road-note">도로를 변경하면 지주를 다시 선택해야 합니다.</small></form>`;
 }else target.outerHTML=`<form class="sl-guide-editor ${data.field==='조건'?'sl-condition-editor':''}" data-guide-payload="${e(JSON.stringify(data))}">${input}${actions}</form>`;
 const field=app.querySelector('.sl-guide-editor [name=value]');field.focus();field.select?.();if(data.field==='도로구분')field.addEventListener('change',()=>{field.form.elements.category.innerHTML=panelLayout.categories[field.value].map(v=>panelLayout.option(v,v,'')).join('');});
}
export function payload(form,s){const data=JSON.parse(form.dataset.guidePayload);return {...data,id:data.id||s.guideSelected,value:new FormData(form).get('value'),...(form.elements.category?{category:form.elements.category.value}:{})};}
