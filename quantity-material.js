/* 산출서에서 확인한 재료 규격을 선택한다. 기존 행의 규격은 변경 전까지 보존한다. */
import {e} from './views.js';
import catalog from '../data/quantity-materials.json' with {type:'json'};
export const defaults=Object.fromEntries(Object.entries(catalog.items).filter(([,entry])=>entry.default).map(([item,entry])=>[item,entry.default]));
export function unitChoice(value=''){
 const choices=[...new Set(['m³','m²','m','kg','t','개','개소','식','본','장',value].filter(Boolean))];
 return `<select data-quantity-field="unit" aria-label="단위" required><option value="">단위 선택</option>${choices.map(v=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(v)}</option>`).join('')}</select>`;
}
export function itemChoice(value=''){
 const choices=[...new Set([...Object.keys(catalog.items),value].filter(Boolean))];
 return `<select data-quantity-field="item" aria-label="수량 항목" required><option value="">항목 선택</option>${choices.map(v=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(v)}</option>`).join('')}</select>`;
}
export function material(item,value='',required=false){
 const choices=[...new Set([...(catalog.items[item]?.choices||[]).map(choice=>choice.value),value].filter(Boolean))];
 return `<span class="sl-material-control"><select data-quantity-field="material" aria-label="재료 규격" ${required?'required':''}><option value="">규격 선택</option>${choices.map(v=>`<option value="${e(v)}" ${value===v?'selected':''}>${e(v)}</option>`).join('')}</select></span>`;
}
export function changeMaterial(target){
 const row=target.closest('tr');if(!row)return;
 if(target.matches('[data-quantity-field=item]')){
  const input=row.querySelector('[data-quantity-field=material]');
  input.closest('.sl-material-control').outerHTML=material(target.value,defaults[target.value]||'',input.required);
  const label=row.querySelector('[data-quantity-edit=material]');if(label){label.dataset.value=defaults[target.value]||'';label.textContent=label.dataset.value||'미등록';}
 }
}
