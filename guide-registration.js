/* 안내표지 신규등록. 기존 모델·CAD 도안과 공용 설치위치를 선택하고 3D로 확인한다. */
import {e} from './views.js';
import {summary} from './guide-composition.js';
import {mount as mountPosition,clear as clearPosition} from './guide-registration-position.js';
import * as panel from './guide-panel.js';
import * as cad from './guide-cad.js';
import * as modelPreview from './guide-model-preview.js';
import * as cadUpload from './guide-cad-upload.js';
import * as assetEditor from './guide-sign-panels.js';
import {laneConditions,postText} from './guide-post-links.js';
import {fields,axes,complete} from './guide-sign-position.js';
import {fromMillimetres} from './guide-positions.js';
export function initial(road='고속도로'){return {road,code:'',name:'',category:'',layer:'',block:'',cad:'',cadUpload:null,model:'',asset:null,template:'',post:'',condition:'공통',posts:[],activePost:-1,X:'',Y:'',Z:'',query:'',family:''};}
export function discard(s){s.guideRegistrationDraft=null;}
export function selectTemplate(d,index){
 d.positionManual=false;
 const candidate=d.asset?.templates?.[index],row=candidate?.road===d.road?candidate:null;d.template=row?String(index):'';
 d.post=row?.['지주형식']||'';
 for(const key of ['X','Y','Z'])d[key]=row?.[key]??'';
}
export function selectAsset(d,asset){const post=d.post;d.asset=asset;d.model=asset?.key||'';if(asset)d.family=summary(asset.form);changePost(d,post);}
export function assetForKey(options,key){const asset=options.plates.find(p=>p.key===key||p.aliases?.includes(key));return asset?{...asset,key}:undefined;}
export function changeRoad(d,road){if(d.road!==road){d.road=road;d.category='';d.posts=[];d.activePost=-1;d.condition='공통';selectTemplate(d,-1);}}
export function families(options){return [...new Set(options.plates.map(p=>summary(p.form)))];}
export function chooseFamily(d,family){d.family=family;d.query='';}
export function changePost(d,value){if(value===d.post&&d.positionManual)return;const index=d.asset?.templates?.findIndex(t=>t.road===d.road&&t['지주형식']===value)??-1;selectTemplate(d,index);d.post=value;}
export function activePost(d){
 const alternative=d.posts?.[d.activePost];if(!alternative)return d;
 const t=d.asset?.templates?.find(t=>t.road===d.road&&t['지주형식']===alternative.post);
 return {...d,post:alternative.post,condition:alternative.condition,...Object.fromEntries(['X','Y','Z'].map(k=>[k,alternative[k]??t?.[k]??'']))};
}
export function postError(d){
 const rows=[{post:d.post,condition:d.condition||'공통'},...(d.posts||[])];
 if(rows.slice(1).some(r=>!r.post))return '추가한 지주의 형식을 선택하세요.';
 const keys=rows.filter(r=>r.post).map(r=>r.condition+'|'+r.post);
 return new Set(keys).size!==keys.length?'같은 적용 조건에 같은 지주가 중복되어 있습니다.':'';
}
export function configuredAsset(draft,options){
 if(!assetEditor.validDraft(draft))return null;
 const sort=parts=>parts.slice().sort((a,b)=>Number(a.Z)-Number(b.Z)||Number(a.X)-Number(b.X));
 const parts=sort(draft.parts);
 return options.plates.find(asset=>{
  const candidate=sort(asset.form.parts.map(p=>({X:p.x??0,Z:p.y??0,size:[p.B,p.H],shape:p.shape})));
  return candidate.length===parts.length&&parts.every((p,i)=>p.size&&(!p.shape||p.shape===candidate[i].shape)&&Math.abs(Number(p.Y))<.001&&['X','Z'].every(k=>Math.abs(Number(p[k])-Number(candidate[i][k]))<.05)&&p.size.every((v,j)=>Math.abs(Number(v)-Number(candidate[i].size[j]))<.05));
 })||null;
}
export function payload(d){const row=d.asset?.templates?.[d.template],t=row?.road===d.road?row:null;return {...Object.fromEntries(['road','code','name','category','layer','block','cad','model','post'].map(k=>[k,d[k]])),condition:d.condition||'공통',posts:d.posts||[],...(d.configuration?{configuration:d.configuration}:{}),...(d.positionManual||d.configuration||d.model.startsWith('assembly_')?{placement:d.positionManual?'individual':'configured',X:d.X||'',Y:d.Y||'',Z:d.Z||''}:{placement:'common',spec:t?.spec||'',position:t?.position||''})};}
const option=(value,label,current)=>`<option value="${e(value)}"${value===current?' selected':''}>${e(label)}</option>`;
export function plateChoices(d,options){
 const query=d.query.trim().toLowerCase().replaceAll(',','').replace(/[\s×x*]+/g,' ');
 const matches=p=>query.includes(' ')?`${p.B} ${p.H}`===query:`${p.B} ${p.H}`.includes(query);
 const plates=options.plates.filter(p=>summary(p.form)===d.family&&[p,...p.form.parts].some(matches));
 if(!plates.length)return `<p class="sl-sub">${query?'검색 결과가 없습니다. 검색어를 바꿔보세요.':'선택 가능한 판 OBJ가 없습니다. OBJ를 업로드하세요.'}</p>`;
 return `<div class="gr-plate-sizes" role="group" aria-label="모델 규격">${plates.map(p=>{const selected=p.key===d.model||p.aliases?.includes(d.model);return `<button type="button" data-guide-asset="${e(selected?d.model:p.key)}" aria-pressed="${!!selected}"><span>${p.form.parts.map(p=>`${e(p.B)} × ${e(p.H)}`).join('<br>')}${p.variant?`<small>${e(p.variant)}</small>`:''}</span></button>`;}).join('')}</div>`;
}
export function picker(d,options){
 return `<div class="gr-plate-picker"><div class="gr-picker-toolbar"><nav aria-label="판 형태·장수">${families(options).map(f=>`<button type="button" data-guide-family="${e(f)}" aria-pressed="${d.family===f}">${e(f)}</button>`).join('')}</nav><label><span>규격 (mm)</span><input type="search" name="query" aria-label="폭·높이 검색" value="${e(d.query)}" placeholder="폭·높이 검색" ${d.family?'':'disabled'}></label></div><div data-guide-plate-sizes>${d.family?plateChoices(d,options):'<p class="sl-sub">판 형태를 선택하세요.</p>'}</div></div>`;
}
function placement(d,options){
 for(const row of [d,...(d.posts||[])]){const post=options.postCatalog.find(p=>p.key===row.post);if(post){row.Y=post.installationY??row.Y;if(post.kind==='문형식'&&(row.X===''||row.X==null))row.X='0';}}
 const rows=[d,...(d.posts||[])];
 return rows.map((row,i)=>{
  const chosen=activePost({...d,activePost:i-1});
  return `<div class="gg-new-post-row${(d.activePost??-1)===i-1?' is-current':''}" data-gr-post-row="${i-1}"><label>적용 조건<select name="${i?'extraCondition':'condition'}" data-gr-index="${i-1}" aria-label="${i+1}번째 지주 적용 조건">${laneConditions(d.road).map(c=>option(c,c,row.condition||'공통')).join('')}</select></label><label>지주 형식<select name="${i?'extraPost':'post'}" data-gr-index="${i-1}" aria-label="${i+1}번째 지주 형식">${option('',i?'선택':'지주 없음',row.post)}${options.postCatalog.filter(p=>p.road===d.road).map(p=>option(p.key,postText(p),row.post)).join('')}</select></label>${fields(chosen,`${i+1}번째 지주`,!row.post,options.postCatalog.find(p=>p.key===row.post))}<div class="gr-position-actions">${i?`<button type="button" data-gr-post-remove="${i-1}" aria-label="${i+1}번째 지주 제외">×</button>`:''}</div></div>`;
 }).join('')+'<p data-registration-position-message class="sl-sub" role="status"></p>';
}

