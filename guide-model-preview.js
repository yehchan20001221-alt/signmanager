/* 같은 CAD 응답을 2D와 OBJ 앞면에 사용한다. 선택·입력 변경 전 응답은 버린다. */
import {e} from './views.js';
import {initial,viewport,position} from './model-camera.js';
import * as viewer from './guide-viewer.js';
let sequence=0,textureSequence=0,highlightSequence=0,observer,rendered,revision,events,frame;
const models=new Map();
export function clear(){sequence++;textureSequence++;highlightSequence++;observer?.disconnect();observer=null;rendered=null;frame=null;events?.abort();}
export function mount(root,s){
 events?.abort();events=new window.AbortController();
 const key=s.guideNew?'new':s.guideSelected;
 if(s.guideViewerKey!==key){s.guideViewer=null;s.guideViewerKey=key;}
 viewer.state(s).overlay=true;
 root.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-guide-view],[data-guide-focus]');if(!b)return;
  const ui=viewer.state(s);ev.stopPropagation();
  if(b.dataset.guideView){ui.view=b.dataset.guideView;s.guideSignCamera={...initial(),yaw:ui.view==='front'?0:-.18,pitch:ui.view==='front'?0:-.05};}
  if(b.dataset.guideFocus){ui.focus=b.dataset.guideFocus;ui.part=-1;s.guideSignCamera=null;}
  draw(root,s);
 },{signal:events.signal});
 root.addEventListener('keydown',ev=>{
  if(!ev.target.matches('.sl-solid-canvas')||!['Enter','ArrowLeft','ArrowRight'].includes(ev.key)||!viewer.state(s).overlay)return;
  const fields=s.guideCadPreview?.fields||[];if(!fields.length)return;
  ev.preventDefault();const index=fields.findIndex(f=>f.tag===s.guideHighlightTag),next=index<0?0:(index+(ev.key==='ArrowLeft'?-1:1)+fields.length)%fields.length;
  root.querySelector('[data-guide-cad]')?.dispatchEvent(new window.CustomEvent('guide-cad-select',{detail:{tag:fields[next].tag}}));
 },{signal:events.signal});
 viewer.sync(root,s);
}
export function pick(root,s,event,rotation){
 if(!rotation||rotation.key!=='guideSignCamera'||!viewer.state(s).overlay)return;
 if(Math.hypot(event.clientX-rotation.x,event.clientY-rotation.y)>4){root.querySelector('[data-guide-cad]')?.dispatchEvent(new window.CustomEvent('guide-cad-select',{detail:{tag:''}}));return;}
 const target=root.querySelector('[data-guide-model] .sl-solid-canvas');if(!target||!frame?.pick)return;
 const point=position(target.getBoundingClientRect(),event.clientX,event.clientY).point;
 const tag=frame.pick(...point,s.guideCadPreview?.fields||[]);
 root.querySelector('[data-guide-cad]')?.dispatchEvent(new window.CustomEvent('guide-cad-select',{detail:{tag,clientX:event.clientX,clientY:event.clientY}}));
}
export async function readModel(s,api,name=''){
 if(revision!==s.revision){models.clear();revision=s.revision;}
 const url=`/api/guides/${encodeURIComponent(s.guideSelected)}/model?name=${encodeURIComponent(name)}`;
 if(!models.has(url)){
  if(models.size>=8)models.delete(models.keys().next().value);
  const pending=api(url).catch(err=>{if(models.get(url)===pending)models.delete(url);throw err;});models.set(url,pending);
 }
 return models.get(url);
}
export function mappedModel(model,textures=[],projected=false){
 const faces=model.faces.slice();
 for(const {face,panel,uv,uvClip,cutout,projected:projection} of (projected?model.drawing_projection?.faces:model.texture_faces)||[]){
  if(textures[panel])faces[face]={ids:model.faces[face],uv,uvClip,texture:textures[panel],cutout,projected:projection,pickBounds:textures[panel].pickBounds};
 }
 return {...model,faces};
}
export function withoutPosts(model){
 const vertices=[],faces=[],materials=[],indexes=new Map();
 const posts=model.post_faces?new Set(model.post_faces):null;
 model.faces.forEach((face,i)=>{
  if(posts?posts.has(i):['steel','concrete'].includes(model.materials?.[i]?.toLowerCase()))return;
  const ids=(Array.isArray(face)?face:face.ids).map(id=>{
   if(!indexes.has(id)){indexes.set(id,vertices.length);vertices.push(model.vertices[id]);}
   return indexes.get(id);
  });
  faces.push(Array.isArray(face)?ids:{...face,ids});materials.push(model.materials?.[i]);
 });
 return {...model,vertices,faces,materials};
}
export function controls(model,hidePost=false){
 if(!model?.available&&!model?.choices?.length)return '';
 const isPlate=name=>name==='plate'||name?.startsWith('plate:');
 const all=model.choices||[],choices=all.filter(c=>!isPlate(c.name));
 const selected=all.find(c=>c.name===model.name),plate=all.find(c=>c.name===(selected?.plate_name||'plate'));
 const plateName=isPlate(model.name)?model.name:model.available&&!model.position_missing?'':plate?.name;
 const button=(name,label,title=label,missing=false,position=false)=>`<button type="button" data-guide-model-choice value="${e(name)}" aria-pressed="${name?name===model.name&&(!hidePost||isPlate(name)):hidePost||!!model.plate_only}" title="${e(title)}">${e(label)}${missing||position?`<span class="gp-model-warning${missing?'':' is-warning'}" role="img" aria-label="${missing?'지주 OBJ 미등록':'판 설치 좌표 미입력'}">!</span>`:''}</button>`;
 return `<div class="sl-sign-preview-choice" role="group" aria-label="미리보기 지주">${plateName!==undefined?button(plateName,'지주 없음','선택한 형식의 표지판만 표시합니다.'):''}${choices.map(c=>button(c.name,c.short_label||(c.original?c.kind+' · 원본':c.kind),c.label,c.model_missing,c.position_missing)).join('')}</div>`;
}
export function ruleWarnings(model,ids){
 const statuses=(model?.rule_status||[]).filter(r=>ids.includes(r.rule)&&r.message);
 const messages=[...new Set(statuses.map(r=>r.message))];
 const label=messages.join(' · ');
 return label?`<span class="gp-model-warning${statuses.every(r=>r.severity==='warning')?' is-warning':''}" role="img" tabindex="0" aria-label="${e(label)}" title="${e(label)}">!</span>`:'';
}
function drawChoices(root,s){
 const target=root.querySelector('[data-guide-model-choices]');
 if(target)target.innerHTML=controls(s.guideModel,s.guideHidePost);
}
export function choose(root,s,api,name){
 if(!s.guideModel||(!name&&(!s.guideModel.available||s.guideModel.position_missing)))return;
 s.guideSignCamera=null;s.guideHidePost=!name;
 if(name&&name!==s.guideModel.name)return load(root,s,api,name);
 drawChoices(root,s);draw(root,s);
}
export function texture(svg){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>{
   try{
    const scale=1024/Math.max(img.naturalWidth,img.naturalHeight),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
    resolve(ctx.getImageData(0,0,canvas.width,canvas.height));
   }catch(err){reject(err);}
  };
  img.onerror=()=>reject(new Error('3D 도안을 불러오지 못했습니다.'));
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 });
}
export async function update(root,s,result,readTexture=texture){
 const seq=++textureSequence;highlightSequence++;s.guideTextures=[];s.guideBaseTextures=[];s.guideCadPreview=result;s.guideHighlightTag='';s.guideHighlightCache=new Map();
 s.guideTextureMessage=result===null?'도안을 불러오는 중…':result.error||(result.available||(s.guideNew&&!s.guideRegistrationDraft?.block)?'':'연결된 CAD 도안이 없습니다.');
 draw(root,s);
 if(!result?.available)return;
 try{
  const [textures,sheet]=await Promise.all([Promise.all((result.textures||[]).map(readTexture)),result.texture_sheet?readTexture(result.texture_sheet):null]);
  if(seq!==textureSequence)return;
  if(sheet)textures[-1]=sheet;
  textures.forEach((image,i)=>{if(result.texture_regions?.[i])image.pickBounds=result.texture_regions[i];});
  s.guideBaseTextures=textures;s.guideTextures=textures;s.guideTextureMessage='';draw(root,s);
  if(s.guideHighlightTag)await highlight(root,s,s.guideHighlightTag,readTexture);
 }catch(err){if(seq===textureSequence){s.guideTextureMessage=err.message;draw(root,s);}}
}
export async function highlight(root,s,tag,readTexture=texture){
 const seq=++highlightSequence,result=s.guideCadPreview,base=s.guideBaseTextures,ui=viewer.state(s);
 const redraw=()=>{draw(root,s);(root.querySelector('[data-guide-cad]')||root).dispatchEvent?.(new window.CustomEvent('guide-cad-highlight',{bubbles:true}));};
 s.guideHighlightTag=tag;if(tag)ui.overlay=true;s.guideTextures=base;redraw();
 const svg=result?.available&&result.highlights?.[tag]?.texture_sheet;if(!svg||!base?.[-1])return;
 try{
  if(!s.guideHighlightCache.has(tag))s.guideHighlightCache.set(tag,Promise.all([readTexture(svg),Promise.all((result.highlights[tag].textures||[]).map(readTexture))]));
  const [image,parts]=await s.guideHighlightCache.get(tag);if(seq!==highlightSequence||result!==s.guideCadPreview)return;
  const textures=base.map((texture,i)=>parts[i]?{...viewer.combine(texture,parts[i]),pickBounds:texture.pickBounds}:texture);textures[-1]=viewer.combine(base[-1],image);s.guideTextures=textures;redraw();
 }catch(err){if(seq===highlightSequence){s.guideTextureMessage=err.message;draw(root,s);}}
}
function panelSizes(model){
 const sizes=model?.mapping_sizes?.obj||[];
 if(!sizes.length)return `<span class="sl-sub">${!model?'표지판 크기를 불러오는 중…':model.plate_missing?'판 OBJ 미연결':'모델 표지판 크기 확인 불가'}</span>`;
 return `<span class="sl-chips">${sizes.map((size,i)=>{
  const valid=Array.isArray(size)&&size.length===2&&size.every(v=>Number.isFinite(Number(v))&&Number(v)>0);
  return `<span class="sl-size">${sizes.length>1?`판 ${i+1} · `:''}${valid?size.map(v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1})).join(' × '):'크기 확인 불가'}</span>`;
 }).join('')}</span>`;
}
export function draw(root,s){
 const target=root.querySelector('[data-guide-model]');if(!target||target.hidden)return;
 drawChoices(root,s);
 viewer.sync(root,s);
 const model=s.guideModel;
 const sizes=root.querySelector('[data-guide-model-sizes]');if(sizes)sizes.innerHTML=panelSizes(model);
 const alert=root.querySelector('[data-guide-model-alert]');
 if(alert){
  const sizes=model?.mapping_sizes,valid=size=>size?.length===2&&size.every(v=>Number.isFinite(Number(v))&&Number(v)>0);
  const number=v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
  const format=size=>size.map(number).join(' × ');
  const cad=sizes?.cad_extent,obj=sizes?.obj_extent||(sizes?.obj?.length===1?sizes.obj[0]:null);
  const comparable=!model?.mapping_count_mismatch&&valid(obj)&&valid(cad);
  const comparison=model?.mapping_count_mismatch?model.mapping_error:comparable?`모델 크기 ${format(obj)} mm / CAD 크기 약 ${format([obj[0],Number(obj[0])*Number(cad[1])/Number(cad[0])])} mm — 서로 다릅니다.`:'모델과 CAD의 판 구성이 다릅니다.';
  alert.hidden=!model?.mapping_error;
  alert.innerHTML=model?.mapping_error?`<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 6v7m0 3v1" stroke="white" stroke-width="2"/></svg><span>${e(comparison)}</span>`:'';
  alert.title=model?.mapping_error?`${model.mapping_error}${comparable?'\nCAD 크기는 같은 폭으로 맞춘 비율 환산값입니다.':''}`:'';
 }
 if(model?.available){
  const ui=viewer.state(s),size=viewport(target.getBoundingClientRect()),key=[target,model,s.guideTextures,s.guideHidePost,JSON.stringify(s.guideSignCamera),JSON.stringify(ui),size.join(',')];
  if(!rendered||key.some((v,i)=>v!==rendered[i])){
   const focused=target.contains?.(target.ownerDocument?.activeElement);
   const compatible=model.cad_block===undefined||model.cad_block===s.guideCadPreview?.block;
   let preview=mappedModel(model,ui.overlay&&compatible?s.guideTextures:[],true);if(s.guideHidePost)preview=withoutPosts(preview);
   s.guideSignCamera??={...initial(),yaw:ui.view==='front'?0:-.18,pitch:ui.view==='front'?0:-.05};
   frame=preview.faces.length?viewer.render(preview,s,size):null;
   target.innerHTML=frame?.html||'<div class="sl-guide-model-empty" role="alert"><span class="gp-model-warning" role="img" aria-label="오류">!</span><p>판 모델이 없습니다. OBJ를 연결하세요.</p></div>';rendered=key;
   if(focused)target.querySelector('.sl-solid-canvas')?.focus({preventScroll:true});
  }
 }else if(model?.model_missing||model?.plate_missing){
  rendered=null;target.innerHTML=`<div class="sl-guide-model-empty" role="alert"><span class="gp-model-warning" role="img" aria-label="오류">!</span>${model.post_label?`<strong>${e(model.post_label)}</strong>`:''}<p>${model.plate_missing?'판 모델이 없습니다. OBJ를 연결하세요.':'지주 OBJ를 등록하세요.'}</p><small>${e(model.message)}</small></div>`;
 }else{
  rendered=null;target.innerHTML=`<div class="sl-empty" role="status"><p>${e(model?.message||'3D 모델을 불러오는 중입니다…')}</p>${model?.model_status?.length?`<dl class="sl-guide-model-status">${model.model_status.map(row=>`<dt>${e(row.label)}</dt><dd>${e(row.value)}</dd>`).join('')}</dl>`:''}</div>`;
 }
 root.querySelector('.sl-guide-model-stage')?.classList.toggle('is-unavailable',!model?.available);
 const status=root.querySelector('[data-guide-mapping]');
 if(status){
  status.innerHTML=model?.position_missing?(model.position_rules?.length===0?'등록 후 설치 위치를 지정하세요.':`<button type="button" data-guide-position-open="${e(model.position_rules?JSON.stringify(model.position_rules):'')}" title="선택한 판 규격과 지주의 설치 위치 편집">설치 위치를 지정하세요 →</button>`):model?.available?e(s.guideTextureMessage||(!model.drawing_projection&&!model.mapped_panels&&model.source!=='registration'?'원본 모델에 도안 적용 불가':'')):'';
 }

}
export async function load(root,s,api,name=''){
 const target=root.querySelector('[data-guide-model]');if(!target)return;
 const seq=++sequence;s.guideModel=null;s.guideSignCamera=null;drawChoices(root,s);draw(root,s);
 observer?.disconnect();observer=new window.ResizeObserver(()=>draw(root,s));observer.observe(target);
 try{
  let model=await readModel(s,api,name);
  if(seq!==sequence||!target.isConnected)return;
  const choice=model.choices?.find(c=>c.rules?.includes(s.guideModelRule));
  if(choice&&choice.name!==model.name)model=await readModel(s,api,choice.name);
  if(seq!==sequence||!target.isConnected)return;
  s.guideModelRule='';
  s.guideModel=model;if(model.plate_only)s.guideHidePost=true;
  s.guideModelName=model.name;drawChoices(root,s);draw(root,s);
 }catch(err){if(seq===sequence&&target.isConnected){s.guideModel={message:err.message,error:err.message};draw(root,s);}}
}
