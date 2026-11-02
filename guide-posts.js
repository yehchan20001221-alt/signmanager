/* 안내 지주 작업면. 실제 OBJ와 형식별 초안을 사용하고 저장은 공통 revision 경로에 맡긴다. */
import {e} from './views.js';
import {supportDrawing} from './support-dimensions.js';
import {summary as quantitySummary, automatic, items} from './quantity-auto.js';
import {mount as mountQuantityEditor} from './guide-quantity-editor.js';
import {meshSvg} from './mesh-preview.js';
const ui=s=>s.guideStandardsUI;
const button=(key,label,primary=false)=>`<button type="button" class="sl-button${primary?' sl-primary':''}" data-gp-action="${key}">${label}</button>`;
let api,sequence=0;
const cache=new Map();
export const bind=request=>{api=request;};
export function modelStatus(post,models){
 const missing=post.models?.filter(name=>models&&!models.some(m=>m.name===name&&m.available))||[];
 const error=!post.models?.length?'지주 OBJ 없음':missing.length===post.models.length?'모델 없음':missing.length?'구성 모델 일부 없음':'';
 return error?{message:error,severity:'error'}:{message:post.modelIssue||'',severity:post.modelSeverity||'error'};
}
export function modelWarning(s,post){
 if(!s.guidePostModels)return '';
 const {message:label,severity}=modelStatus(post,s.guidePostModels);
 return label?`<span class="gp-model-warning${severity==='warning'?' is-warning':''}" role="img" aria-label="${e(label)}" title="${e(label)}">!</span>`:'';
}
export function card(s,post,selected){
 const paths={'단주식':'M60 64V18','복주식':'M36 64V18M84 64V18','내민식':'M24 64V20H96','편지식':'M24 64V20H96','양내민식':'M60 64V15M12 28H108','문형식':'M12 64V18H108V64','현수식':'M12 64V14M108 64V14M12 20Q60 44 108 20'};
 const panels=post.kind==='양내민식'?'<rect x="12" y="24" width="38" height="22"/><rect x="70" y="24" width="38" height="22"/>':`<rect x="${['내민식','편지식'].includes(post.kind)?52:37}" y="24" width="46" height="22"/>`;
 const icon=`<svg viewBox="0 0 120 76" aria-hidden="true"><path d="${paths[post.kind]||paths['단주식']}M5 65H115" fill="none" stroke="#697786" stroke-width="1.7"/><g fill="white" stroke="#2861aa" stroke-width="1.5">${panels}</g></svg>`;
 const size=/\(([^)]+)\)/.exec(post.label)?.[1]||'',label=post.label.replace(/\s*\([^)]*\)/g,'');
 return `<button type="button" class="sl-post-card" data-gs-key="selected" data-gs-value="${e(post.key)}" aria-pressed="${selected}" aria-label="${e(post.road+' '+post.kind+' '+post.label)}"><span class="sl-post-icon">${icon}</span><span class="sl-post-kind">${e(post.kind)}</span><strong class="sl-post-number">${e(label)} ${modelWarning(s,post)}</strong><span class="sl-post-size">${e(size||post.status||'—')}</span>${post.sharedTraffic?'<small>교통표지용</small>':''}</button>`;
}
export function begin(s,row,mode){
 const state=ui(s);
 state.postEditor=mode==='new'?{id:'',road:row?.road||state.road,kind:row?.kind||'단주식',label:'',note:'',models:row?.models?.slice(0,1).length?row.models.slice(0,1):[''],parameters:{}}:
 {id:mode==='copy'?'':row.key,road:row.road,kind:row.kind,label:mode==='copy'?row.label+' 복제':row.label,note:row.note,models:row.models.length?[...row.models]:[''],parameters:JSON.parse(JSON.stringify(row.parameters||{}))};
 state.postEditor.installationY=mode==='new'?'0':row.installationY;
 state.postEditor.quantityDocuments=mode==='new'?[]:[...(row.quantityDocuments||[])];
 state.postTool='info';state.postComponent=state.postEditor.models[0]||'';
}
export function read(s,form){
 const draft=ui(s).postEditor;if(!draft)return;
 const values=new FormData(form);
 if(!draft.id&&values.has('road')&&values.get('road')!==draft.road){
  draft.road=values.get('road');draft.models=[''];draft.parameters={};draft.quantityDocuments=[];
  const kinds=(s.guidePostCatalog||[]).filter(p=>p.road===draft.road).map(p=>p.kind);
  if(!kinds.includes(draft.kind))draft.kind=kinds[0]||'단주식';
  return;
 }
 for(const key of ['label','kind','note'])if(values.has(key))draft[key]=values.get(key);
 if(values.has('installationY'))draft.installationY=String(Number(values.get('installationY'))/1000);
 draft.models=values.getAll('models');
 const allowed=new Set((s.guideQuantityDocuments||[]).filter(r=>r.road===draft.road&&r.kind===draft.kind).map(r=>r.id));
 draft.quantityDocuments=values.getAll('quantityDocuments').filter(id=>allowed.has(id));
 draft.parameters=Object.fromEntries(Object.entries(draft.parameters).filter(([key])=>draft.models.includes(key)));
}
export function content(s,post,links,site='',figures=''){
 const state=ui(s),draft=state.postEditor,row=draft||post,view=state.postView||'front';
 if(draft&&!draft.id){links='';site='';figures='';}
 const combined=!draft&&row.kind==='문형식'&&row.models.length===2;
 const name=row.models.includes(state.postComponent)?state.postComponent:combined?'@all':row.models[0];
 state.postCurrent=post;state.postComponent=name;state.postFigures=figures;
 const kinds=[...new Set((s.guidePostCatalog||[]).filter(p=>p.road===row.road).map(p=>p.kind))];
 const options=selected=>(s.guidePostModels||[]).filter(m=>m.name.startsWith(row.road==='일반도로'?'GR_':'HW_')||row.models.includes(m.name)).map(m=>`<option value="${e(m.name)}" ${m.name===selected?'selected':''}>${e(m.label||m.name)}${m.available?'':' · 파일 없음'}</option>`).join('');
 const documents=(s.guideQuantityDocuments||[]).filter(r=>r.road===row.road&&r.kind===row.kind);
 const documentFields=`<fieldset class="gp-quantity-documents"><legend>수량 근거 연결</legend>${documents.map(r=>`<label><input type="checkbox" name="quantityDocuments" value="${e(r.id)}" ${(row.quantityDocuments||[]).includes(r.id)?'checked':''}><span>${e(r.form+' · '+r.condition)}<small>${e(r.section+' · '+r.description)}</small><small>${e(r.source)}</small></span></label>`).join('')||'<p class="sl-sub">이 도로·지주 종류에 연결할 수량 근거가 없습니다.</p>'}</fieldset>`;
 const basic=draft?`<div class="gp-basics"><label>도로 구분<select name="road" ${draft.id?'disabled':''}>${['고속도로','일반도로'].map(r=>`<option ${r===row.road?'selected':''}>${r}</option>`).join('')}</select></label><label>지주 종류<select name="kind" ${draft.id?'disabled':''}>${kinds.map(k=>`<option ${k===draft.kind?'selected':''}>${e(k)}</option>`).join('')}</select></label><label>형식 이름<input name="label" required maxlength="100" value="${e(draft.label)}"></label></div>`:
 `<dl class="gp-basics"><div><dt>도로 구분</dt><dd>${e(row.road)}</dd></div><div><dt>지주 종류</dt><dd>${e(row.kind)}</dd></div><div><dt>형식</dt><dd>${e(row.label)}</dd></div></dl>`;
 const offset=`<div class="gp-offset"><label>판 설치 Y <small>mm</small><input aria-label="판 설치 Y (mm)" ${draft?'name="installationY"':''} type="number" step="any" required data-gp-y value="${e(Math.round(Number(row.installationY||0)*1e5)/100)}"></label>${draft?'':button('save-y','적용')}</div>`;
 const models=draft?`<div class="gp-model-fields"><strong>OBJ 모델</strong>${draft.models.map((m,i)=>`<div class="gp-model-row"><label><span>모델 ${i+1}</span><select name="models" required aria-label="모델 ${i+1}"><option value="">선택</option>${options(m)}</select></label><label class="gp-upload-field">OBJ 업로드<input type="file" accept=".obj" data-gp-upload="${i}" aria-label="모델 ${i+1} OBJ 업로드"></label>${draft.models.length>1?`<button type="button" class="sl-button" data-gp-remove-model="${i}" aria-label="모델 ${i+1} 제외">×</button>`:''}</div>`).join('')}${draft.models.length<4?button('add-model','모델 추가'):''}</div><label>비고<input name="note" maxlength="1000" value="${e(draft.note)}"></label>`:
 `<section class="gp-model-fields"><header><h3>OBJ 모델</h3>${post.sharedTraffic?button('traffic','교통 지주 관리'):button('edit','수정')}</header>${row.models.map(name=>`<span class="gp-model-name">${e((s.guidePostModels||[]).find(m=>m.name===name)?.label||name)}</span>`).join('')||'<span>연결 없음</span>'}${row.note?`<p class="sl-sub">${e(row.note)}</p>`:''}</section>`;
 return `<section class="gp-workspace" aria-label="안내 지주 작업면">
 <header class="gp-header"><strong>${draft&&!draft.id?'지주 형식 추가':e(row.kind+' · '+row.label)}</strong></header>
 <div class="gp-body"><section class="gp-preview"><div class="gp-toolbar"><div role="group" aria-label="지주 보기">${[['front','정면'],['top','평면'],['solid','3D'],['site','도로 단면']].map(([key,label])=>`<button type="button" class="sl-button" data-gp-view="${key}" aria-pressed="${view===key}">${label}</button>`).join('')}</div><button type="button" class="sl-button" data-gp-foundation aria-pressed="${!!state.postFoundation}" ${['solid','site'].includes(view)||name==='@all'?'disabled':''}>기초 확대</button></div>
 ${row.models.length>1?`<div class="gp-components" role="group" aria-label="구성 모델">${combined?`<button class="sl-button" data-gp-component="@all" aria-pressed="${name==='@all'}">전체</button>`:''}${row.models.map((m,i)=>`<button class="sl-button" data-gp-component="${e(m)}" aria-pressed="${name===m}">${e(/Left/.test(m)?'왼쪽':/Right/.test(m)?'오른쪽':'모델 '+(i+1))}</button>`).join('')}</div>`:''}
 <div class="sl-master-stage gp-stage" data-gp-stage></div>${post.modelIssue?`<p class="gp-model-notice" role="status">${modelWarning(s,post)} ${e(post.modelIssue)}</p>`:''}</section>
 <aside class="gp-information" aria-label="지주 정보">${draft?`<form class="gp-editor" aria-label="지주 기본정보">${basic}${models}${offset}<details class="gp-document-picker"><summary>수량 근거 연결 · ${(row.quantityDocuments||[]).length}개</summary>${documentFields}</details></form>`:basic+models+offset}
 <section class="gp-section"><h3>적용 표지</h3>${links||'<p class="sl-sub">적용 표지 없음</p>'}</section>
 <section class="gp-section"><h3>도로 설치위치</h3>${site||'<p class="sl-sub">등록된 설치 기준 없음</p>'}</section>
 ${!draft?'<section class="gp-section"><h3>단위수량</h3><div data-gp-quantities>불러오는 중…</div></section>':''}</aside></div>
 <footer class="gp-footer">${draft?button('cancel','취소')+button('save',draft.id?'저장':'등록',true):button('copy','복제')+(!post.sharedTraffic?button('delete','삭제'):'')}</footer><p class="sl-error gp-error" role="alert" hidden></p></section>`;
}

