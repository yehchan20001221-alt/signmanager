/* 교통표지의 CAD 이름 규칙과 값별 편집. 기존 보조표지의 5xx 블록 연결은 보존한다. */
import {e} from './views.js';

export const categories={0:'주의',1:'규제',2:'지시',3:'보조'};
export const prefixes={0:'HorizontalWarningSign_',1:'HorizontalRegulatorySign_',2:'HorizontalIndicatorySign_',3:'HorizontalSupplementarySign_'};
export function categoryForCode(code){
 const match=String(code??'').trim().match(/^([1-4])\d{2}(?:-[1-9]\d*)?$/);
 return match?String(Number(match[1])-1):'';
}
const pendingPrefix='Horizontal[분류]Sign_';
const keys={code:'표지번호',name:'명칭',category:'분류코드',layer_suffix:'레이어변수'};
const labels={code:'표지번호',name:'표지 이름',category:'분류',layer_suffix:'레이어 변수'};

function parts(row,key){
 const value=String(row[keys[key]]??'');
 const prefix=key==='layer_suffix'?prefixes[row['분류코드']]||'':'';
 return {prefix:!value||value.startsWith(prefix)?prefix:'',value:prefix&&value.startsWith(prefix)?value.slice(prefix.length):value};
}
export function cadFields(row={}){
 const p=parts(row,'layer_suffix');
 if(!p.prefix&&!p.value)p.prefix=pendingPrefix;
 return `<label class="sl-field sl-wide"><span>레이어 변수</span>${layerInput(p,'layer_suffix')}</label>`;
}
function layerInput(p,name){return `<span class="sl-layer-input"><span class="sl-layer-fixed" data-cad-prefix="layer_suffix">${e(p.prefix)}</span><input class="sl-input" name="${name}" value="${e(p.value)}" aria-label="레이어 변수 뒷부분" placeholder="입력할 이름" autocomplete="off" spellcheck="false"></span>`;}
export function cadValues(values){
 return {
  CAD블록명:values.block??(values.code?.trim()?'CMRS'+values.code.trim():''),
  레이어변수:Object.hasOwn(values,'layer_suffix')?(values.layer_suffix?(prefixes[values.category]||'')+values.layer_suffix.trim():''):values.layer,
 };
}
export function updateCAD(form){
 const block=form.querySelector('[data-registration-block]');
 if(block)block.textContent=form.elements.code.value.trim()?'CMRS'+form.elements.code.value.trim():'표지번호 입력 후 자동 연결';
 const label=form.querySelector('[data-cad-prefix=layer_suffix]');
 if(label)label.textContent=prefixes[form.querySelector('[name=category]').value]||pendingPrefix;
}
export function item(row,key){
 return `<dt>${labels[key]}</dt><dd>${fieldValue(row,key)}</dd>`;
}
export function fieldValue(row,key){
 const value=key==='category'?categories[row['분류코드']]:row[keys[key]];
 const p=key==='layer_suffix'?parts(row,key):null;
 const content=p&&value?`<span class="sl-layer-fixed">${e(p.prefix)}</span><span class="sl-layer-suffix">${e(p.value)}</span>`:e(value||'미등록');
 return `<button type="button" class="sl-edit-value${p?' sl-layer-value':''}" data-sign-field="${key}" title="더블클릭 또는 Enter로 수정" aria-label="${labels[key]} ${e(value||'미등록')}, 더블클릭 또는 Enter로 수정">${content}</button>`;
}
export function editor(row,key){
 const p=parts(row,key);
 const input=key==='category'?`<select class="sl-input" name="value" aria-label="분류">${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${String(row['분류코드'])===id?'selected':''}>${label}</option>`).join('')}</select>`:key==='layer_suffix'?layerInput(p,'value'):`<input class="sl-input" name="value" value="${e(p.value)}" size="${Math.max(10,[...p.value].length*2)}" aria-label="${labels[key]}" ${['code','name'].includes(key)?'required':''}>`;
 return `<form class="sl-inline-form sl-inline-field" data-field="${key}">${input}<button type="submit" class="sl-inline-confirm" aria-label="저장" title="저장 (Enter)">✓</button><button type="button" class="sl-inline-cancel" data-action="inline-cancel" aria-label="취소" title="취소 (Esc)">×</button><span class="sl-inline-saving" role="status" hidden>저장 중…</span><p class="sl-error" role="alert" hidden></p></form>`;
}
export function changes(row,key,value){
 const result={[keys[key]]:key==='category'?Number(value):value.trim()};
 if(key==='layer_suffix')result[keys[key]]=value.trim()?parts(row,key).prefix+value.trim():'';
 if(key==='code'&&(!row['CAD블록명']||row['CAD블록명']==='CMRS'+row['표지번호']))result['CAD블록명']='CMRS'+value.trim();
 if(key==='category'){
  const p=parts(row,'layer_suffix');
  if(p.prefix&&p.value)result['레이어변수']=(prefixes[value]||'')+p.value;
 }
 return result;
}
