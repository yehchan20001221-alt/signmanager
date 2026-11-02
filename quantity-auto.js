/* 문서 수량과 직접 등록값을 표시한다. 철근 등 직접 입력값은 건드리지 않는다. */
import {e} from './views.js';
import {defaults} from './quantity-material.js';
export const items=['콘크리트','거푸집','터파기','되메우기'];
export const automatic=q=>[...items,'철근'].includes(q['수량항목'])&&['자동계산: 교통표지판(전체).xls','문서연결: '].some(prefix=>q['근거']?.startsWith(prefix));
export function effectiveRows(rows){
 const same=(a,b)=>a['수량항목']===b['수량항목']&&(a['적용조건']||'')===(b['적용조건']||'')&&(a['수량항목']!=='철근'||a['재료규격']===b['재료규격']);
 const manual=rows.filter(q=>!automatic(q)&&q['값']!==''&&q['값']!=null);
 return rows.filter(q=>automatic(q)?!manual.some(m=>same(m,q)):q['값']!==''||!rows.some(a=>automatic(a)&&same(a,q)));
}
export const number=value=>Number(value).toLocaleString('ko-KR',{maximumFractionDigits:3});
export function summary(c,rows=[],showConditions=true){
 if(!c?.available)return `<p class="sl-sub">${e(c?.message||'기본 모델을 선택하세요.')}</p>`;
 if(c.cases){
  const manual=rows.filter(q=>!automatic(q)&&!q['적용조건']);
  return `<p class="sl-sub">${e(c.note)}</p>${c.modelWarning?`<p class="gp-model-notice">${e(c.modelWarning)}</p>`:''}${c.cases.map(part=>`<section class="sl-quantity-case"><h4>${e(part.label)}</h4>${summary(part,rows.filter(q=>q['적용조건']===part.id))}</section>`).join('')}${manual.length?`<h4>직접 입력</h4>${summary({available:true,rows:[],missing:[],note:'',message:''},manual)}`:''}`;
 }
 if(c.rows){
  const manual=rows.filter(q=>!automatic(q)&&q['등록상태']==='등록'&&q['값']!==''&&q['값']!=null);
  const values=c.rows.filter(r=>!manual.some(q=>q['수량항목']===r.item&&(!q['적용조건']||q['적용조건']===r.condition)&&(!r.material||q['재료규격']===r.material))).map(r=>{
   const saved=rows.find(q=>automatic(q)&&q['수량항목']===r.item&&(q['적용조건']||'')===(r.condition||'')&&(r.item!=='철근'||q['재료규격']===r.material));
   return saved?.['재료규격']?{...r,material:saved['재료규격']}:r;
  });
  values.push(...manual.map(q=>({item:q['수량항목'],value:q['값'],unit:q['단위'],material:q['재료규격'],condition:q['적용조건'],source:q['근거']||'직접 입력'})));
  const missing=(c.missing||[]).filter(item=>!values.some(r=>r.item===item));
  return `<table class="sl-quantity-table"><thead><tr><th>수량 항목</th><th>수량</th><th>단위</th></tr></thead><tbody>${values.map(r=>`<tr><th>${e(r.item)}${r.condition&&showConditions?`<small>${e(c.label||r.condition)}</small>`:''}${r.material?`<small>${e(r.material)}</small>`:''}</th><td title="${e(r.source)}">${number(r.value)}</td><td>${e(r.unit)}</td></tr>`).join('')}${missing.map(item=>`<tr><th>${e(item)}</th><td colspan="2"><span class="sl-error"><span class="gp-model-warning" role="img" aria-label="입력 필요">!</span> 입력 필요</span></td></tr>`).join('')}</tbody></table>${c.description?`<p class="sl-sub">${e(c.description)}</p>`:''}${c.section?`<p class="sl-sub">${e(c.section)}</p>`:''}${c.modelWarning?`<p class="gp-model-notice">${e(c.modelWarning)}</p>`:''}<p class="sl-sub">${e(c.note)}</p>`;
 }
 const specs=item=>['성토부','절토부'].map(condition=>rows.find(q=>q['수량항목']===item&&q['적용조건']===condition)?.['재료규격']||rows.find(q=>q['수량항목']===item&&!q['적용조건'])?.['재료규격']||defaults[item]);
 return `<table class="sl-quantity-table"><thead><tr><th>수량 항목</th><th>재료 규격</th><th>수량</th><th>단위</th></tr></thead><tbody>${items.map(item=>{
  const materials=specs(item),values=['성토부','절토부'].map(key=>number(c.values[key][item]));
  const split=materials[0]!==materials[1]||values[0]!==values[1];
  return `<tr><th>${item}</th><td>${materials[0]===materials[1]?e(materials[0]):materials.map((m,i)=>`<div>${i?'절토':'성토'}: ${e(m)}</div>`).join('')}</td><td>${split?values.map((v,i)=>`<div class="sl-quantity-condition"><span>${i?'절토부':'성토부'}</span><strong>${v}</strong></div>`).join(''):values[0]}</td><td>${item==='거푸집'?'m²':'m³'}</td></tr>`;
 }).join('')}</tbody></table><p class="sl-sub">${e(c.note||'')} · 1개소</p>`;
}
export function content(s){
 const model=s.supportDraftModel||s.supportModel,c=model?.quantityCalculation||{available:false,message:model?.message},post=s.screen!=='new'&&s.detail?.support;
 const rows=post?(s.detail.quantities||[]).filter(q=>q['수량항목']&&!automatic(q)):[];
 const manual=rows.length&&!c?.rows?`<table class="sl-quantity-table"><thead><tr><th>수량 항목</th><th>재료 규격</th><th>수량</th><th>단위</th></tr></thead><tbody>${rows.map(q=>`<tr><th>${e(q['수량항목'])}</th><td>${e(q['재료규격'])}</td><td>${q['등록상태']==='등록'&&q['값']!==''&&q['값']!=null?e(q['값']):'미등록'}</td><td>${e(q['단위'])}</td></tr>`).join('')}</tbody></table>`:'';
 return summary(c,post?s.detail.quantities||[]:[])+manual+(post?`<button type="button" class="sl-button" data-action="edit-quantities" data-id="지주기초|${e(post['지주기초ID'])}">규격·철근 수량 수정</button>`:'');
}
export function render(root,s){
 root.querySelectorAll('[data-auto-quantities]').forEach(el=>el.innerHTML=content(s));
 if(s.section==='supports')root.querySelectorAll('[data-auto-quantities] [data-action=edit-quantities]').forEach(el=>el.remove());
}