export function drawModel(app,s){
 const state=ui(s),area=app.querySelector('[data-gp-stage]');if(!area)return;
 const model=state.postModel,view=state.postView||'front';
 area.classList.toggle('gp-site-view',view==='site');
 if(view==='site'){area.innerHTML=state.postFigures||'<p class="sl-empty">등록된 도로 단면 없음</p>';return;}
 if(!model?.available){area.innerHTML=`<p class="sl-master-stage-empty">${e(model?.message||'모델을 불러오는 중입니다…')}</p>`;return;}
 let html=view==='solid'?meshSvg(model,'안내 지주',undefined,undefined,s.guidePostCamera):supportDrawing(model,'안내 지주',view,state.postFoundation);
 html=html.replaceAll('data-support-dimension-edit=', 'data-gp-dimension=');
 html=html.replaceAll(/data-gp-dimension="([^"]*)" tabindex="0" role="button" aria-label="[^"]*"/g,()=>'');
 html=html.replaceAll('class="sl-dimension sl-master-measure" >','class="sl-dimension" >');
 area.innerHTML=html;
}
export async function loadModel(app,s,preserve=false){
 const state=ui(s),row=state.postEditor||state.postCurrent,name=state.postComponent,area=app.querySelector('[data-gp-stage]');
 if(!area||!api)return;
 if(!state.postEditor)loadQuantities(app,s);
 const ticket=++sequence,key=JSON.stringify([name,row.key,row.parameters?.[name],s.revision]);
 if(!preserve){state.postModel=null;drawModel(app,s);}
 try{
  if(!name){state.postModel={available:false,message:row.modelIssue||state.postCurrent?.modelIssue||'연결된 지주 OBJ가 없습니다.'};}
  else{
   if(!cache.has(key)){if(cache.size>24)cache.clear();cache.set(key,api('/api/guide-post-preview',name==='@all'?{post:row.key}:{name,parameters:row.parameters?.[name]}).catch(err=>{cache.delete(key);throw err;}));}
   const model=await cache.get(key);if(ticket!==sequence||!area.isConnected)return;state.postModel=model;
  }
  drawModel(app,s);
  const error=app.querySelector('.gp-error');if(error)error.hidden=true;
 }catch(err){if(ticket===sequence&&area.isConnected){if(preserve){const error=app.querySelector('.gp-error');if(error){error.textContent=err.message;error.hidden=false;}}else{state.postModel={available:false,message:err.message};drawModel(app,s);}}}
}
export async function upload(s,index,file){
 if(!file||!ui(s).postEditor)return;
 if(!/\.obj$/i.test(file.name)||file.size>20000000)throw new Error('20MB 이하의 OBJ 파일을 선택하세요.');
 const draft=ui(s).postEditor;
 const result=await api('/api/guide-post-upload?filename='+encodeURIComponent(file.name)+'&road='+encodeURIComponent(draft.road),file);
 if(ui(s).postEditor!==draft)return;
 s.guidePostModels=[...(s.guidePostModels||[]).filter(m=>m.name!==result.name),result];
 const previous=draft.models[index];draft.models[index]=result.name;delete draft.parameters[previous];
 ui(s).postComponent=result.name;
}

