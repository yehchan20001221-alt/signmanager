/* 공용 수량을 현재 대상 ID에 묶어 편집한다. 빈칸과 0을 구분한다. */
import {e} from './views.js';
import {automatic,effectiveRows,number,items} from './quantity-auto.js';
import {material,defaults,itemChoice,unitChoice} from './quantity-material.js';

const columns=[['item','수량 항목','수량항목'],['material','재료 규격','재료규격'],['value','수량','값'],['unit','단위','단위']];
const quantityOrder=new Map([...items,'철근'].map((item,index)=>[item,index]));
export function quantityRow(q={},extended=false){
 const fields=extended?[...columns,['condition','적용조건','적용조건'],['source','근거','근거']]:columns;
 return `<tr data-quantity-id="${e(q['수량ID']||'')}">${fields.map(([key,label,column])=>`<td>${key==='unit'?unitChoice(q[column]||''):key==='item'?itemChoice(q[column]||''):key==='material'?material(q['수량항목'],q[column]||'',true):`<input data-quantity-field="${key}" ${['condition','source'].includes(key)||key==='value'&&(q['수량ID']||extended)?'':'required'} aria-label="${label}" value="${e(q[column]??'')}" ${key==='value'?'type="number" min="0" step="any" placeholder="미등록"':'type="text"'}>`}</td>`).join('')}${q['수량ID']?'<td></td>':'<td><button type="button" data-remove-quantity aria-label="입력 행 제거">×</button></td>'}</tr>`;
}
export function quantityRows(rows,kind){
 const templates=['지주기초','안내지주'].includes(kind)?[['콘크리트','m³'],['터파기','m³'],['되메우기','m³'],['거푸집','m²']]:[];
 const missing=templates.filter(([item])=>!rows.some(q=>q['수량항목']===item)).map(([item,unit])=>({수량항목:item,단위:unit,재료규격:defaults[item]}));
 return [...rows,...missing];
}
export function quantityTable(t,kind,id){
 const rows=t.quantities.filter(q=>q['대상종류']===kind&&q['대상ID']===id&&q['수량항목']);
 const all=rows.some(automatic)?rows.filter(q=>!automatic(q)):quantityRows(rows,kind);
 const groups=new Map();
 for(const q of rows.filter(automatic)){const key=q['수량항목']+'|'+q['재료규격'];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);}
 const materials=groups.size?`<table class="sl-quantity-table sl-auto-materials"><thead><tr><th>문서 연결 항목</th><th>재료 규격</th></tr></thead><tbody>${[...groups.values()].map(group=>{
  const q=group[0],different=rows.some(r=>automatic(r)&&r['수량항목']===q['수량항목']&&r['재료규격']!==q['재료규격']);
  return `<tr data-auto-quantity-ids="${e(JSON.stringify(group.map(q=>q['수량ID'])))}"><th>${e(q['수량항목'])}${different?`<small>${e(group.map(q=>q['적용조건']).filter(Boolean).join(' · '))}</small>`:''}</th><td>${material(q['수량항목'],q['재료규격']||defaults[q['수량항목']]||'',true)}</td></tr>`;
 }).join('')}</tbody></table>`:'';
 return `<div class="wide">${materials}<div class="sl-table-scroll"><table class="sl-quantity-table sl-bulk-quantities"><thead><tr>${(kind==='안내지주'?[...columns,['condition','적용조건'],['source','근거']]:columns).map(([,label])=>`<th>${label}</th>`).join('')}<th></th></tr></thead><tbody>${all.map(q=>quantityRow(q,kind==='안내지주')).join('')}</tbody></table></div><div class="sl-quantity-actions"><button type="button" data-action="more-rebar">철근 추가</button><button type="button" data-action="more-quantity">수량 항목 추가</button></div></div>`;
}
export function quantityValues(form,includeUnchanged=false){
 if(form.querySelector?.('[data-inline-quantities]'))return inlineValues(form,includeUnchanged);
 const rows=[...form.querySelectorAll('.sl-bulk-quantities tbody tr')].map(row=>({id:row.dataset.quantityId,...Object.fromEntries([...row.querySelectorAll('[data-quantity-field]')].map(el=>[el.dataset.quantityField,el.value.trim()]))}));
 return rows.concat([...form.querySelectorAll('[data-auto-quantity-ids]')].flatMap(row=>JSON.parse(row.dataset.autoQuantityIds).map(id=>({id,material_only:true,material:row.querySelector('[data-quantity-field=material]').value.trim()}))));
}

