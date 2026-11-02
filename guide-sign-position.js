/* 신규·상세 공용 XYZ 입력. mm로 편집하고 m로 저장하며 공유 변경만 확인창을 사용한다. */
import {e} from './views.js';
import {toMillimetres,fromMillimetres} from './guide-positions.js';
export const axes=['X','Y','Z'];
export const complete=row=>axes.every(k=>row[k]!==''&&row[k]!=null&&Number.isFinite(Number(row[k])));
export const differs=(a,b)=>axes.some(k=>(a[k]===''||a[k]==null)!==(b[k]===''||b[k]==null)||Number(a[k])!==Number(b[k]));
export function resolvedPosition(row,posts=[]){
 if(!row)return row;
 const post=posts.find(p=>p.key===row['지주형식']);
 return {...row,Y:post?.installationY??row.Y,X:post?.kind==='문형식'&&(row.X===''||row.X==null)?'0':row.X};
}
export function fields(row,label,disabled=false,post={}){
 return `<div class="gsi-inline-fields">${['X','Z'].map(k=>{const auto=k==='X'&&post.kind==='문형식';return `<label><span>${k}</span><input type="text" inputmode="decimal" data-gsi-axis="${k}" aria-label="${e(label+' '+k+' (mm)')}" value="${e(auto?'자동':toMillimetres(row[k]))}" ${disabled||auto?'disabled ':''}${auto?'data-gsi-auto title="미리보기는 지주 중심에 맞춥니다. 실제 X는 Way에서 계산합니다."':'placeholder="미등록"'}>${auto?'':'<small>mm</small>'}</label>`;}).join('')}</div>`;
}
export function peers(items){
 return `<p>같은 판 구성·크기, 같은 지주와 설치값을 쓰는 표지입니다. 함께 바꿀 표지를 선택하세요.</p><div class="gsi-peers">${items.map((p,i)=>`<label><input type="checkbox" data-gsi-peer="${i}"><img src="/api/guides/${encodeURIComponent(p.id)}/image" alt="${e(p.code+' '+p.name)}"><strong>${e(p.code)} ${e(p.name)}</strong><span>${e(p.conditions.join(' · '))}</span></label>`).join('')}</div>`;
}
export function confirmPeers(info,values){
 if(!info.candidates?.length)return Promise.resolve([]);
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='gsi-dialog';
  dialog.innerHTML=`<header><h2>다른 표지도 함께 바꿀까요?</h2><button type="button" data-gsi-cancel aria-label="닫기">×</button></header><p class="gsi-summary">${e(info.code)} · ${e(info.condition)}<b>${e(info.postLabel)}</b></p><p>${['X','Z'].map(k=>`${k} ${e(toMillimetres(info.source[k]))} → ${e(toMillimetres(values[k]))}`).join(' / ')} mm</p>${peers(info.candidates)}<footer><button type="button" data-gsi-cancel>취소</button><button type="button" data-gsi-only>이 표지만 적용</button><button type="button" class="sl-primary" data-gsi-selected disabled>선택한 표지와 적용</button></footer>`;
  dialog.setAttribute('aria-label','다른 표지도 함께 바꿀까요?');document.body.append(dialog);dialog.showModal();let result=null;
  dialog.addEventListener('change',()=>{dialog.querySelector('[data-gsi-selected]').disabled=!dialog.querySelector('[data-gsi-peer]:checked');});
  dialog.addEventListener('click',ev=>{
   if(ev.target.closest('[data-gsi-only]')){result=[];dialog.close();}
   if(ev.target.closest('[data-gsi-selected]')){result=[...dialog.querySelectorAll('[data-gsi-peer]:checked')].flatMap(el=>info.candidates[Number(el.dataset.gsiPeer)].rules);dialog.close();}
   if(ev.target.closest('[data-gsi-cancel]'))dialog.close();
  });
  dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});resolve(result);},{once:true});
  dialog.querySelector('[data-gsi-only]').focus();
 });
}
export function mount(root,s,api,rules,editor,signal){
 const area=root.querySelector('[data-registration-placement]'),drafts=new Map();let busy=false;
 area.insertAdjacentHTML('beforeend','<div class="gsi-inline-actions" hidden><span role="status" data-gsi-message></span><button type="button" data-gsi-reset>취소</button><button type="button" class="sl-primary" data-gsi-apply>적용</button></div>');
 const message=area.querySelector('[data-gsi-message]'),actions=area.querySelector('.gsi-inline-actions');
 const sync=()=>{area.dataset.layoutChanged=String(!!drafts.size);actions.hidden=!drafts.size;area.querySelector('[data-gsi-apply]').disabled=busy||[...drafts.values()].some(d=>!complete(d));area.querySelector('[data-gsi-reset]').disabled=busy;area.querySelectorAll('[data-gsi-axis]').forEach(input=>{input.readOnly=busy;});};
 const source=id=>resolvedPosition(drafts.get(id)||rules.find(r=>r['기준ID']===id),s.guidePostCatalog);
 const save=async plate=>{
  if(busy)return;
  if([...drafts.values()].some(d=>!complete(d)))throw Error('수정한 행의 X·Z를 모두 숫자로 입력하세요.');
  if(root.querySelector('.gpa-inline[aria-invalid=true]'))throw Error('판 크기와 간격 입력을 확인하세요.');
  busy=true;sync();message.textContent='';
  try{
   const positions=[...drafts].map(([id,row])=>({rules:[id],...Object.fromEntries(axes.map(k=>[k,row[k]])),also:[]}));
   for(const row of positions){
    if(!plate){const info=await api('/api/guide-sign-position',{id:s.guideSelected,rules:row.rules});const also=await confirmPeers(info,row);if(also===null)return;row.also=also;}
   }
   const payload={id:s.guideSelected,positions,current:s.guideModelRule,...(plate?{plate}:{})};
   await new Promise((resolve,reject)=>root.dispatchEvent(new window.CustomEvent('guide-position-save',{bubbles:true,detail:{payload,resolve,reject}})));
  }finally{busy=false;if(area.isConnected)sync();}
 };
 area.addEventListener('focusin',async ev=>{
  const input=ev.target.closest('[data-gsi-axis]');if(!input)return;
  const id=input.closest('[data-gsp-rule]').dataset.gspRule;
  await editor().selectCondition(id);editor().showInstallation(input.dataset.gsiAxis);
 },{signal});
 area.addEventListener('input',ev=>{
  const input=ev.target.closest('[data-gsi-axis]');if(!input)return;
  const id=input.closest('[data-gsp-rule]').dataset.gspRule,original=rules.find(r=>r['기준ID']===id),row={...source(id)};
  row[input.dataset.gsiAxis]=fromMillimetres(input.value.trim());
  input.setAttribute('aria-invalid',String(input.value.trim()===''||!Number.isFinite(Number(input.value))));
  if(differs(row,original))drafts.set(id,row);else drafts.delete(id);
  sync();message.textContent=complete(row)?'':'수정한 행의 X·Z를 입력하세요.';
  if(complete(row))editor().refresh();
 },{signal});
 area.addEventListener('keydown',ev=>{if(ev.target.hasAttribute('data-gsi-axis')&&ev.key==='Enter'){ev.preventDefault();ev.target.blur();}},{signal});
 area.addEventListener('click',async ev=>{
  if(ev.target.closest('[data-gsi-reset]')&&!busy){drafts.clear();for(const input of area.querySelectorAll('[data-gsi-axis]')){if(!input.disabled)input.value=toMillimetres(source(input.closest('[data-gsp-rule]').dataset.gspRule)[input.dataset.gsiAxis]);input.removeAttribute('aria-invalid');}message.textContent='';sync();editor().refresh();}
  if(ev.target.closest('[data-gsi-apply]')){try{await save(editor().pending());}catch(err){message.textContent=err.message;}}
 },{signal});
 return {source,save};
}
