/* 신규·상세 공용 판 조합 편집. 적용 전에는 불변 파일만 만들고 DB 연결은 바꾸지 않는다. */
import {e} from './views.js';
import {draw} from './guide-model-preview.js';
import {pieceGroups,pieceLabel} from './guide-piece-groups.js';
const option=(key,label,current)=>`<option value="${e(key)}" ${key===current?'selected':''}>${e(label)}</option>`;
export const slot=()=>'<section class="ga-editor" data-guide-asset-editor><button type="button" class="sl-button" data-ga-open>판 구성·배치 편집</button><p class="ga-message" role="status"></p></section>';
export const save=(root,payload)=>new Promise((resolve,reject)=>root.dispatchEvent(new window.CustomEvent('guide-configuration-save',{bubbles:true,detail:{payload,resolve,reject}})));

export function editor(draft,assets,conditions,current,layoutOnCanvas=false){
 return `<div class="ga-head"><strong>판 구성</strong>${conditions?.length?`<label>적용 조건 <select data-ga-condition>${conditions.map(c=>option(c.id,c.label,current)).join('')}</select></label>`:''}<span>mm</span></div>
 <div class="ga-table"><table><colgroup><col style="width:34%">${layoutOnCanvas?'':'<col><col><col>'}<col style="width:28px"></colgroup><thead><tr><th>판 · 규격</th>${layoutOnCanvas?'':'<th>X</th><th>Y</th><th>Z</th>'}<th></th></tr></thead><tbody>${draft.parts.map((p,i)=>`<tr data-ga-row="${i}"><td><input data-ga-field="name" aria-label="판 ${i+1} 이름" value="${e(p.name)}" maxlength="50"><select data-ga-field="piece" aria-label="판 ${i+1} 규격">${pieceGroups(assets,p.piece).map(a=>option(a.key,pieceLabel(a),p.piece)).join('')}</select><label>CAD 판<select data-ga-field="cadPanel" aria-label="판 ${i+1} CAD 연결">${option('-1','자동 연결',String(p.cadPanel??-1))}${Array.from({length:draft.cadCount||0},(_,n)=>option(String(n),String(n+1),String(p.cadPanel))).join('')}</select></label></td>${(layoutOnCanvas?[]:['X','Y','Z']).map(k=>`<td><input type="number" step="any" min="-50000" max="50000" data-ga-field="${k}" aria-label="판 ${i+1} ${k}" value="${e(p[k])}"></td>`).join('')}<td><button type="button" data-ga-remove="${i}" aria-label="판 ${i+1} 삭제" ${draft.parts.length===1?'disabled':''}>×</button></td></tr>`).join('')}</tbody></table></div>
 <div class="ga-actions"><button type="button" class="sl-button" data-ga-add ${draft.parts.length===8?'disabled':''}>판 추가</button><label class="sl-button">판 OBJ 추가<input type="file" accept=".obj" data-ga-obj hidden></label><span></span><button type="button" class="sl-button" data-ga-cancel>취소</button><button type="button" class="sl-button sl-primary" data-ga-apply>적용·저장</button></div><p class="ga-message" role="status"></p>`;
}