export function inlineTable(t,id){
 const rows=t.quantities.filter(q=>q['대상종류']==='지주기초'&&q['대상ID']===id&&q['수량항목']);
 return inlineQuantities(rows);
}
export function inlineQuantities(rows=[],isNew=false){
 const all=quantityRows(effectiveRows(rows),'지주기초');
 if(!all.some(q=>q['수량항목']==='철근'))all.push({수량항목:'철근',단위:'t'});
 const conditions=new Set(all.map(q=>q['적용조건']).filter(Boolean)),groups=new Map();
 for(const q of all){const key=conditions.size>1?q['적용조건']||'':'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);}
 for(const group of groups.values())group.sort((a,b)=>(quantityOrder.get(a['수량항목'])??quantityOrder.size)-(quantityOrder.get(b['수량항목'])??quantityOrder.size));
 const body=[...groups].map(([condition,items])=>`${conditions.size>1?`<tr class="sl-quantity-condition-heading"><th colspan="5">${e(condition.replace(/^\d+(?:\.\d+)+\s*:\s*/,'')||'공통 수량')}</th></tr>`:''}${items.map(q=>inlineRow(q,isNew)).join('')}`).join('');
 return `<p class="sl-sub">지주·기초 전체 1개소${isNew?'':' · 더블클릭하여 수정'}</p><table class="sl-quantity-table sl-inline-quantities" data-inline-quantities><thead><tr>${columns.map(([,label])=>`<th>${label}</th>`).join('')}<th></th></tr></thead><tbody>${body}</tbody></table><div class="sl-quantity-actions"><button type="button" data-action="more-rebar">철근 추가</button><button type="button" data-action="more-quantity">수량 항목 추가</button></div>`;
}
export function inlineRow(q={},isNew=false){
 const values=Object.fromEntries(columns.map(([key,,column])=>[key,String(q[column]??'')]));
 return `<tr data-inline-quantity data-quantity-id="${e(q['수량ID']||'')}" data-automatic="${automatic(q)}" data-condition="${e(q['적용조건']||'')}" data-original="${e(JSON.stringify(values))}">${columns.map(([key,label])=>{
  const input=key==='unit'?unitChoice(values[key]):key==='item'?itemChoice(values[key]):key==='material'?material(q['수량항목'],values[key]):`<input class="sl-input" data-quantity-field="${key}" aria-label="${label}" value="${e(values[key])}" ${key==='value'?'type="number" inputmode="decimal" min="0" step="any"':''}>`;
  return `<td>${isNew?input:`<button type="button" class="sl-quantity-cell" ${(automatic(q)||q.document)&&key==='item'?'disabled':`data-quantity-edit="${key}"`} aria-label="${e((q['수량항목']||'새 항목')+' '+label+' 수정')}" title="더블클릭 또는 Enter로 수정">${e(key==='value'&&values[key]!==''?number(values[key]):values[key])||'<span class="sl-sub">미등록</span>'}</button><span data-quantity-input hidden>${input}</span>`}</td>`;
 }).join('')}<td>${q['수량ID']||q.document?'':'<button type="button" data-remove-quantity aria-label="입력 행 제거">×</button>'}</td></tr>`;
}
function inlineValues(form,includeUnchanged=false){
 return [...form.querySelectorAll('[data-inline-quantity]')].flatMap(row=>{
  const values=Object.fromEntries([...row.querySelectorAll('[data-quantity-field]')].map(el=>[el.dataset.quantityField,el.value.trim()]));
  const original=JSON.parse(row.dataset.original);
  if(!includeUnchanged&&columns.every(([key])=>values[key]===original[key]))return [];
  const payload={id:row.dataset.quantityId,...values,condition:row.dataset.condition};
  if(row.dataset.automatic!=='true')return [payload];
  const edits=values.material!==original.material?[{id:payload.id,material_only:true,material:values.material}]:[];
  if(values.value!==original.value||values.item!==original.item||values.unit!==original.unit)edits.push({...payload,id:'',override_id:payload.id,source:'작업자 입력'});
  return edits;
 });
}
export function editCell(target,focus=true){
 const button=target.closest('[data-quantity-edit]');if(!button)return false;
 const area=button.nextElementSibling,input=area.querySelector('input,select');
 button.hidden=true;area.hidden=false;if(focus){input.focus();input.select?.();}return true;
}
export function finishCell(target,cancel=false){
 const area=target.closest('[data-quantity-input]');if(!area)return;
 if(!cancel&&!target.checkValidity())return;
 const button=area.previousElementSibling;
 if(cancel)target.value=button.dataset.value??JSON.parse(target.closest('tr').dataset.original)[target.dataset.quantityField];
 button.dataset.value=target.value;button.textContent=target.value===''?'미등록':target.dataset.quantityField==='value'?number(target.value):target.value;
 if(cancel||!area.closest?.('[data-quantity-editing=true]')){area.hidden=true;button.hidden=false;}
}
