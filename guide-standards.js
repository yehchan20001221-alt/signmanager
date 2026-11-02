/* 공용 안내판 규격 목록·편집·치수 미리보기. 저장은 기존 revision/이력 경로를 사용한다. */
import {e} from './views.js';
import {overallSize} from './guide-panel-view.js';
import {typeName} from './guide-types.js';
import {specifications,displaySpecifications,groupApplications,placementRules} from './guide-panel-specs.js';
import {positioned,summary,shapes,modify,compositionDiagram} from './guide-composition.js';
import * as guidePosts from './guide-posts.js';
import * as guidePositions from './guide-positions.js';
import * as guidePieces from './guide-pieces.js';
import * as assetLibrary from './guide-asset-library.js';
import * as panelCreate from './guide-panel-create.js';
let assetApi;

export const active=s=>s.section==='guide-standards';
export const clear=()=>{guidePositions.clear();assetLibrary.clear();panelCreate.clear();};
export function drawModel(app,s){if(ui(s).panelCreation)panelCreate.drawModel();else if(positionMode(s))guidePositions.drawModel();else if(postMode(s))guidePosts.drawModel(app,s);else assetLibrary.drawModel();}
export function beginCreate(s){ui(s).panelCreation=panelCreate.initial('piece');s.guidePositionCamera=null;}
export const initial=()=>({tab:'posts',road:'고속도로',query:'',selected:'',spec:'',placement:'posts'});
export function openModelPosition(s,ruleIds){
 const choice=s.guideModel?.choices?.find(c=>c.name===s.guideModel.name);
 const rules=ruleIds||choice?.rules||[];
 const spec=s.guidePanelSpecs?.find(p=>p.ruleIds.some(id=>rules.includes(id)));
 const position=spec?.placements?.find(p=>p.rules.some(id=>rules.includes(id))&&(ruleIds||matches(p['지주형식'],{key:choice.post})));
 if(!position)throw Error('이 모델의 설치 위치 연결을 찾을 수 없습니다. 공통 데이터에서 규격 연결을 확인하세요.');
 s.guideStandardsUI={...initial(),...specMode(spec),privatePosition:true,road:spec.road,spec:spec.key,positionSelected:position.id,expanded:summary(spec.form)};
 s.guidePositionCamera=null;s.section='guide-standards';
}
const ui=s=>{const state=s.guideStandardsUI??=initial();if(state.tab==='backgrounds')state.tab='pieces';return state;};
const source=s=>s.guideStandardsData;
const specs=s=>{
 const rows=signs(s);
 if(!s.guidePanelSpecs)return displaySpecifications(specifications(rows,source(s).panelForms));
 const refs=new Map(rows.flatMap(sign=>sign.rules.map((rule,i)=>[rule['기준ID']||sign['안내표지ID']+'/'+(i+1),{sign,rule}])));
 return displaySpecifications(s.guidePanelSpecs.map(r=>({...r,members:r.ruleIds.map(id=>refs.get(id)).filter(Boolean)})));
};
const postMode=s=>['posts','installation'].includes(ui(s).tab);
const positionMode=s=>ui(s).tab==='panels'||(ui(s).tab==='pieces'&&ui(s).piecePosition);
const specMode=spec=>spec.form.parts.length===1?{tab:'pieces',piecePosition:true}:{tab:'panels',piecePosition:false};
const value=v=>v===''||v==null?'—':String(v);
const button=(label,key,val)=>`<button type="button" class="sl-button" data-gs-key="${key}" data-gs-value="${e(val)}">${e(label)}</button>`;
const dimensions=r=>`${value(r.B)} × ${value(r.H)}`;
const compactDimensions=r=>[...new Set(r.form.parts.map(p=>p.B&&p.H?dimensions(p):'치수 미등록'))].join(' / ');
const missingDimensions=r=>r?.form.parts.some(p=>!(Number(p.B)>0&&Number(p.H)>0));
const memberNames=r=>[...new Set(r.members.map(m=>`${m.sign['표지번호']} ${m.sign['명칭']}`))].join(' · ');
export function signs(s){
 const current=new Map((s.tables.guidesigns||[]).map(r=>[r['안내표지ID'],r]));
 const references=new Map(source(s).signs.map(r=>[r['안내표지ID'],r]));
 const shared=new Map((s.guidePanelSpecs||[]).filter(p=>p.saved).flatMap(p=>p.ruleIds.map(id=>[id,p])));
 return [...new Set([...references.keys(),...current.keys()])].map(id=>{
  const saved=current.get(id),original=references.get(id);
  const rules=saved?(s.tables.guiderules||[]).filter(r=>r['안내표지ID']===id):original.rules;
  return {...original,...saved,original,registered:!!saved,rules:rules.map((r,i)=>{const p=shared.get(r['기준ID']||id+'/'+(i+1));return p?{...r,B:p.B,H:p.H}:r;})};
 });
}
export function posts(s){
 if(s.guidePostCatalog)return s.guidePostCatalog;
 const rows=new Map(source(s).posts.map(p=>[p.key,{...p}]));
 for(const p of [...source(s).postChoices,...s.tables.guideposts||[]]){
  const old=rows.get(p['지주형식']);
  rows.set(p['지주형식'],{...old,key:p['지주형식'],road:p['지주형식'].startsWith('GR_')?'일반도로':'고속도로',
   kind:p['지주종류'],number:old?.number||/형식\s*(\d+)/.exec(p['형식'])?.[1]||'',label:p['형식'],
   models:p['구성모델']?JSON.parse(p['구성모델']):old?.models||[],note:p['비고']||old?.note||'',source:p['출처']||old?.source||'별첨 지주 선택 기준'});
 }
 return [...rows.values()];
}
function matches(key,post){
 if(key===post.key)return true;
 const variants=/^(.+_IS)(\d+(?:,\d+)+)$/.exec(key);
 return !!variants&&variants[2].split(',').some(n=>variants[1]+n===post.key);
}
export function uses(s,post){return signs(s).flatMap(sign=>placementRules(sign.rules).filter(rule=>matches(rule['지주형식'],post)).map(rule=>({sign,rule})));}
export function filtered(s){
 const state=ui(s),query=state.query.trim().toLowerCase();
 if(state.tab==='pieces'&&!state.piecePosition)return guidePieces.catalog(specs(s),query);
 if(postMode(s))return posts(s).filter(row=>`${row.road} ${row.kind} ${row.label} ${row.key} ${row.note}`.toLowerCase().includes(query));
 return specs(s).filter(r=>(state.tab==='pieces'?r.form.parts.length===1:r.form.parts.length>1)&&`${summary(r.form)} ${compactDimensions(r)} ${memberNames(r)}`.toLowerCase().includes(query));
}
function selection(s){const rows=filtered(s),key=postMode(s)?ui(s).selected:ui(s).spec;return rows.find(r=>r.key===key||r.sources?.some(v=>v.key===key))||rows[0];}
function postLabel(s,key){const p=posts(s).find(r=>r.key===key);return p?`${p.kind} · ${p.label}`:value(key);}
function postLink(s,key){return key?button(postLabel(s,key),'post',key):'—';}
function signLinks(members,compact=false){
 const rows=[...new Map(members.filter(r=>r.sign.registered).map(r=>[r.sign['안내표지ID'],r.sign])).values()];
 if(!rows.length)return '';
 const links=`<div class="gs-links">${rows.map(sign=>`<button type="button" class="sl-button" data-gs-open="${e(sign['안내표지ID'])}">${e([sign['표지번호'],sign['명칭']].filter(Boolean).join(' ')||sign['안내표지ID'])}</button>`).join('')}</div>`;
 return compact?links:`<section class="gs-section"><h3>표지별 상세·수정</h3>${links}</section>`;
}
function applications(s,members,placement=false){
 const keys=placement?['B','H','조건','지주형식','X','Y','Z']:['조건','지주형식'];
 return `<div class="gs-table-wrap"><table class="gs-table"><thead><tr>${placement?'<th>규격 B × H (mm)</th>':''}<th>적용 유형</th><th>적용 조건</th>${placement?'<th>X (m)</th><th>Y (m)</th><th>Z (m)</th>':'<th>지주 형식</th>'}</tr></thead><tbody>${groupApplications(members,keys).map(({rule,members})=>`<tr>${placement?`<th>${e(dimensions(rule))}</th>`:''}<td>${[...new Set(members.map(r=>typeName(r.sign)))].map(e).join(' · ')}</td><td>${e(rule['조건']==='기본값'?'초기 설치값':rule['조건'])}</td>${placement?['X','Y','Z'].map(k=>`<td>${e(value(rule[k]))}</td>`).join(''):`<td>${postLink(s,rule['지주형식'])}</td>`}</tr>`).join('')}</tbody></table></div>`;
}
export function families(s){
 const groups=new Map();
 for(const row of filtered(s)){
  const key=summary(row.form);
  if(!groups.has(key))groups.set(key,{key,rows:[]});
  groups.get(key).rows.push(row);
 }
 return [...groups.values()].sort((a,b)=>a.rows[0].form.parts.length-b.rows[0].form.parts.length||a.key.localeCompare(b.key,'ko'));
}
export function selectFamily(s,key,expand=false){
 const family=families(s).find(f=>f.key===key);if(!family)return;
 const state=ui(s),row=currentSpec(s);
 state.editor=null;state.axis='';state.shapeMenu=false;
 if(!family.rows.some(r=>r.key===row?.key))change(s,'spec',family.rows[0].key);
 if(expand)state.expanded=state.expanded===key?'':key;
}
function panelContent(s,selected){
 const state=ui(s),draft=state.editor,form=draft?.form||(selected?positioned(selected.form):null);
 if(state.privatePosition&&selected)return `<section class="gs-preview gs-sign-position" aria-label="설치 위치 작업면">${guidePositions.content(selected,state,posts(s),s.guidePostModels)}</section>`;
 const partIndex=Math.min(draft?.part??state.part??0,(form?.parts.length||1)-1),part=form?.parts[partIndex];
 const groups=families(s);
 const warning=r=>guidePositions.specWarning(r,posts(s),s.guidePostModels);
 const action=(name,label,disabled=false)=>`<button type="button" class="sl-button${name==='save'?' sl-primary':''}" data-gs-action="${name}" ${disabled?'disabled':''}>${label}</button>`;
 return `<div class="gc-workspace gc-grid-workspace"><section class="gs-specifications" aria-label="표지판 형태"><header class="ga-list-heading"><strong>${state.tab==='pieces'?'개별 판':'조합 판'} <small>${groups.reduce((n,g)=>n+g.rows.length,0)}개 규격 · mm</small></strong></header><div class="gs-spec-scroll">${groups.map(group=>{
  return `<section class="gc-family"><h3 class="gc-family-heading">${e(group.key)}<small>${group.rows.length}개 규격 · mm</small></h3><div class="gc-family-grid" aria-label="${e(group.key)} 규격">${group.rows.map(r=>`<button type="button" class="gs-spec-row" data-gs-key="spec" data-gs-value="${e(r.key)}" aria-pressed="${selected?.key===r.key}" aria-label="${e(overallSize(r))} 규격"><span class="gc-size-thumb" aria-hidden="true">${compositionDiagram(r.form,0,true)}</span><span class="gc-overall-size">${e(overallSize(r))}</span>${warning(r)}</button>`).join('')}</div></section>`;
 }).join('')||'<p class="gs-empty">검색 결과가 없습니다.</p>'}</div></section>
 <section class="gs-preview" aria-label="설치 위치 작업면">${draft?`<header class="gc-canvas-head"><div class="gc-selection"><strong>${draft&&!draft.id?'새 규격':form?e(summary(form)):''}</strong>${part&&form.parts.length>1?`<span>판 ${partIndex+1}</span>`:''}</div><div class="gc-tools">${draft?`<button type="button" class="sl-button" data-gs-shape-menu aria-expanded="${!!state.shapeMenu}">모양</button><button type="button" class="sl-button" data-gs-part-action="add-rectangle">판 추가</button><button type="button" class="sl-button" data-gs-part-action="duplicate">판 복제</button><button type="button" class="sl-button" data-gs-part-action="remove" ${form.parts.length===1?'disabled':''}>판 삭제</button><span class="gc-tool-divider"></span>${action('save','저장')}${action('cancel','취소')}`:selected?`<span class="sl-sub">${e(compactDimensions(selected))} mm</span>`:''}</div></header>`:''}
 ${state.panelCreation?panelCreate.content(state.panelCreation):''}${draft&&state.shapeMenu?`<div class="gc-shape-menu" role="group" aria-label="판 모양">${Object.entries(shapes).map(([key,label])=>`<button type="button" data-gs-shape="${key}" aria-pressed="${part.shape===key}">${label}</button>`).join('')}</div>`:''}
 ${state.panelCreation?'':draft?`<div class="gs-preview-canvas"><div class="gs-diagram gc-diagram">${form?compositionDiagram(form,partIndex):''}</div></div>`:selected?missingDimensions(selected)?`<section class="gc-missing-dimensions" aria-label="판 치수 등록"><h2>판 치수를 등록해 주세요</h2><p>${e(memberNames(selected))}</p><p>폭·높이가 없는 판이 있습니다. 치수를 등록하면 설치 위치를 확인할 수 있습니다.</p>${action('edit','치수 등록')}</section>`:guidePositions.content(selected,state,posts(s),s.guidePostModels):''}
 ${draft&&state.axis?axisEditor(part,state.axis):''}${draft?`<footer class="gc-canvas-note"><span>${draft.count?`연결된 표지 ${draft.count}개에 함께 반영`:'치수를 더블클릭하여 수정'}</span><span>mm</span></footer>`:''}</section><p class="sl-error gs-error" role="alert" hidden></p></div>`;
}
const axisLabels={B:'폭',H:'높이',x:'가로 위치',y:'세로 위치'};
function axisEditor(part,axis){
 return `<form class="gc-axis-form" aria-label="${axisLabels[axis]} 수정"><label>${axisLabels[axis]} <small>mm</small><input type="number" name="value" aria-label="${axisLabels[axis]}" min="${['B','H'].includes(axis)?'.001':'-50000'}" max="50000" step="any" required value="${e(part[axis])}"></label><button type="submit" class="sl-button">확인</button></form>`;
}
export function beginAxis(s,axis){
 if(!axisLabels[axis])return;
 if(!ui(s).editor)beginEdit(s);
 ui(s).axis=axis;ui(s).shapeMenu=false;
}
export function currentSpec(s){return positionMode(s)?selection(s):undefined;}
export function cancelPosition(s){guidePositions.cancel(ui(s),currentSpec(s));s.guidePositionCamera=null;}
export function beginEdit(s,isNew=false,copy=false){
 const group=currentSpec(s),state=ui(s);
 const sourceKey=state.positionDraft?.displaySpec===group?.key?state.positionDraft.spec:state.spec;
 const row=group?.sources?.find(r=>r.key===sourceKey)||group?.sources?.[0]||group;
 if(!isNew&&row?.model)throw new Error('표지판 크기와 구성은 OBJ에서 읽습니다. 수정한 OBJ를 연결하세요.');
 if(!isNew&&!row?.form.parts.length)throw new Error('편집할 조합을 선택하세요.');
 const form=isNew&&!copy?{version:2,parts:[{id:'p1',name:'판 1',shape:'rectangle',B:'',H:'',x:'0',y:'0'}]}:positioned(row.form);
 const missing=form.parts.findIndex(p=>!(Number(p.B)>0&&Number(p.H)>0));
 ui(s).axis=missing<0?'':Number(form.parts[missing].B)>0?'H':'B';ui(s).shapeMenu=false;
 ui(s).editor={id:isNew?'':row.key,template:row?.key||'',road:row?.road||ui(s).road,form,part:missing>=0?missing:isNew?0:Math.min(ui(s).part||0,form.parts.length-1),count:isNew?0:new Set(row.members.map(m=>m.sign['안내표지ID'])).size};
}
export function editPayload(s){
 const draft=ui(s).editor;
 return {id:draft.id,template:draft.template,road:draft.road,form:{version:2,parts:draft.form.parts.map(p=>Object.fromEntries(['id','name','shape','B','H','x','y'].map(k=>[k,p[k]])))}};
}
export function syncControls(app,s){
 guidePositions.syncControls(app,s);
 const kind=app.querySelector('.gp-editor [name=kind]');if(kind)kind.disabled=!!ui(s).postEditor?.id;
 const road=app.querySelector('.gp-editor [name=road]');if(road)road.disabled=!!ui(s).postEditor?.id;
 const site=app.querySelector('.gp-workspace [data-gs-key=site]');if(site)site.disabled=!!ui(s).postEditor;
 const foundation=app.querySelector('[data-gp-foundation]');if(foundation)foundation.disabled=['solid','site'].includes(ui(s).postView)||ui(s).postComponent==='@all';
 const draft=ui(s).editor;
 app.querySelectorAll('[data-gs-shape]').forEach(el=>el.disabled=!draft);
 const remove=app.querySelector('[data-gs-part-action="remove"]');
 if(remove)remove.disabled=draft.form.parts.length===1;
}
export function positionShapeMenu(app){
 const menu=app.querySelector('.gc-shape-menu');if(!menu)return;
 const parent=menu.parentElement.getBoundingClientRect(),canvas=app.querySelector('.gs-preview-canvas').getBoundingClientRect();
 const plate=app.querySelector('.gc-plate.is-selected').getBoundingClientRect();
 menu.style.maxWidth=Math.max(0,canvas.width-16)+'px';menu.style.maxHeight=Math.max(0,canvas.height-16)+'px';
 const size=menu.getBoundingClientRect();
 const left=plate.right+10+size.width<=canvas.right-8?plate.right+10:plate.left-size.width-10;
 menu.style.left=Math.max(canvas.left+8,Math.min(left,canvas.right-size.width-8))-parent.left+'px';
 menu.style.top=Math.max(canvas.top+8,Math.min(plate.top,canvas.bottom-size.height-8))-parent.top+'px';
}
export function previewEdit(app,s,form){
 const draft=ui(s).editor;if(!draft)return;
 const part=draft.form.parts[draft.part];
 part[ui(s).axis]=new FormData(form).get('value');
 app.querySelector('.gs-diagram').innerHTML=compositionDiagram(draft.form,draft.part);
}
export function selectPart(s,index){
 const state=ui(s),draft=state.editor,form=draft?.form||currentSpec(s)?.form;
 if(!form?.parts[index])return;
 if(draft)draft.part=index;else state.part=index;
 state.axis='';state.shapeMenu=!!draft;
}
export function changePart(s,action,shape){
 const draft=ui(s).editor;if(!draft)return;
 if(shape){if(!shapes[shape])return;draft.form.parts[draft.part].shape=shape;}
 else modify(draft,action);
 ui(s).axis='';ui(s).shapeMenu=false;
}
function siteContent(s,post,compact=false){
 const groups=source(s).sites.filter(g=>g.road===post.road&&g.rows.some(r=>r.kind===post.kind&&r.number===post.number));
 if(!groups.length)return `<p class="gs-empty">${post.note==='교통표지 지주 공용'?'교통표지 공용 지주입니다. 설치위치는 교통표지 공통 데이터에서 관리합니다.':'이 형식의 확정된 지주 설치표가 없습니다.'}</p>`;
 return groups.map(g=>{
  const row=g.rows.find(r=>r.kind===post.kind&&r.number===post.number);
  const gantry=post.kind==='문형식';
  return `<section class="gs-section">${compact?'':'<h3>지주 설치위치</h3>'}<div class="gs-table-wrap"><table class="gs-table"><thead><tr><th>설치 구간</th><th>X</th><th>${gantry?'Z1':'Z'}</th>${gantry?'<th>Z2</th>':''}</tr></thead><tbody>${Object.entries(row.values).map(([terrain,v])=>`<tr><th>${e(terrain)}</th><td>${e(value(v.X))}</td><td>${e(value(v[gantry?'Z1':'Z']))}</td>${gantry?`<td>${e(value(v.Z2))}</td>`:''}</tr>`).join('')}</tbody></table></div>
  ${gantry&&!compact?`<p class="sl-sub">도로폭: ${post.road==='고속도로'?'선형중심선':'중분대'}부터 도로끝까지. 차로수와 관계없이 적용합니다.</p>`:''}
  ${compact?'':`<h3>원문 삽도</h3><div class="gs-figures">${g.figures.map(f=>`<figure><figcaption>${e(f.label)}</figcaption><a href="/static/images/guide-standards/${e(f.file)}" target="_blank" rel="noopener" aria-label="${e(f.label)} 원문 삽도 크게 보기"><img src="/static/images/guide-standards/${e(f.file)}" alt="${e(post.road+' '+f.label+' 지주 설치 기준점')}" loading="lazy"></a></figure>`).join('')}</div>`}</section>`;
 }).join('');
}
function postContent(s,post){
 const refs=uses(s,post),ids=new Set(refs.map(r=>r.rule['기준ID']));
 const linked=specs(s).map(r=>(r.sources||[r]).find(source=>source.members.some(m=>ids.has(m.rule['기준ID'])))).filter(Boolean);
 if(ui(s).tab==='posts')return guidePosts.content(s,post,signLinks(refs,true),siteContent(s,post,true),siteContent(s,post));
 const placement=ui(s).tab==='installation'&&ui(s).placement==='signs';
 return `<header class="gs-detail-head"><div><p>${e(post.road)}</p><h2>${e(post.kind)} · ${e(post.label)}</h2></div>${post.status?`<span class="gs-tag">${e(post.status)}</span>`:''}</header>
 ${ui(s).tab==='installation'?(placement?`<section class="gs-section"><h3>표지판 배치</h3>${refs.length?applications(s,refs,true):'<p class="sl-sub">연결된 설치값이 없습니다.</p>'}</section>`:siteContent(s,post)):`<section class="gs-section"><h3>형식 정보</h3><dl class="gs-definitions"><dt>비고</dt><dd>${e(post.note||'—')}</dd><dt>구성 모델</dt><dd>${post.models.map(m=>`<span class="gs-model">${e(m)}</span>`).join('')||e(post.status||'원문 모델 연결 없음')}</dd></dl>${button('설치위치 보기','site',post.key)}</section>`}
 <section class="gs-section"><h3>연결 규격 <span class="sl-sub">${linked.length}개</span></h3><div class="gs-links">${linked.map(r=>button([summary(r.form),compactDimensions(r)].join(' · '),'spec-link',r.key)).join('')||'<p class="sl-sub">연결된 규격이 없습니다.</p>'}</div></section>${placement?signLinks(refs):''}`;
}
export function content(s){
 if(!source(s))return '<p class="gs-empty">데이터를 불러오는 중입니다…</p>';
 if(ui(s).tab==='pieces'&&!ui(s).piecePosition)return assetLibrary.shell();
 const selected=selection(s);
 if(!selected&&postMode(s)){
  if(ui(s).tab==='posts'&&ui(s).postEditor)return guidePosts.content(s,{...ui(s).postEditor,key:ui(s).postEditor.id},'');
  return '<p class="gs-empty">검색 결과가 없습니다.</p>'+(ui(s).tab==='posts'?'<button class="sl-button" data-gp-action="new">지주 형식 추가</button>':'');
 }
 return (postMode(s)?postContent(s,selected):panelContent(s,selected))+'<p class="sl-error" role="alert" hidden></p>';
}
export function list(s){
 if(!postMode(s))return '';
 const selected=selection(s),rows=filtered(s);
 return ['고속도로','일반도로'].map(road=>{
  const group=rows.filter(r=>r.road===road);if(!group.length)return '';
  return `<section class="gp-road"><h3>${road}<small>${group.length}개 형식</small></h3><div class="gp-cards">${group.map(r=>guidePosts.card(s,r,selected?.key===r.key)).join('')}</div></section>`;
 }).join('');
}
export function toolbar(s){
 if(ui(s).privatePosition)return `${s.guideSelected?`<button type="button" class="sl-button" data-common-sign-detail="${e(s.guideSelected)}">← 표지 상세로</button>`:''}${button('개별 판 목록','group','plates')}`;
 return `${ui(s).piecePosition||ui(s).pieceReturn?button('← 개별 판으로','piece-back',''):''}<input type="search" data-gs-search aria-label="안내 데이터 검색" placeholder="${postMode(s)?'지주 종류 · 형식 검색':'규격 · 표지번호 검색'}" value="${e(ui(s).query)}">${postMode(s)?'<button type="button" class="sl-button sl-primary" data-gp-action="new">지주 형식 추가</button>':`<button type="button" class="sl-button sl-primary" data-gs-create>${ui(s).tab==='pieces'?'개별 판':'조합 판'} 추가</button>`}`;
}
function navigation(){
 return '<div class="gs-primary-navigation"><nav class="sl-main-tabs" aria-label="안내 공통 데이터"><span class="gs-post-title">지주</span></nav><div class="gs-toolbar"></div></div>';
}
export function shell(s){
 // 이전 브라우저 이력의 판 화면도 현재 공통 데이터인 지주로 연다.
 if(!postMode(s))s.guideStandardsUI=initial();
 return `<div id="sign-library-screen" class="gs-screen"><header class="sl-head"><div class="sl-brand-group"><h1 class="sl-brand"><button type="button" class="sl-home" data-section="signs" aria-label="SIGN MANAGER 홈">SIGN MANAGER</button></h1><span class="sl-master-caption">안내표지 공통 데이터</span></div><button type="button" class="sl-button sl-back" data-section="guides">← 안내표지로</button></header><div class="gs-navigation">${navigation(s)}</div><div class="sl-work gs-work"><nav class="gs-list" aria-label="안내 데이터 목록"></nav><main class="sl-panel gs-content" aria-label="안내 데이터 상세">${content(s)}</main></div><div class="sl-status" role="status"></div></div>`;
}
export function draw(app,s,searchOnly=false,previewOnly=false){
 if(!active(s)||!source(s))return;
 if(previewOnly){
  const container=document.createElement('div');container.innerHTML=content(s);
  app.querySelector('.gs-preview').replaceWith(container.querySelector('.gs-preview'));
  app.querySelectorAll('.gs-spec-row').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.gsValue===currentSpec(s).key)));
  app.querySelectorAll('[data-gs-family]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.gsFamily===summary(currentSpec(s).form))));
  positionShapeMenu(app);
  guidePositions.mount(app,s,currentSpec(s),posts(s));
  return;
 }
 const scroll=app.querySelector('.gs-spec-scroll')?.scrollTop||0;
 const wasPieces=!!app.querySelector('.gpc-workspace'),isPieces=ui(s).tab==='pieces';
 if(wasPieces&&!isPieces)ui(s).pieceScroll=scroll;
 const familyScroll=app.querySelector('.gs-list')?.scrollTop||0;
 const focus=['spec','piece','piece-back'].includes(document.activeElement?.dataset?.gsKey);
 if(!searchOnly){
  app.querySelector('.gs-navigation').innerHTML=navigation(s);
  app.querySelector('.gs-toolbar').innerHTML=toolbar(s);
 }
 app.querySelector('.gs-list').innerHTML=list(s);
 app.querySelector('.gs-work').classList.toggle('gs-family-work',!postMode(s));
 app.querySelector('.gs-work').classList.toggle('gs-post-work',ui(s).tab==='posts');
 app.querySelector('.gs-content').innerHTML=content(s);
 if(ui(s).tab!=='pieces'||ui(s).piecePosition)assetLibrary.clear();
 if(ui(s).tab==='pieces'&&!ui(s).piecePosition&&assetApi)assetLibrary.mount(app,s,assetApi,ui(s).query,{specs:specs(s),posts:posts(s)});
 if(ui(s).tab==='posts')guidePosts.loadModel(app,s);
 positionShapeMenu(app);
 guidePositions.mount(app,s,currentSpec(s),posts(s));
 if(ui(s).panelCreation&&assetApi)panelCreate.mount(app,s,assetApi);
 const scrollArea=app.querySelector('.gs-spec-scroll');if(scrollArea)scrollArea.scrollTop=isPieces?(searchOnly?0:wasPieces?scroll:ui(s).pieceScroll||0):scroll;
 app.querySelector('.gs-list').scrollTop=familyScroll;
 if(focus)app.querySelector('.gs-spec-row[aria-pressed=true]')?.focus({preventScroll:true});
}
export function change(s,key,val){
 const state=ui(s);
 if(['pieces','panels'].includes(state.tab))state.panelTab=state.tab;
 if(key==='group'){key='tab';val=val==='plates'?'pieces':'posts';state.piecePosition=false;state.privatePosition=false;}
 const use=key==='piece-use'?guidePieces.catalog(specs(s)).flatMap(p=>p.uses).find(u=>u.key===val):null;
 if(key==='piece-use'&&(!use||!use.position))return;
 s.guidePositionCamera=null;
 state.editor=null;state.panelCreation=null;panelCreate.clear();state.drawingKey=null;state.axis='';state.shapeMenu=false;state.positionDraft=null;state.positionSelected='';state.positionChanged=false;
 state.postEditor=null;state.postTool='';state.postModel=null;
 if(key==='piece-use'){
  state.pieceReturn={piece:filtered(s).find(p=>p.uses.some(u=>u.key===val))?.key,query:state.query};
  const spec=specs(s).find(r=>r.key===use.spec||r.sources?.some(source=>source.key===use.spec));
  Object.assign(state,{...specMode(spec),road:use.road,spec:use.spec,positionSelected:use.position,positionSign:use.sign['안내표지ID'],query:'',part:use.partIndices[0]||0});return;
 }
 if(key==='piece-back'){
  Object.assign(state,{tab:'pieces',piecePosition:false,privatePosition:false,query:'',...state.pieceReturn});state.pieceReturn=null;return;
 }
 if(key==='spec-link'){
  const spec=specs(s).find(r=>r.key===val||r.sources?.some(source=>source.key===val));if(!spec)return;
  Object.assign(state,{...specMode(spec),privatePosition:true,road:spec.sources?.find(r=>r.key===val)?.road||spec.road,spec:val,query:'',part:0});return;
 }
 if(key==='piece-link'){
  Object.assign(state,{tab:'pieces',panelTab:'pieces',piecePosition:false,assetSelection:val,assetUse:state.positionSign||'',assetPart:'',assetFamily:state.pieceLinkFamily||'rectangles',query:''});return;
 }
 if(['post','post-model','site'].includes(key)){
  state.road=posts(s).find(p=>p.key===val)?.road||state.road;
  state.tab=key==='site'?'installation':'posts';state.piecePosition=false;state.placement='posts';state.selected=val;state.query='';state.pieceReturn=null;
  if(key==='post-model'){const post=posts(s).find(p=>p.key===val);if(post&&!post.sharedTraffic)guidePosts.begin(s,post,'edit');else state.postTool='info';}
  return;
 }
 state[key]=val;
 if(key==='tab'&&['pieces','panels'].includes(val))state.panelTab=val;
 if(key==='selected')state.road=posts(s).find(p=>p.key===val)?.road||state.road;
 if(key==='spec')state.part=0;
 if(['tab','road'].includes(key)){state.selected='';state.spec='';state.query='';state.pieceReturn=null;state.piecePosition=false;}
}
export async function mount(app,s,api){
 assetApi=api;
 guidePosts.bind(api);guidePositions.bind(api);
 if(source(s)){draw(app,s);return;}
 try{s.guideStandardsData=await api('/api/guide-standards');if(active(s))draw(app,s);}
 catch(err){if(active(s))app.querySelector('.gs-content').innerHTML=`<p class="sl-error" role="alert">${e(err.message)}</p><button type="button" class="sl-button" data-gs-retry>다시 불러오기</button>`;}
}