export function quantities(result,choice=''){
 const calculation=result.calculation,cases=calculation?.cases||[];
 const selected=cases.find(c=>c.id===choice)||cases[0];
 const extra=calculation?.available?result.rows.filter(q=>!automatic(q)&&(cases.length||!items.includes(q['수량항목']))):result.rows;
 const manual=!calculation?.rows&&extra.length?quantitySummary({available:true,rows:[],note:'직접 등록한 수량 · 전체 1개소'},extra.filter(q=>!cases.length||!q['적용조건'])):'';
 const values=selected?quantitySummary({...selected,description:'',section:'',note:''},result.rows.filter(q=>q['적용조건']===selected.id),false):quantitySummary(calculation,result.rows);
 const reference=selected?[selected.description,selected.section,selected.note].filter(Boolean):[];
 return `${selected?`<label class="gp-quantity-choice">적용 조건<select data-gp-quantity-choice aria-label="수량 적용 조건">${cases.map(c=>`<option value="${e(c.id)}" ${c.id===selected.id?'selected':''}>${e(c.label)}</option>`).join('')}</select></label>${calculation.modelWarning?`<p class="sl-sub">${e(calculation.modelWarning)}</p>`:''}`:''}${values}${manual}${reference.length?`<details class="gp-quantity-reference"><summary>수량 근거</summary>${reference.map(v=>`<p class="sl-sub">${e(v)}</p>`).join('')}</details>`:''}`;
}
async function loadQuantities(app,s){
 const target=app.querySelector('[data-gp-quantities]'),row=ui(s).postCurrent;
 if(!target)return;
 try{
  const result=await api('/api/guide-posts/'+encodeURIComponent(row.key)+'/quantities');
  if(!target.isConnected)return;
  mountQuantityEditor(target,result,row,s);
 }catch(err){if(target.isConnected)target.textContent=err.message;}
}