export function mount(root,s,api,config){
 const area=root.querySelector('[data-guide-asset-editor]');if(!area)return;
 let draft,assets=[],current=config.current||config.conditions?.[0]?.id||'',busy=false,timer,sequence=0,changed=false,source;
 const message=(text,error=false)=>{const el=area.querySelector('.ga-message');if(el){el.textContent=text;el.classList.toggle('sl-error',error);}};
 const show=()=>{area.innerHTML=editor(draft,assets,config.conditions,current,config.layoutOnCanvas);if(config.conditions?.length){area.querySelector('.ga-head').insertAdjacentHTML('beforeend',`<input data-ga-condition-name aria-label="설치 조건 이름" maxlength="100" value="${e(draft.conditionName)}"><button type="button" class="sl-button" data-ga-copy>새 조건으로 복사</button>`);}else area.querySelector('[data-ga-apply]').textContent='구성 적용';};
 const refresh=async()=>{assets=(await api('/api/guide-assets')).assets;};
 const run=async fn=>{if(busy)return;busy=true;area.setAttribute('aria-busy','true');try{await fn();}catch(err){message(err.message,true);}finally{busy=false;area.removeAttribute('aria-busy');}};
 const preview=async()=>{
  if(!draft)return;const seq=++sequence;
  try{
   const result=await api('/api/guide-assets/preview',{...source,configuration:draft});
   if(seq!==sequence||!area.isConnected)return;
   if(config.preview)config.preview(result);
   else{s.guideModel={...result,available:true,source:'registration',cad_block:source.block};s.guideHidePost=false;draw(root,s);}
  }catch(err){if(seq===sequence&&area.isConnected)message(err.message,true);}
 };
 const schedule=()=>{changed=true;area.dataset.changed='true';clearTimeout(timer);timer=setTimeout(preview,250);};
 const open=async()=>{
  if(area.closest('[data-layout-changed=true]'))throw Error('판 배치 변경을 먼저 저장하거나 취소하세요.');
  source=config.source(current);if(!source.model)throw Error('판 모델을 먼저 선택하세요.');
  area.innerHTML='<p class="ga-message" role="status">개별 판을 불러오는 중…</p>';
  draft=await api('/api/guide-assets/split',source);await refresh();
  draft.conditionName=config.conditions?.find(c=>c.id===current)?.label||'';
  if(!area.isConnected)return;show();changed=false;area.dataset.changed='false';area.dispatchEvent(new window.CustomEvent('guide-assets-editor-open',{bubbles:true}));
 };
 area.addEventListener('input',ev=>{
  if(ev.target.hasAttribute('data-ga-condition-name')){draft.conditionName=ev.target.value;changed=true;area.dataset.changed='true';return;}
  const field=ev.target.dataset.gaField,row=ev.target.closest('[data-ga-row]');if(!field||!row)return;
  draft.parts[Number(row.dataset.gaRow)][field]=['X','Y','Z','cadPanel'].includes(field)?Number(ev.target.value):ev.target.value;schedule();
 });
 area.addEventListener('change',ev=>run(async()=>{
  if(ev.target.hasAttribute('data-ga-condition')){
   if(changed&&!window.confirm('적용하지 않은 판 변경을 취소할까요?')){ev.target.value=current;return;}
   sequence++;clearTimeout(timer);current=ev.target.value;await open();return;
  }
  if(ev.target.dataset.gaField==='piece'){show();return;}
  const file=ev.target.files?.[0];if(!file)return;
  if(ev.target.hasAttribute('data-ga-obj')){const asset=await api('/api/guide-plate-upload?filename='+encodeURIComponent(file.name),file);await api('/api/guide-assets/split',{model:asset.key});await refresh();show();message('판을 추가했습니다. 규격 목록에서 선택하세요.');}
 }));
 area.addEventListener('click',ev=>{
  const button=ev.target.closest('button');if(!button)return;
  run(async()=>{
   if(button.hasAttribute('data-ga-open')){await open();return;}
   if(button.hasAttribute('data-ga-add')){const p=draft.parts[0];draft.parts.push({...p,id:window.crypto.randomUUID(),name:'보조판',Z:p.Z+(assets.find(a=>a.key===p.piece)?.H||0)+100});show();schedule();}
   if(button.hasAttribute('data-ga-remove')){draft.parts.splice(Number(button.dataset.gaRemove),1);show();schedule();}
   if(button.hasAttribute('data-ga-cancel')){if(changed&&!window.confirm('적용하지 않은 판 변경을 취소할까요?'))return;sequence++;clearTimeout(timer);area.dataset.changed='false';config.cancel?.();area.innerHTML='<button type="button" class="sl-button" data-ga-open>판 구성·배치 편집</button>';draft=null;}
   if(button.hasAttribute('data-ga-apply')||button.hasAttribute('data-ga-copy')){sequence++;clearTimeout(timer);const asset=await api('/api/guide-assets/assemble',draft),copy=button.hasAttribute('data-ga-copy'),label=area.querySelector('[data-ga-condition-name]')?.value;await config.apply(asset,current,label===undefined?{}:{condition:copy&&label===config.conditions.find(c=>c.id===current)?.label?label+' (복사)':label,copy});changed=false;area.dataset.changed='false';}
  });
 });
}