export function form(d,options){
 const input=(label,key,extra='')=>panel.field(label,`<input aria-label="${label}" name="${key}" value="${e(d[key])}" ${extra}>`);
 const basics=panel.field('도로 구분',`<select name="road" aria-label="도로 구분">${Object.keys(options.categories).map(road=>option(road,road,d.road)).join('')}</select>`)+input('표지번호','code','required maxlength="40"')+input('표지 이름','name','required maxlength="250"')+panel.field('분류',`<select name="category" aria-label="분류" required>${option('','선택',d.category)}${(options.categories[d.road]||[]).map(c=>option(c,c,d.category)).join('')}</select>`);
 const summary=d.asset?`<span>${e(d.asset.key.startsWith('library:')?'규격':d.asset.label)}</span><span data-guide-model-sizes>${d.asset.form.parts.map(p=>`<span class="sl-size">${e(p.B)} × ${e(p.H)} mm</span>`).join('')}</span>`:'<span>규격 선택</span>';
 const model=panel.modelSection(summary,picker(d,options),true);
 const block=`<input name="block" aria-label="CAD 블록명" value="${e(d.block)}" maxlength="250">`,layer=`<input name="layer" aria-label="CAD 레이어 변수" value="${e(d.layer)}" maxlength="250" required>`;
 return `<form class="sl-guide-registration" autocomplete="off">${panel.body(basics,model,block,layer,placement(d,options),true)}<footer class="sl-guide-new-footer"><button type="submit" class="sl-button sl-primary" ${d.model&&(!d.cad||d.block)?'':'disabled'}>등록</button></footer></form>`;
}
let sequence=0;
export function clear(){sequence++;clearPosition();assetEditor.clear();}
export function syncControls(app,s){const form=app.querySelector('.sl-guide-registration'),d=s.guideRegistrationDraft;if(!form||!d)return;form.querySelector('[type=submit]').disabled=!(d.configuration?assetEditor.validDraft(d.configuration):d.model)||!!form.querySelector('.gpa-inline[aria-invalid=true],[data-gsi-axis][aria-invalid=true]')||[d,...(d.posts||[])].some(row=>row.post&&axes.some(k=>row[k]!==''&&row[k]!=null)&&!complete(activePost({...d,activePost:row===d?-1:d.posts.indexOf(row)})))||[d,...(d.posts||[])].some(row=>row.positionLoading)||!!d.positionError||!!postError(d)||!!d.cad&&!d.block;}
export function shell(){return panel.header(true)+'<div data-guide-registration><p class="sl-sub">모델을 불러오는 중…</p></div>';}
export async function mount(panel,s,api){
 clear();const seq=sequence,area=panel.querySelector('[data-guide-registration]');
 try{
  const options=await api('/api/guide-registration?cadFirst=true');
  if(seq!==sequence||!area.isConnected)return;
  const d=s.guideRegistrationDraft??=initial(s.guideRoad||'고속도로');
  if(!d.family)d.family=families(options)[0]||'';
  let panelEditor,templateRequest;
  const configurePost=()=>{d.asset=configuredAsset(d.configuration,options);changePost(d,d.post);};
  const updatePostMessage=()=>{const message=area.querySelector('[data-registration-position-message]'),chosen=activePost(d);if(message&&!d.positionError)message.textContent=postError(d)||(!assetEditor.validDraft(d.configuration)?'판 크기를 먼저 입력하세요.':!chosen.post?'지주 없음':complete(chosen)?'':'X·Z를 입력하세요.');};
  const loadTemplates=()=>{
   if(!(d.post||d.posts?.some(p=>p.post))||!assetEditor.validDraft(d.configuration)||templateRequest)return;
   templateRequest=api('/api/guide-registration').then(result=>{if(seq!==sequence||!area.isConnected)return;options.plates=result.plates;configurePost();refreshPlacement();}).catch(err=>{if(area.isConnected)area.querySelector('[data-registration-position-message]').textContent=err.message;});
  };
  const mount=()=>{const chosen=activePost(d);mountPosition(area,chosen,options,api,s);d.positionError=chosen.positionError;};
  const draw=()=>{clearPosition();area.innerHTML=form(d,options);modelPreview.mount(area,s);mount();cad.loadDraft(area,d,api,result=>{modelPreview.update(area,s,result);area.dispatchEvent(new window.CustomEvent('guide-cad-preview'));},tag=>modelPreview.highlight(area,s,tag));cadUpload.mount(area,api,d.cadUpload,d.block,(asset,block)=>{d.cad=asset.key;d.cadUpload=asset;d.block=block;draw();});panelEditor=assetEditor.mount(area,s,api,{isNew:true,draft:d.configuration,source:()=>{const chosen=activePost(d);return {...chosen,...Object.fromEntries(['X','Y','Z'].map(k=>[k,chosen.post?chosen[k]:'0']))};},change:configuration=>{d.configuration=configuration;configurePost();updatePostMessage();loadTemplates();syncControls(area,s);},cancel:draw});syncControls(area,s);};
  const refreshPlacement=()=>{area.querySelector('[data-registration-placement]').innerHTML=placement(d,options);mount();updatePostMessage();panelEditor?.refresh();syncControls(area,s);};
  const fillPosition=async index=>{
   const target=index<0?d:d.posts[index];
   if(!target?.post||target.positionManual||!assetEditor.validDraft(d.configuration))return;
   const token=Symbol();target.positionRequest=token;target.positionLoading=true;syncControls(area,s);
   try{
    const result=await api('/api/guide-position-default',{road:d.road,post:target.post,condition:target.condition,configuration:d.configuration});
    if(seq!==sequence||!area.isConnected||target.positionRequest!==token||target.positionManual)return;
    if(result.available){for(const k of axes)target[k]=result[k];target.positionManual=true;}
    else if(options.postCatalog.find(p=>p.key===target.post)?.kind==='문형식')target.X='0';
   }catch(err){if(area.isConnected)area.querySelector('[data-registration-position-message]').textContent=err.message;}
   finally{if(target.positionRequest===token){target.positionLoading=false;if(seq===sequence&&area.isConnected)refreshPlacement();}}
  };
  area.addEventListener('focusin',ev=>{
   if(!ev.target.hasAttribute('data-gsi-axis'))return;
   d.activePost=Number(ev.target.closest('[data-gr-post-row]').dataset.grPostRow);
   area.querySelectorAll('[data-gr-post-row]').forEach(r=>r.classList.toggle('is-current',Number(r.dataset.grPostRow)===d.activePost));
   updatePostMessage();panelEditor?.refresh();panelEditor?.showInstallation(ev.target.dataset.gsiAxis);
  });
  area.addEventListener('keydown',ev=>{if(ev.target.hasAttribute('data-gsi-axis')&&ev.key==='Enter'){ev.preventDefault();ev.target.blur();}});
  area.addEventListener('input',ev=>{
   const input=ev.target;
   if(input.hasAttribute('data-gsi-axis')){
    const index=Number(input.closest('[data-gr-post-row]').dataset.grPostRow),chosen=activePost({...d,activePost:index}),target=index<0?d:d.posts[index];
    if(!target.positionManual)for(const k of axes)target[k]=chosen[k];
    target[input.dataset.gsiAxis]=fromMillimetres(input.value.trim());target.positionManual=true;
    input.setAttribute('aria-invalid',String(!input.value.trim()||!Number.isFinite(Number(input.value))));
    if(complete(target))panelEditor?.refresh();updatePostMessage();syncControls(area,s);
   }
   else if(input.name==='query'){d.query=input.value;area.querySelector('[data-guide-plate-sizes]').innerHTML=plateChoices(d,options);}
   else if(!['X','Y','Z','road','post','model','template'].includes(input.name)&&Object.hasOwn(d,input.name)){
    d[input.name]=input.value;
   }
  });
  area.addEventListener('click',async ev=>{
   if(ev.target.closest('[data-guide-post-add]')){(d.posts??=[]).push({condition:d.condition||'공통',post:''});d.activePost=d.posts.length-1;refreshPlacement();return;}
   const remove=ev.target.closest('[data-gr-post-remove]');
   if(remove){d.posts.splice(Number(remove.dataset.grPostRemove),1);d.activePost=-1;refreshPlacement();return;}
   const row=ev.target.closest('[data-gr-post-row]');if(row){d.activePost=Number(row.dataset.grPostRow);area.querySelectorAll('[data-gr-post-row]').forEach(r=>r.classList.toggle('is-current',r===row));panelEditor?.refresh();if(ev.target.matches('[name=post],[name=extraPost]'))panelEditor?.showInstallation('X');}
   const family=ev.target.closest('[data-guide-family]'),asset=ev.target.closest('[data-guide-asset]');
   if(family){chooseFamily(d,family.dataset.guideFamily);draw();area.querySelector('[data-guide-picker]').open=true;return;}
   if(asset){selectAsset(d,assetForKey(options,asset.dataset.guideAsset));draw();return;}
   
  });
  area.addEventListener('change',async ev=>{
   const input=ev.target;
   if(input.name==='road'){changeRoad(d,input.value);draw();}
   else if(input.name==='template'){selectTemplate(d,Number(input.value));refreshPlacement();}
   else if(input.name==='post'){d.activePost=-1;changePost(d,input.value);loadTemplates();refreshPlacement();await fillPosition(-1);}
   else if(['extraPost','extraCondition','condition'].includes(input.name)){
    if(input.name==='condition')d.condition=input.value;
    else {d.activePost=Number(input.dataset.grIndex);const extra=d.posts[d.activePost];extra[input.name==='extraPost'?'post':'condition']=input.value;if(input.name==='extraPost'){for(const key of ['X','Y','Z','positionManual'])delete extra[key];}}
    loadTemplates();refreshPlacement();if(input.name==='extraPost'){await fillPosition(d.activePost);panelEditor?.showInstallation('X');}
   }
   else if(input.hasAttribute('data-guide-plate-upload')){
    const file=input.files[0];if(!file)return;
    const error=area.querySelector('.sl-error');error.hidden=true;
    const controls=Array.from(area.querySelectorAll('input,select,button'));controls.forEach(c=>c.disabled=true);
    try{
     if(!/\.obj$/i.test(file.name)||file.size>20_000_000)throw new Error('20MB 이하의 OBJ 파일을 선택하세요.');
     const asset=await api('/api/guide-plate-upload?filename='+encodeURIComponent(file.name),file);
     if(seq!==sequence||!area.isConnected)return;
     selectAsset(d,asset);draw();
    }catch(err){if(seq===sequence&&area.isConnected){error.textContent=err.message;error.hidden=false;controls.forEach(c=>c.disabled=false);area.querySelector('[type=submit]').disabled=!d.model;}}
   }
  });
  draw();
 }catch(err){if(seq===sequence&&area.isConnected)area.innerHTML=`<p class="sl-error" role="alert">${e(err.message)}</p><button type="button" data-guide-new>다시 불러오기</button>`;}
}
