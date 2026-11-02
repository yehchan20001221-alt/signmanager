/* 지주 수량을 같은 화면에서 편집한다. 문서값은 보존하고 사용자 변경값을 별도 저장한다. */
import {e} from './views.js';
import {effectiveRows} from './quantity-auto.js';
import {inlineQuantities,inlineRow,quantityValues,editCell} from './quantity-editor.js';
import {changeMaterial,defaults} from './quantity-material.js';

export function visibleRows(result,choice=''){
 const calc=result.calculation,cases=calc?.cases||[],selected=cases.find(c=>c.id===choice)||cases[0]||calc;
 const saved=effectiveRows(result.rows).filter(q=>!q['적용조건']||!cases.length||q['적용조건']===selected?.id);
 const same=(q,r)=>q['수량항목']===r.item&&(q['적용조건']||'')===(r.condition||'')&&(r.item!=='철근'||q['재료규격']===r.material);
 const generated=(selected?.rows||[]).filter(r=>!saved.some(q=>same(q,r))).map(r=>({수량항목:r.item,값:r.value,단위:r.unit,재료규격:r.material||defaults[r.item]||'',적용조건:r.condition||selected?.id||'',등록상태:'등록',document:true}));
 return {rows:[...saved,...generated],selected,cases};
}
export function mount(target,result,post,s){
 const state=s.guideStandardsUI;let editing=false;
 const render=()=>{
  const {rows,selected,cases}=visibleRows(result,state.postQuantityChoice);
  target.innerHTML=`${cases.length?`<label class="gp-quantity-choice">적용 조건<select data-gq-condition>${cases.map(c=>`<option value="${e(c.id)}" ${c.id===selected.id?'selected':''}>${e(c.label)}</option>`).join('')}</select></label>`:''}<div class="gq-inline">${inlineQuantities(rows).replace(' · 더블클릭하여 수정','').replace(/<div class="sl-quantity-actions">[\s\S]*?<\/div>$/,'')}<div class="gq-actions"><button type="button" data-gq-edit>수정</button><button type="button" data-gq-add hidden>항목 추가</button><button type="button" data-gq-cancel hidden>취소</button><button type="button" class="sl-primary" data-gq-save hidden>수정 완료</button></div><p role="status"></p></div>${selected?.message?`<details class="gp-quantity-reference"><summary>수량 근거</summary><p>${e(selected.message)}</p></details>`:''}`;
  target.dataset.layoutChanged='false';target.dataset.quantityEditing='false';editing=false;
  target.querySelectorAll('[data-inline-quantity]').forEach(row=>{if(!row.dataset.quantityId&&!row.dataset.condition&&selected?.id)row.dataset.condition=selected.id;});
 };
 const begin=()=>{editing=true;target.dataset.layoutChanged='true';const choice=target.querySelector('[data-gq-condition]');if(choice)choice.disabled=true;target.querySelectorAll('[data-gq-add],[data-gq-cancel],[data-gq-save]').forEach(b=>b.hidden=false);target.querySelector('[data-gq-edit]').hidden=true;};
 target.ondblclick=ev=>{if(ev.target.closest('[data-quantity-edit]')){begin();editCell(ev.target);}};
 target.onkeydown=ev=>{if(ev.key==='Enter'&&ev.target.closest('[data-quantity-edit]'))begin();};
 target.oninput=()=>{if(!editing)begin();};
 target.onchange=ev=>{if(ev.target.matches('[data-gq-condition]')){state.postQuantityChoice=ev.target.value;render();}else changeMaterial(ev.target);};
 target.onclick=async ev=>{
  const button=ev.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-gq-cancel')){render();return;}
  if(button.hasAttribute('data-gq-edit')){begin();target.dataset.quantityEditing='true';target.querySelectorAll('[data-quantity-edit]').forEach(b=>editCell(b,false));return;}
  if(button.hasAttribute('data-gq-add')){const body=target.querySelector('tbody');body.insertAdjacentHTML('beforeend',inlineRow({},true));body.lastElementChild.dataset.condition=target.querySelector('[data-gq-condition]')?.value||'';return;}
  if(button.hasAttribute('data-remove-quantity')){button.closest('tr').remove();begin();return;}
  if(!button.hasAttribute('data-gq-save'))return;
  const message=target.querySelector('[role=status]');message.textContent='';
  const invalid=[...target.querySelectorAll('[data-quantity-field]')].find(el=>!el.checkValidity());
  if(invalid){message.textContent='수량은 0 이상의 숫자로 입력하세요. 항목·재료 규격·단위도 확인하세요.';return;}
  const rows=quantityValues(target);
  if(!rows.length){render();return;}
  if(!window.confirm('변경한 단위수량을 저장할까요?'))return;
  const controls=target.querySelectorAll('button,select,input');controls.forEach(el=>el.disabled=true);
  try{await new Promise((resolve,reject)=>target.dispatchEvent(new window.CustomEvent('post-quantities-save',{bubbles:true,detail:{payload:{target_kind:result.target_kind||'안내지주',target_id:result.target_id||post.key,rows},resolve,reject}})));}
  catch(err){message.textContent=err.message;controls.forEach(el=>el.disabled=false);}
 };
 render();
}
