/* 표지별 판 구성 초안. 공용 개별 판은 재사용하고 배치·CAD 영역만 최종 적용 시 저장한다. */
import {e} from './views.js';
import {pieceGroups,pieceLabel} from './guide-piece-groups.js';
import {draw as drawModel,mappedModel} from './guide-model-preview.js';
import {positionDrawing} from './guide-position-drawing.js';
import {state as viewerState} from './guide-viewer.js';
import {previewQueue} from './guide-cad.js';
import {save} from './guide-asset-editor.js';
import {fromRegions,resizePart,placeRegion,sizeValid} from './guide-cad-layout.js';
import {setDimension,dimensionEdit,mainParts,numberParts,positionPart} from './guide-panel-layout.js';
import {plan} from './guide-cad-plan.js';
import {pixelRegions,coordinateMarkup} from './cad-coordinates.js';
export {save};
const copy=value=>JSON.parse(JSON.stringify(value));
const number=value=>Math.round(Number(value)*1000)/1000;
const CAD_OUTPUT_SIZE=2000;
export const slot=()=>'<section class="gsp-editor" data-guide-asset-editor data-sign-panels><p role="status">판 구성을 불러오는 중…</p></section>';
export const sharesPlate=(a,b)=>a.plateGroup&&b.plateGroup?a.plateGroup===b.plateGroup:!!a.model&&a.model===b.model;
export function regionFor(part,regions){
 if(part.cadUnmapped)return null;
 if(part.cadRegion){
  // 이전 편집기가 CAD 영역을 소수 셋째 자리로 잘랐던 연결만 원본 경계로 복원한다.
  return regions?.boxes?.find(box=>box.every((v,i)=>number(v)===part.cadRegion[i]))||part.cadRegion;
 }
 const box=regions?.boxes?.[part.cadPanel]||(part.cadCrop?regions?.frame:null);
 if(!box)return null;
 const crop=part.cadCrop||[0,0,1,1];
 return [box[0]+crop[0]*box[2],box[1]+crop[1]*box[3],box[2]*crop[2],box[3]*crop[3]];
}
export function pixelCoordinates(draft,regions){
 return pixelRegions(draft.parts.map(part=>regionFor(part,regions)),regions?.frame);
}
export function coordinateTable(draft,regions,outputSize=CAD_OUTPUT_SIZE,selected=0){
 return coordinateMarkup(pixelCoordinates(draft,regions),outputSize,selected);
}
export function assignRegion(part,region){
 delete part.cadCrop;delete part.cadUnmapped;part.cadPanel=-1;
 if(region)part.cadRegion=region.slice();else{delete part.cadRegion;part.cadUnmapped=true;}
}
export function addPart(draft,piece){
 const index=draft.parts.length;
 if(index>=8)throw Error('판은 8장까지 추가할 수 있습니다.');
 let id=1;while(draft.parts.some(p=>p.id==='p'+id))id++;
 const part={id:'p'+id,name:`${index+1}번 판`,piece:piece.key,X:0,Y:0,Z:0,width:Number(piece.B),background:'',cadPanel:-1,cadUnmapped:true};
 draft.parts.push(part);return part;
}
export function validDraft(draft){return !!draft?.parts?.length&&draft.parts.every(p=>(p.size?sizeValid(p.size):p.piece)&&p.shape!=='unknown'&&['X','Y','Z'].every(k=>p[k]!==''&&Number.isFinite(Number(p[k]))&&Math.abs(Number(p[k]))<=50000)&&(!p.cadRegion||(p.cadRegion.every(v=>v!==''&&Number.isFinite(Number(v)))&&p.cadRegion[2]>0&&p.cadRegion[3]>0)));}
export function conditionButtons(conditions=[],current='',view='3d',source){
 const named=conditions.filter(c=>c.label!=='기본값'),visible=named.length?named:conditions;
 if(view==='cad'&&source&&visible.length&&visible.every(c=>sharesPlate(source(visible[0].id),source(c.id))))return '';
 const labels=[...new Set(visible.map(c=>c.label))];
 return labels.length>1?`<div role="group" aria-label="적용 조건">${labels.map(label=>{
  const group=visible.filter(c=>c.label===label),choice=group.find(c=>c.id===current)||group[0];
  return `<button type="button" data-gsp-condition="${e(choice.id)}" aria-pressed="${group.some(c=>c.id===current)}" title="${e(label)}">${e(label)}</button>`;
 }).join('')}</div>`:'';
}
export function editor(isNew=false){
 return `<p class="gsp-message" role="status"></p><div class="gsp-footer"><span data-gsp-complete role="status"></span>${isNew?'':`<div class="gsp-actions" data-gsp-actions hidden><button type="button" data-gsp-cancel>취소</button><button type="button" class="sl-primary" data-gsp-apply disabled>적용</button></div>`}</div>`;
}
export function popover(draft,assets,current){
 const selected=draft.parts[current],choices=pieceGroups(assets,selected?.piece);
 return `<header><strong>${selected?`${current+1}번 판`:'판 추가'}</strong><button type="button" data-gsp-dismiss aria-label="판·도안 수정 닫기">×</button></header>
 <details class="gsp-advanced"><summary>판·도안 수정</summary>
 ${selected?`<div class="gsp-model-row" data-gsp-row="${current}"><select data-gsp-piece aria-label="${current+1}번 판 기존 규격"><option value="">입력 규격 사용</option>${choices.map(a=>`<option value="${e(a.key)}" ${a.key===selected.piece?'selected':''}>${e(pieceLabel(a))}</option>`).join('')}</select><button type="button" data-gsp-remove="${current}">판 삭제</button></div>${!selected.piece?`<label>판 모양<select data-gsp-shape aria-label="판 모양">${[['unknown','모양 확인'],['rectangle','사각형'],['circle','원형'],['arrow-left','왼쪽 화살표'],['arrow-right','오른쪽 화살표'],['arrow-both','양쪽 화살표']].map(([v,t])=>`<option value="${v}" ${v===selected.shape?'selected':''}>${t}</option>`).join('')}</select></label>`:''}<button type="button" data-gsp-remap>도안 영역 다시 지정</button>`:''}
 <div class="gsp-add"><select data-gsp-add-piece aria-label="추가할 개별 판">${choices.map(a=>`<option value="${e(a.key)}">${e(pieceLabel(a))}</option>`).join('')}</select><button type="button" data-gsp-add ${draft.parts.length>=8||!choices.length?'disabled':''}>판 추가</button><button type="button" data-gsp-blank ${draft.parts.length>=8?'disabled':''}>영역 직접 지정</button><label class="sl-button">OBJ 추가<input type="file" accept=".obj" data-gsp-upload hidden></label></div></details>
 <button type="button" class="gsp-popover-done" data-gsp-dismiss>확인</button>`;
}
let active;
export function clear(){active?.();active=null;}
export function mount(root,s,api,config){
 clear();const area=root.querySelector('[data-sign-panels]');if(!area)return;
 const events=new window.AbortController();let stopped=false,loading=true,sequence=0,timer,draft={parts:[]},assets=[],regions={boxes:[],frame:null},selected=0,changed=false,busy=false,mapping=false;
 let condition=config.conditions?.find(c=>c.id===config.current)?.id||config.conditions?.[0]?.id||'',source;
 const workspace=root.querySelector('[data-gsp-workspace]'),canvas=root.querySelector('[data-gsp-main-plan]'),installation=root.querySelector('[data-gsp-installation]');
 let renderedPosition,renderedCondition;
 const renderInstallation=()=>{
  if(!installation||!['installation','plan'].includes(workspace?.dataset.gspWorkspace))return;
  if(!source?.post){installation.innerHTML='<div class="gsp-plan-empty">지주를 선택하세요.</div>';return;}
  if(!['X','Y','Z'].every(k=>(s.guideModel?.preview_position||source)[k]!==''&&(s.guideModel?.preview_position||source)[k]!=null)){installation.innerHTML='<div class="gsp-plan-empty">설치 위치 X·Z를 입력하세요.</div>';return;}
  if(!s.guideModel?.available||renderedCondition!==condition||!renderedPosition){installation.innerHTML=`<div class="gsp-plan-empty" role="status">${e(s.guideModel?.message||'설치 위치를 불러오는 중…')}</div>`;return;}
  const box=installation.getBoundingClientRect();
  installation.innerHTML=positionDrawing(mappedModel(s.guideModel,s.guideTextures||[],true),renderedPosition,undefined,[0,0,box.width,box.height],undefined,[workspace.dataset.gspWorkspace==='plan'?'plan':'front'],{mode:'installation'});
 };
 const fit=()=>{if(workspace)workspace.style.height=Math.max(300,Math.min(600,window.innerHeight-workspace.getBoundingClientRect().top-(config.isNew?80:16)))+'px';};
 let popup,sizeEdit,restoringFocus=false;
 if(workspace){popup=document.createElement('section');popup.className='gsp-popover';popup.setAttribute('role','dialog');popup.setAttribute('aria-label','판·도안 수정');popup.hidden=true;workspace.append(popup);}
 const openPopup=()=>{if(!popup)return;popup.innerHTML=popover(draft,assets,selected);popup.hidden=false;popup.querySelector('.gsp-advanced').open=true;popup.querySelector('select')?.focus({preventScroll:true});};
 const renderConditions=()=>{const choices=root.querySelector('[data-gsp-conditions]');if(choices)choices.innerHTML=conditionButtons(config.conditions,condition,workspace?.dataset.gspWorkspace,config.source);root.querySelectorAll('[data-gsp-condition]').forEach(b=>b.disabled=loading);};
 const mode=value=>{if(!workspace)return;workspace.dataset.gspWorkspace=value;workspace.querySelectorAll('[data-gsp-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gspMode===value)));renderConditions();if(value==='3d'){viewerState(s).view='3d';drawModel(root,s);}else if(value==='cad')renderPlan();else renderInstallation();};
 const hydrate=()=>{const identity=draft.parts[selected]?.id;draft.parts.forEach(p=>{const a=assets.find(a=>a.key===p.piece);if(a){if(!p.size)p.size=[Number(a.B),Number(a.H)];p.shape=a.shape;}const r=regionFor(p,regions);if(r)assignRegion(p,r);});if(draft.parts.length&&draft.parts.every(p=>p.piece))draft.calibrated=true;numberParts(draft.parts,!!draft.calibrated);selected=Math.max(0,draft.parts.findIndex(p=>p.id===identity));};
 const renderPlan=()=>{
  const coordinates=root.querySelector('[data-gsp-coordinates]');if(coordinates){const focus=coordinates.querySelector('button:focus')?.dataset.gspSelect;coordinates.innerHTML=loading?'':coordinateTable(draft,regions,CAD_OUTPUT_SIZE,selected);coordinates.hidden=loading||!draft.parts.length;if(focus!==undefined)coordinates.querySelector(`[data-gsp-select="${focus}"]`)?.focus({preventScroll:true});}
  if(!canvas)return;if(loading){canvas.innerHTML='<div class="gsp-plan-empty" role="status">판과 도안을 불러오는 중…</div>';return;}const focused=canvas.querySelector('.gpa-inline:focus'),key=focused?.hasAttribute('data-gsp-size')?`[data-gsp-size="${focused.dataset.gspSize}"]`:`[data-gpa-gap="${focused?.dataset.gpaGap}"]`;
  if(mapping){drawing();return;}
  canvas.innerHTML=plan(draft,regions.frame,s.guideCadPreview?.texture_sheet,selected,Math.max(330,canvas.clientWidth),Math.max(320,canvas.clientHeight-28),s.guideCadPreview?.highlights?.[s.guideHighlightTag]?.texture_sheet);
  if(focused){const replacement=canvas.querySelector(key);if(replacement){replacement.replaceWith(focused);restoringFocus=true;try{focused.focus({preventScroll:true});}finally{restoringFocus=false;}}}
 };
 const warnings=()=>{
  const missing=draft.parts.map((p,i)=>sizeValid(p.size)?null:i+1).filter(Boolean);
  const complete=area.querySelector('[data-gsp-complete]');if(complete)complete.textContent=missing.length?`${missing.join('·')}번 판의 크기를 입력하세요.`:changed&&!config.isNew?'변경사항 미적용':'';
  const actions=area.querySelector('[data-gsp-actions]');if(actions)actions.hidden=!changed;
 };
 const message=(text,error=false)=>{const el=area.querySelector('.gsp-message');if(el){el.textContent=text;el.classList.toggle('sl-error',error);}};
 const queue=previewQueue(value=>api('/api/guide-assets/preview',value),result=>{
  if(stopped||!area.isConnected)return;
  const post=source.post&&['X','Y','Z'].every(k=>source[k]!==''&&source[k]!=null);
  const rules=config.isNew?[]:condition?[condition]:[];
  s.guideHidePost=!post;
  s.guideModel={...result,source:'registration',cad_block:source.block,name:'configured',position_rules:rules,choices:post?[{name:'configured',kind:'지주 포함',label:'선택한 지주와 함께 표시',rules,post:source.post}]:[],plate_only:!post,position_missing:!!source.post&&!post};renderedPosition=copy(source);renderedCondition=condition;drawModel(root,s);renderInstallation();
 },err=>{message(err.message,true);if(installation)installation.innerHTML=`<div class="gsp-plan-empty" role="alert">${e(err.message)}</div>`;});
 const refresh=()=>{
  clearTimeout(timer);queue.invalidate();source=config.source(condition);
  if(!validDraft(draft)){s.guideModel={message:draft.parts.length?'각 판의 폭과 높이를 입력하면 3D로 확인할 수 있습니다.':'CAD 블록을 업로드하고 판 크기를 입력하세요.'};drawModel(root,s);if(installation)installation.innerHTML=`<div class="gsp-plan-empty">${e(s.guideModel.message)}</div>`;return;}
  timer=setTimeout(()=>{const placed=source.post&&['X','Y','Z'].every(k=>source[k]!==''&&source[k]!=null);queue.update({...source,post:placed?source.post:'',...Object.fromEntries(['X','Y','Z'].map(k=>[k,placed?source[k]:'0'])),configuration:copy(draft)});},180);
 };
 const mark=()=>{changed=true;area.dataset.changed='true';config.change?.(copy(draft));area.querySelectorAll('[data-gsp-apply]').forEach(b=>b.disabled=!validDraft(draft)||!!canvas?.querySelector('[aria-invalid=true]'));message('');warnings();renderPlan();refresh();};
 const sheet=()=>s.guideCadPreview?.texture_sheet;
 const drawing=()=>{
  const target=canvas,part=draft.parts[selected];if(!mapping||!target||!part)return;
  const frame=regions.frame,region=regionFor(part,regions);
  if(!frame||!sheet()){target.innerHTML='<div class="gsp-plan-empty">CAD 블록을 연결하면 도안 영역을 지정할 수 있습니다.</div>';return;}
  const [x,y,w,h]=frame,mapHeight=1000*h/w,rect=box=>`${(box[0]-x)/w*1000} ${(y+h-box[1]-box[3])/h*mapHeight} ${box[2]/w*1000} ${box[3]/h*mapHeight}`.split(' '),svgRect=(box,attrs)=>{const [rx,ry,rw,rh]=rect(box);return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" ${attrs}/>`;};
  const width=Math.min(target.clientWidth-24,(target.clientHeight-48)*w/h);
  target.innerHTML=`<svg data-gsp-map viewBox="0 0 1000 ${mapHeight}" width="${width}" height="${width*h/w}" role="img" aria-label="CAD 도안 영역 선택"><image href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(sheet())}" width="1000" height="${mapHeight}" preserveAspectRatio="none"/>${regions.boxes.map((box,i)=>svgRect(box,`class="gsp-candidate" data-gsp-candidate="${i}"`)).join('')}${region?svgRect(region,'class="gsp-region"'):''}</svg><div class="gsp-map-tools"><span>${selected+1}번 판 영역 · 클릭 또는 드래그로 지정</span><button type="button" data-gsp-end-map>취소</button></div>`;
 };
 const show=()=>{area.innerHTML=editor(config.isNew);renderConditions();root.querySelectorAll('[data-gsp-rule]').forEach(row=>row.classList.toggle('is-current',row.dataset.gspRule===condition));drawing();warnings();renderPlan();const apply=area.querySelector('[data-gsp-apply]');if(apply)apply.disabled=!changed||!validDraft(draft);};
 const run=async fn=>{if(busy)return;busy=true;try{await fn();}catch(err){message(err.message,true);}finally{busy=false;const apply=area.querySelector('[data-gsp-apply]');if(apply)apply.disabled=!changed||!validDraft(draft);}};
 const loadRegions=async()=>{const seq=++sequence;source=config.source(condition);try{const result=await api('/api/guide-assets/cad-regions',{block:source.block||'',cad:source.cad||''});if(stopped||seq!==sequence)return;regions=result;
  if(!draft.parts.length&&regions.boxes.length){draft=fromRegions(regions);config.change?.(copy(draft));}
  hydrate();show();if(regions.boxes.length>8)message('판 영역이 8개를 초과합니다. 연결할 영역을 확인하세요.',true);
 }catch(err){if(!stopped&&seq===sequence){regions={boxes:[],frame:null};drawing();message(err.message,true);}}};
 const load=async()=>{
  loading=true;queue.invalidate();clearTimeout(timer);source=config.source(condition);viewerState(s).part=-1;root.querySelectorAll('[data-gsp-condition]').forEach(b=>b.disabled=true);renderPlan();
  try{draft=config.draft?copy(config.draft):source.model?await api('/api/guide-assets/split',{model:source.model}):{parts:[]};assets=(await api('/api/guide-pieces')).assets;assets.sort((a,b)=>Number(a.B)-Number(b.B)||Number(a.H)-Number(b.H));
   if(stopped||!area.isConnected)return;selected=0;changed=false;area.dataset.changed='false';hydrate();show();await loadRegions();
   if(!config.draft&&source.model&&regions.frame&&!draft.parts.some(p=>p.cadPanel>=0||p.cadRegion||p.cadCrop||p.cadUnmapped)){
    const assigned=await api('/api/guide-assets/split',{model:source.model,block:source.block,cad:source.cad||''});
    if(stopped)return;draft=assigned;hydrate();show();
   }
   loading=false;show();refresh();
  }catch(err){if(!stopped){loading=false;area.innerHTML='<p class="gsp-message" role="alert"></p><button type="button" data-gsp-retry>다시 불러오기</button>';if(canvas)canvas.innerHTML='<div class="gsp-plan-empty">판 구성을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.</div>';message(err.message,true);}}
 };
 const selectCondition=async next=>{
  if(!next||loading||next===condition)return;
  if(sharesPlate(config.source(condition),config.source(next))){condition=next;s.guideModelRule=condition;popup.hidden=true;mapping=false;show();refresh();return;}
  if(changed&&!window.confirm('적용하지 않은 판 변경을 취소할까요?'))return;
  condition=next;s.guideModelRule=condition;popup.hidden=true;mapping=false;await load();
 };
 root.addEventListener('focusin',ev=>{
  if(ev.target.hasAttribute('data-gsp-size')&&!restoringFocus){sizeEdit=copy(draft);popup.hidden=true;}
  const rule=ev.target.closest('[data-gsp-rule]')?.dataset.gspRule;
  if(rule!==condition&&ev.target.matches('.sl-guide-editor [name=value]'))run(()=>selectCondition(rule));
 },{signal:events.signal});
 root.addEventListener('input',ev=>{
  const part=draft.parts[selected];if(!part)return;
  if(ev.target.hasAttribute('data-gsp-size')){const axis=Number(ev.target.dataset.gspSize),size=[...((sizeEdit||draft).parts[selected].size||['',''])];size[axis]=ev.target.value===''?'':Number(ev.target.value);try{if(sizeEdit)draft=copy(sizeEdit);resizePart(draft,selected,size);if(sizeValid(size))draft.parts[selected].width=Number(size[0]);const valid=Number.isFinite(size[axis])&&size[axis]>0&&size[axis]<=50000;ev.target.setAttribute('aria-invalid',String(!valid));mark();if(!valid&&ev.target.value!=='')message('폭과 높이는 0보다 크고 50,000 mm 이하로 입력하세요.',true);}catch(err){message(err.message,true);}}
  if(ev.target.hasAttribute('data-gsp-region')){const region=[...(regionFor(part,regions)||[0,0,0,0])];region[Number(ev.target.dataset.gspRegion)]=ev.target.value===''?'':Number(ev.target.value);assignRegion(part,region);if(ev.target.value==='')part.cadRegion[Number(ev.target.dataset.gspRegion)]='';mark();}
 },{signal:events.signal});
 root.addEventListener('change',ev=>run(async()=>{
  if(ev.target.hasAttribute('data-gsp-piece')){selected=Number(ev.target.closest('[data-gsp-row]').dataset.gspRow);const part=draft.parts[selected];part.piece=ev.target.value;const a=assets.find(a=>a.key===part.piece);if(a){resizePart(draft,selected,[Number(a.B),Number(a.H)]);part.width=Number(a.B);part.shape=a.shape;}else part.shape='rectangle';show();mark();openPopup();}
  if(ev.target.hasAttribute('data-gsp-shape')){draft.parts[selected].shape=ev.target.value;mark();}
  if(ev.target.hasAttribute('data-gsp-region'))drawing();
  if(ev.target.hasAttribute('data-gsp-upload')){
   const file=ev.target.files?.[0];if(!file)return;
   if(!/\.obj$/i.test(file.name)||file.size>20_000_000)throw Error('20MB 이하의 개별 판 OBJ를 선택하세요.');
   const asset=await api('/api/guide-plate-upload?filename='+encodeURIComponent(file.name),file),imported=await api('/api/guide-assets/split',{model:asset.key});
   if(imported.parts.length!==1)throw Error('개별 판 한 장의 OBJ를 선택하세요.');
   assets=(await api('/api/guide-pieces')).assets;addPart(draft,assets.find(a=>a.key===imported.parts[0].piece));selected=draft.parts.length-1;hydrate();show();mark();
  }
 }),{signal:events.signal});
 root.addEventListener('click',ev=>run(async()=>{
  const b=ev.target.closest('button');if(!b)return;
  const nextCondition=b.dataset.gspCondition||(b.hasAttribute('data-guide-edit')?b.closest('[data-gsp-rule]')?.dataset.gspRule:null);
  if(nextCondition){await selectCondition(nextCondition);if(b.hasAttribute('data-guide-edit')&&JSON.parse(b.dataset.guideEdit).field==='연결지주'&&root.querySelector('[data-gsp-workspace]')?.dataset.gspWorkspace==='cad')mode('installation');return;}
  if(b.hasAttribute('data-gsp-retry')){await load();return;}
  if(b.hasAttribute('data-gsp-dismiss')){popup.hidden=true;}
  if(b.hasAttribute('data-gsp-tools')){mapping=false;mode('cad');openPopup();}
  if(b.hasAttribute('data-gsp-remap')){popup.hidden=true;mapping=true;renderPlan();}
  if(b.hasAttribute('data-gsp-end-map')){mapping=false;renderPlan();}
  if(b.hasAttribute('data-gsp-remove')){draft.parts.splice(Number(b.dataset.gspRemove),1);selected=Math.max(0,Math.min(selected,draft.parts.length-1));hydrate();popup.hidden=true;show();mark();}
  if(b.hasAttribute('data-gsp-add')){addPart(draft,assets.find(a=>a.key===root.querySelector('[data-gsp-add-piece]').value));selected=draft.parts.length-1;hydrate();popup.hidden=true;show();mark();}
  if(b.hasAttribute('data-gsp-blank')){let id=1;while(draft.parts.some(p=>p.id==='p'+id))id++;draft.parts.push({id:'p'+id,name:`${draft.parts.length+1}번 판`,piece:'',shape:'rectangle',size:['',''],X:0,Y:0,Z:0,background:'',cadPanel:-1,cadUnmapped:true});selected=draft.parts.length-1;popup.hidden=true;mapping=true;show();mark();}
  if(b.hasAttribute('data-gsp-unlink')){assignRegion(draft.parts[selected],null);drawing();mark();}
  if(b.hasAttribute('data-gsp-cancel')){area.dataset.changed='false';config.cancel?.();}
  if(b.hasAttribute('data-gsp-apply')){if(!validDraft(draft)||canvas?.querySelector('[aria-invalid=true]'))throw Error('판 크기와 위치 입력을 확인하세요.');b.disabled=true;await config.apply(copy(draft),condition);}
 }),{signal:events.signal});
 let start;
 const point=(ev,map)=>{const box=map.getBoundingClientRect(),f=regions.frame;return [f[0]+Math.max(0,Math.min(1,(ev.clientX-box.left)/box.width))*f[2],f[1]+(1-Math.max(0,Math.min(1,(ev.clientY-box.top)/box.height)))*f[3]];};
 root.addEventListener('pointerdown',ev=>{const map=ev.target.closest('[data-gsp-map]');if(!map||ev.button!==0)return;ev.preventDefault();map.setPointerCapture(ev.pointerId);start={point:point(ev,map),x:ev.clientX,y:ev.clientY,map,candidate:ev.target.dataset.gspCandidate};},{signal:events.signal});
 root.addEventListener('pointerup',ev=>{if(!start)return;const from=start;start=null;const to=point(ev,from.map);let region;
  if(Math.hypot(ev.clientX-from.x,ev.clientY-from.y)<5){if(from.candidate===undefined)return;region=regions.boxes[Number(from.candidate)];}
  else region=[Math.min(from.point[0],to[0]),Math.min(from.point[1],to[1]),Math.abs(from.point[0]-to[0]),Math.abs(from.point[1]-to[1])];
  if(!region||Math.min(...region.slice(2))<=0)return;if(!regionFor(draft.parts[selected],regions))placeRegion(draft,selected,region);assignRegion(draft.parts[selected],region);hydrate();mapping=false;mark();
 },{signal:events.signal});
 root.addEventListener('guide-cad-preview',()=>{if(!loading)loadRegions().then(refresh);},{signal:events.signal});
 root.addEventListener('guide-cad-highlight',()=>{renderPlan();renderInstallation();},{signal:events.signal});
 root.addEventListener('click',ev=>{
  const axis=ev.target.closest('[data-gi-axis]');
  if(axis&&installation?.contains(axis)){root.querySelector(`.is-current [data-gsi-axis="${axis.dataset.giAxis}"]`)?.focus();return;}
  const button=ev.target.closest('[data-gsp-mode]'),part=ev.target.closest('[data-gsp-plan-part]'),row=ev.target.closest('[data-gsp-coordinate]');
  if(button){popup.hidden=true;mode(button.dataset.gspMode);}
  if(row&&!loading){selected=Number(row.dataset.gspCoordinate);mapping=false;popup.hidden=true;mode('cad');warnings();}
  if(part){selected=Number(part.dataset.gspPlanPart);popup.hidden=true;show();}
 },{signal:events.signal});
 root.addEventListener('keydown',ev=>{if(['Enter',' '].includes(ev.key)&&ev.target.hasAttribute('data-gi-axis')){ev.preventDefault();ev.target.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}if(popup&&!popup.hidden&&(ev.key==='Escape'||ev.key==='Enter')&&ev.target.closest('.gsp-popover')){ev.preventDefault();popup.hidden=true;}},{signal:events.signal});
 canvas?.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.matches('.gpa-inline')){ev.preventDefault();ev.target.blur();renderPlan();}else if(['Enter',' '].includes(ev.key)&&ev.target.hasAttribute('data-gsp-plan-part')){ev.preventDefault();ev.target.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}},{signal:events.signal});
 canvas?.addEventListener('input',ev=>{const key=ev.target.dataset.gpaGap;if(!key)return;try{const edit=dimensionEdit(key),target=edit.kind==='reverse'?edit.from:edit.to;if(target!==positionPart(draft.parts,selected)||target===[...mainParts(draft.parts)][0])throw Error('첫 번째 본판은 기준 위치로 고정됩니다.');setDimension(draft.parts,[],edit,ev.target.value);ev.target.removeAttribute('aria-invalid');mark();}catch(err){ev.target.setAttribute('aria-invalid','true');root.querySelectorAll('[data-gsp-apply],.sl-guide-registration [type=submit]').forEach(b=>b.disabled=true);message(err.message,true);}},{signal:events.signal});
 root.addEventListener('change',ev=>{if(ev.target.name==='post'||ev.target.name==='template')mode('3d');},{signal:events.signal});
 window.addEventListener('resize',fit,{signal:events.signal});fit();
 const observer=new window.ResizeObserver(()=>{fit();drawModel(root,s);renderPlan();renderInstallation();});const target=root.querySelector('[data-guide-model]');if(target)observer.observe(target);if(canvas)observer.observe(canvas);if(installation)observer.observe(installation);
 active=()=>{stopped=true;sequence++;clearTimeout(timer);queue.stop();events.abort();observer.disconnect();popup?.remove();};load();
 return {refresh,selectCondition,pending:()=>changed?{rules:[condition],configuration:copy(draft)}:null,showInstallation:axis=>{popup.hidden=true;mode(axis==='Y'?'plan':'installation');},show3d:()=>mode('3d')};
}
