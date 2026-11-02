/* 지주 목록·상세·편집. 수량과 파일은 기존 지주 ID를 사용하며 형식과 모델 이름을 구분한다. */
import {e,supportSize,diagram} from './views.js';
import {supportFormKey,supportRoad,supportNumber,supportLabel,combinationDiagram} from './catalog-supports.js';
import {quantityView} from './catalog-quantities.js';
import {newForm,initialQuantities,formSummary} from './support-registration.js';
import * as placement from './placement.js';
import {page,tabs as pageTabs} from './panel-pages.js';
import {tool} from './model-workspace.js';
import {inlineTable} from './quantity-editor.js';
import {supportsPlan} from './standard-installation.js';

const button=(label,action,primary=false)=>`<button type="button" class="sl-button${primary?' sl-primary':''}" data-action="${action}">${label}</button>`;
const labels={형식:'지주 종류',기준형식:'형식',단면규격:'지주사이즈'};
export function modelNames(t,id){
 const ids=new Set((t.filelinks||[]).filter(l=>l['대상종류']==='지주기초'&&l['대상ID']===id).map(l=>l['파일ID']));
 return [...new Set((t.files||[]).filter(f=>ids.has(f['파일ID'])&&/\.obj$/i.test(f['파일명'])).map(f=>f['파일명']))];
}
export const traffic=p=>!!supportNumber(p)||/^(HW|GR)_Attached_TS$/.test(supportFormKey(p));
function matching(s){
 const term=(s.search||'').trim().toLowerCase();
 const rows=s.tables.supports.filter(p=>(s.section==='supports'||supportRoad(p)===(s.postRoad||'고속도로'))&&(s.section==='supports'?traffic(p):(s.postScope==='all'||traffic(p)))&&`${p['회사모델코드']} ${modelNames(s.tables,p['지주기초ID']).join(' ')} ${p['형식']} ${supportLabel(p)} ${supportSize(p)}`.toLowerCase().includes(term))
  .sort((a,b)=>Number(supportRoad(a)==='일반도로')-Number(supportRoad(b)==='일반도로')||(supportNumber(a)||99)-(supportNumber(b)||99)||a['회사모델코드'].localeCompare(b['회사모델코드'],'ko',{numeric:true}));
 return rows;
}
export function records(s){
 return matching(s).filter(p=>s.section!=='installation'||p['형식']!=='부착식');
}
export function managementTitle(_s,p){return formName(p);}
export function toolbar(s){
 return `<div class="sl-toolbar sl-support-toolbar"><input class="sl-search" type="search" aria-label="지주 모델 검색" placeholder="모델 이름 · 형식 · 제원 검색" value="${e(s.search)}"></div>`;
}
export function grid(s,rows=records(s)){
 if(s.section==='quantities')return `<div class="sl-management-list">${rows.map(p=>`<button type="button" data-post="${e(p['지주기초ID'])}"><strong>${e(formName(p))}</strong><span>${e(supportSize(p))}</span><span aria-hidden="true">→</span></button>`).join('')||'<p class="sl-empty">등록된 지주가 없습니다.</p>'}</div>`;
 return rows.map(p=>{
  const definition=s.supportForms?.find(f=>f.key===supportFormKey(p));
  const count=definition&&s.combinationOptions?s.combinationOptions.filter(r=>definition.sizes.includes(r.size)&&(definition.patterns||[[1,0]]).some(p=>p.join(':')===r.pattern.join(':'))&&supportsPlan(r,definition.key,s.registrationOptions)&&(!definition.shapeFilter||(r.panels[0].shape==='삼각'||r.panels[0].shape==='역삼각')===(definition.shapeFilter==='triangle'))).length:new Set([...s.tables.configs,...(s.tables.overrides||[])].filter(c=>c['지주기초ID']===p['지주기초ID']&&c.active!==false).map(c=>c['구성ID'])).size;
  const c=s.tables.configs.find(c=>c['지주기초ID']===p['지주기초ID']&&c.active!==false);
  const slots=(s.tables.slots||[]).filter(slot=>slot['구성ID']===c?.['구성ID']).map(slot=>({...slot,panel:s.tables.panels.find(x=>x['판ID']===slot['판ID'])}));
  const icon=['단주식','내민식','부착식'].includes(p['형식'])?combinationDiagram({slots},p['형식']):diagram({support:p,slots:[]});
  return `<button type="button" class="sl-post-card" data-post="${e(p['지주기초ID'])}" aria-pressed="${s.selected===p['지주기초ID']}" aria-label="${e(formName(p))} ${e(supportSize(p))}"><span class="sl-post-icon">${icon}</span><span class="sl-post-kind">${traffic(p)&&supportNumber(p)?e(p['형식']):e(supportRoad(p))}</span><strong class="sl-post-number">${e(traffic(p)?supportLabel(p):p['형식'])}</strong><span class="sl-post-size">${e(supportSize(p))}</span><span class="sl-sub">${count?`조합 ${count}가지`:'조합 연결 없음'}</span></button>`;
 }).join('')||'<p class="sl-empty">해당하는 지주가 없습니다.</p>';
}
const tabs=()=>'';
const section=(s,key,html)=>`<section data-post-section="${key}" ${(s.postTab||'info')!==key?'hidden':''}>${html}</section>`;
const formName=p=>traffic(p)?(supportNumber(p)?`${p['형식']} · ${supportLabel(p)}`:'부착식'):p['형식']||'번호 없음';
export function related(s,editing=false){
 if(s.section==='quantities')return `<div class="sl-quantity-content">${quantityView(s,true)}</div>`;
 return section(s,'quantities',`<div class="sl-quantity-content">${quantityView(s,editing)}</div>`);
}
export function view(s){
 const p=s.detail.support;
 if(s.section==='quantities')return `<div class="sl-panel-head"><h2>${e(formName(p))} · 단위수량</h2>${button('목록','close')}</div><div class="sl-body sl-related"><div class="sl-quantity-content">${quantityView(s,true)}</div></div>`;
 const fields=Object.entries(labels).map(([key,label])=>`<dt>${label}</dt><dd>${e(key==='기준형식'?formName(p):p[key]===''||p[key]==null?'미등록':p[key])}</dd>`).join('');
 const names=[...new Set(s.detail.files.filter(l=>l['대상종류']==='지주기초'&&l['대상ID']===p['지주기초ID']&&/\.obj$/i.test(l.file['파일명'])).map(l=>l.file['파일명']))];
 const info=`<dl class="sl-dl sl-post-info">${fields}<dt>지주 OBJ</dt><dd>${names.map(e).join('<br>')||'미등록'}</dd></dl>${formSummary(s,supportFormKey(p))}`;
 return `<div class="sl-panel-head"><h2>지주·기초 정보</h2><div class="sl-actions">${button('수정','edit')}${button('닫기','close')}</div></div><div class="sl-body"><div class="sl-post-title"><strong>${e(formName(p))}</strong><span class="sl-sub">${e(supportSize(p))}</span></div>${tabs(s)}${section(s,'info',info)}<div class="sl-related">${related(s)}</div>${section(s,'installation',placement.readOnly(s.detail.placement))}</div>`;
}
export function formFields(values){return Object.fromEntries(Object.keys(labels).filter(k=>Object.hasOwn(values,k)).map(k=>[k,values[k]||'']));}
export function form(s){
 const isNew=s.screen==='new',p=isNew&&!s.copyId?{}:s.detail.support;
 if(s.section==='installation'&&p['형식']==='부착식')return '<form class="sl-form sl-post-form sl-canvas-form"><div class="sl-canvas-top"><strong>부착식</strong></div></form>';
 if(s.section==='installation')return `<form class="sl-form sl-post-form sl-canvas-form"><input type="hidden" name="형식" value="${e(p['형식'])}"><div class="sl-canvas-top"><strong>${e(managementTitle(s,p))}</strong></div><div class="sl-canvas-tools">${tool('입력표',s.installationMode==='site'?placement.siteEditor(s):placement.editor(s))}</div><div class="sl-canvas-feedback"><p class="sl-error" role="alert" hidden></p></div><footer class="sl-footer">${button('취소','cancel')}<button type="submit" class="sl-button sl-primary" disabled>저장</button></footer></form>`;
 const kinds=isNew&&!s.copyId||traffic(p)?['단주식','내민식','부착식']:['단주식','내민식','부착식','복주식','문형식','양내민식','미확정'];
 const choices={형식:kinds.map(x=>[x,x])};
 const fields=Object.entries(labels).map(([key,label])=>{
  if(key==='기준형식')return isNew?'':`<div class="sl-field"><span>형식 번호</span><strong>${e(supportNumber(p)||'—')}</strong></div>`;
  const value=key==='단면규격'?(p[key]||(p['주지주직경_mm']?supportSize(p):'')):p[key]??'';
  return `<label class="sl-field"><span>${label}</span>${choices[key]?`<select class="sl-input" name="${key}">${choices[key].map(([id,text])=>`<option value="${e(id)}" ${value===id?'selected':''}>${e(text)}</option>`).join('')}</select>`:`<input class="sl-input" name="${key}" value="${e(value)}" ${key==='주지주직경_mm'?'type="number" min="0.001" step="any"':''}>`}</label>`;
 });
 const info=(model='')=>`<div class="sl-support-info"><div class="sl-form-grid sl-support-identity">${fields.slice(0,2).join('')}</div>${model}${fields[2]}<div data-support-dimensions></div></div>`;
 if(s.section==='supports'){
  const sources=(s.tables?.supports||[]).filter(r=>supportRoad(r)===(s.postRoad||'고속도로')&&r['형식']===(p['형식']||kinds[0]));
  const model=isNew?`<label class="sl-field sl-model-source"><span>기본 모델</span><select class="sl-input" name="model_source"><option value="">선택</option>${sources.map(r=>`<option value="${e(r['지주기초ID'])}" ${s.modelSource===r['지주기초ID']?'selected':''}>${e(formName(r))} · ${e(r['단면규격'])}</option>`).join('')}</select></label>`:'';
  const road=`<div class="sl-field"><span>도로 구분</span>${isNew?`<select class="sl-input" data-common-road aria-label="신규 지주 도로 구분">${['고속도로','일반도로'].map(road=>`<option ${road===s.postRoad?'selected':''}>${road}</option>`).join('')}</select>`:`<strong>${e(supportRoad(p))}</strong>`}</div>`;
  const basics=`<div class="sl-support-info"><div class="sl-support-identity">${road}${fields.slice(0,2).join('')}</div><div class="sl-support-model-options">${model}${fields[2]}</div><div data-support-dimensions></div></div>`;
  return `<form class="sl-form sl-post-form sl-canvas-form sl-common-detail sl-support-unified" ${isNew?'':'data-existing'}><header class="sl-panel-head"><h2>${isNew?'지주 신규등록':e(formName(p))}</h2>${button('닫기','close')}</header><div class="sl-common-body"><div class="sl-common-columns"><div data-common-model></div><div class="sl-common-information">${basics}<section class="sl-support-combinations"><h3>가용 조합</h3>${newForm(s)}${placement.gapEditor(s)}</section>${placement.roadEditor(s)}<section class="sl-support-quantities"><h3>단위수량 <small>지주·기초 전체 1개소</small></h3>${isNew?initialQuantities(s):'<div data-common-quantity-editor>'+inlineTable(s.tables,p['지주기초ID'])+'</div><div class="gq-actions"><button type="button" data-common-quantities-edit>수정</button><button type="button" data-common-quantities-save>수정 완료</button></div>'}</section>${isNew?'':`<div class="sl-support-copy">${button('복사 후 수정','copy')}</div>`}<p class="sl-error" role="alert" hidden></p></div></div></div><footer class="sl-footer" ${isNew?'':'hidden'}><div data-workspace-save><button type="submit" class="sl-button sl-primary">${isNew?'등록':'저장'}</button></div></footer></form>`;


 }
 const items=[['info','기본정보'],['combinations','가용조합'],...(isNew?[['installation','설치위치'],['quantities','수량']]:[])];
 return `<div class="sl-panel-head"><h2>${isNew?'지주 형식 추가':e(formName(p))}</h2>${button('목록','cancel')}</div><form class="sl-form sl-post-form">${pageTabs(items)}<div class="sl-body">${page('info',info())}${page('combinations',newForm(s),true)}${isNew?page('installation',placement.editor(s),true)+page('quantities',initialQuantities(s),true):''}<p class="sl-error" role="alert" hidden></p></div><footer class="sl-footer"><span class="sl-sub">${isNew?'':`연결 조합 ${s.detail.configs?.length||0}개`}</span><button type="submit" class="sl-button sl-primary">${isNew?'등록':'저장'}</button></footer></form>`;
}
export function preview(result,sectionName){
 if(sectionName==='installation'){
  const before=result.before?.placement?.rule,after=result.after.placement.rule,changes=[];
  const add=(name,a,b)=>{if(a!==b)changes.push(`<tr><th>${e(name)}</th><td>${e(a??'미설정')}</td><td>${e(b??'미설정')}</td></tr>`);};
  for(const r of after.distances){const old=before?.distances.find(p=>p.name===r.name&&p.size===r.size);for(const axis of ['x','z'])add(`${r.size} ${r.name.replace('보조_','보조')} ${axis.toUpperCase()}`,old?.[axis]??before?.[axis],r[axis]);}
  for(const [key,name] of [['main_gap','본표지 ↔ 본표지 이격거리'],['aux_gap','본표지 ↔ 보조표지 이격거리']])add(name,before?.[key],after[key]);
  for(const [key,name] of [['fill','성토부'],['cut','절토부']])for(const axis of ['x','z'])add(`${name} ${axis.toUpperCase()}축 이격거리`,before?.site[key][axis],after.site[key][axis]);
  return `<h3>변경 내용</h3>${changes.length?`<table class="sl-site-table"><thead><tr><th>항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>${changes.join('')}</tbody></table>`:'<p>변경된 값이 없습니다.</p>'}<p>영향받는 조합 ${result.after.configs.length}개</p>${button('입력 다시 수정','support-revise')}${button('저장','support-save',true)}`;
 }
 const before=result.before,after=result.after;
 const changes=Object.entries(labels).filter(([key])=>!before||before.support[key]!==after.support[key]);
 const configs=[...new Map([...(before?.configs||[]),...after.configs,...(result.affected_configs||[])].map(c=>[c['구성ID'],c])).values()];
 const signs=result.affected?.map(p=>({표지ID:p.id,표지번호:p.code,명칭:p.name}))||[...new Map([...(before?.signs||[]),...after.signs].map(p=>[p['표지ID'],p])).values()];
 const connections=(result.changes||[]).map(c=>`<li><strong>${{generate:'자동 생성',correct:'보정',copy:'추가',replace:'지주 교체',new:'새 조합',exclude:'제외',restore:'다시 적용'}[c.mode]}</strong> · ${e(c.name)}${c.mode==='replace'?`<div class="sl-sub">${e(c.before)} → ${e(c.after)}</div>`:''}</li>`).join('');
 const describe=f=>`${f.sizes.join(' · ')} / ${f.patterns?.map(([main,aux])=>`표지판 ${main}장${aux?` + 보조표지 B ${aux}장`:''}`).join(', ')||'원본 조합'}`;
 const ruleChange=result.form_change?`<h3>가용조합 변경</h3><p>${e(describe(result.form_change.before))} → ${e(describe(result.form_change.after))}</p><p class="sl-sub">같은 형식을 사용하는 지주에 함께 적용됩니다. 제외한 조합의 파일·수량은 보존합니다.</p>`:'';
 const quantities=(after.quantities||[]).filter(q=>q['등록상태']==='등록');
 const registration=`${ruleChange}${placement.readOnly(after.placement,'preview')}${connections?`<details class="sl-fold"><summary>조합 변경 ${(result.changes||[]).length}개 확인</summary><ul class="sl-auto-scroll">${connections}</ul></details>`:''}<h3>단위수량 ${quantities.length}항목</h3>${quantities.map(q=>`<div>${e(q['수량항목'])} · ${e(q['값'])} ${e(q['단위'])}</div>`).join('')||'<p class="sl-sub">미등록</p>'}${(after.files||[]).filter(f=>f['대상종류']==='지주기초').map(f=>`<div>파일 · ${e(f.file['파일명'])}</div>`).join('')}`;
 return `<h3>${before?'변경 내용':'등록 내용'}</h3><dl class="sl-dl">${changes.map(([key,label])=>`<dt>${label}</dt><dd>${before?`${e(key==='기준형식'?formName(before.support):before.support[key]||'미등록')} → `:''}${e(key==='기준형식'?formName(after.support):after.support[key]||'미등록')}</dd>`).join('')||'<dt>기본정보</dt><dd>변경 없음</dd>'}</dl><h3>영향받는 조합 ${configs.length}개 · 표지판 ${signs.length}개</h3><details class="sl-fold"><summary>연결된 조합 확인</summary><div class="sl-impact-models">${configs.map(c=>`<div>${e(c['원본모델명']||c['구성명'])}${c.isOverride?' · 표지별 설정':''}</div>`).join('')||'연결된 조합 없음'}</div></details>${before?`<p class="sl-sub">적용 표지판: 수정 전 ${before.signs.length}개 → 수정 후 ${after.signs.length}개</p>`:''}<details><summary>표지판 번호 확인</summary><div class="sl-chips">${signs.map(p=>`<span class="sl-size">${e(p['표지번호'])}</span>`).join('')||'사용 중인 표지판 없음'}</div></details>${registration}${button('입력 다시 수정','support-revise')}${button('저장','support-save',true)}`;
}
