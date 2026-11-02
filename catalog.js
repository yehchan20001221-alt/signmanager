/* 표지 중심 화면. 실제 저장 항목과 기존 제원·조합의 조회 항목을 구분한다. */
import {e,panelShape,panelSize} from './views.js';
import {quantityView} from './catalog-quantities.js';
import * as signFields from './sign-fields.js';
import {slot as coordinateSlot} from './sign-coordinates.js';
import {registrationForm,cadUploadSlot} from './registration.js';
export {quantityView};
export {e};
export const categories={0:'주의',1:'규제',2:'지시',3:'보조'};
const shapes={0:'원형',1:'삼각',2:'사각',3:'팔각',4:'팔각'};
const button=(label,action,id='',primary=false)=>`<button type="button" class="sl-button${primary?' sl-primary':''}" data-action="${action}" data-id="${e(id)}">${e(label)}</button>`;
const item=(label,value)=>`<dt>${e(label)}</dt><dd>${e(value === '' || value == null ? '미등록' : value)}</dd>`;
const image=row=>`<img src="/api/signs/${encodeURIComponent(row['표지ID'])}/image" alt="${e(row['명칭'])}" loading="lazy">`;

export function records(s) {
  const ids=new Set(s.catalogIds);
  return s.tables.signs.filter(row=>ids.has(row['표지ID'])).sort((a,b)=>a['표지번호'].localeCompare(b['표지번호'],'ko',{numeric:true}));
}
export function specifications(d) {
  if(d.panelSelections?.length)return [...new Set(d.panelSelections.map(r=>`${['소형','중형','대형'].includes(r['제원명'])?r['제원명']+' · ':''}${panelShape(r.panel)} ${r.panel['폭_mm']} × ${r.panel['높이_mm']}`))];
  const panels=[...d.configs.flatMap(c=>c.slots.filter(slot=>slot.own).map(slot=>slot.panel)),...(d.wayRules||[]).map(r=>r.panel),...(d.panelSelections||[]).map(r=>r.panel)];
  return [...new Set(panels.map(p=>`${panelShape(p)} ${p['폭_mm']} × ${p['높이_mm']}`))];
}
export function formFields(v) {
  return {표지번호:v.code,명칭:v.name,분류코드:v.category===''?'':Number(v.category),형태코드:v.shape===''?'':Number(v.shape),...signFields.cadValues(v)};
}
export function shell(s) {
  const master=['master','supports','installation','quantities'].includes(s.section);
  return `<div id="sign-library-screen" aria-label="SIGN MANAGER"><header class="sl-head"><div class="sl-brand-group"><h1 class="sl-brand"><button type="button" class="sl-home" data-section="signs" aria-label="SIGN MANAGER 홈">SIGN MANAGER</button></h1>${master?'<span class="sl-master-caption">공통 데이터</span>':''}</div><div class="sl-actions">${master?'<button type="button" class="sl-button sl-back" data-section="signs"><span aria-hidden="true">←</span> 뒤로가기</button>':''}${button('표지판 신규등록','new','',true)}</div></header><div class="sl-toolbar"><div class="sl-filters" aria-label="표지 분류">${[['','전체'],...Object.entries(categories),...(records(s).some(r=>r['분류코드']==='')?[['missing','분류 미확인']]:[])].map(([key,text])=>`<button type="button" class="sl-filter" data-filter="${key}" aria-pressed="${s.filter===key}">${text}</button>`).join('')}</div>${master?'':'<button type="button" class="sl-button" data-section="master">공통 데이터</button>'}<input class="sl-search" type="search" aria-label="표지번호 또는 이름 검색" placeholder="표지번호 또는 이름 검색" value="${e(s.search)}"></div><div class="sl-work"><main class="sl-library"><div class="sl-grid" aria-label="표지판 목록"></div></main><aside class="sl-panel" aria-label="표지판 상세" hidden></aside></div><div class="sl-status" role="status"></div></div>`;
}
export function matchingRecords(s) {
  const term=s.search.trim().toLowerCase();
  return records(s).filter(r=>(s.filter===''||(s.filter==='missing'?r['분류코드']==='':String(r['분류코드'])===s.filter))&&`${r['표지번호']} ${r['명칭']}`.toLowerCase().includes(term));
}
export function grid(s,rows=matchingRecords(s)) {
  return rows.map(r=>`<button type="button" class="sl-tile" data-sign="${e(r['표지ID'])}" aria-label="${e(r['표지번호']+' '+r['명칭'])}" aria-pressed="${r['표지ID']===s.selected}"><span class="sl-picture">${image(r)}</span><span class="sl-label">${e(r['명칭'])}</span><span class="sl-number">${e(r['표지번호'])}</span></button>`).join('')||'<p class="sl-empty">검색 결과가 없습니다.</p>';
}
export function dimensions(d) {
  const names=[...new Set((d.panelSelections||[]).map(r=>r['모양']))],multiple=names.length>1;
  const auxiliary=multiple&&names.every(name=>name.startsWith('보조_사각형 '));
  const display=name=>d.panelSelections?.find(r=>r['모양']===name)?.displayName||name;
  const shape=auxiliary?'보조 사각형':names.map(name=>display(name).replaceAll('_',' ')).join(' · ')||shapes[d.sign?.['형태코드']]||'모양·크기';
  const specs=d.panelSelections?.length?[...new Set(d.panelSelections.map(r=>`${multiple?(auxiliary?display(r['모양']).replace('보조_사각형 ',''):display(r['모양']))+' · ':''}${panelSize(r)}`))]:specifications(d);
  const chips=`<span class="sl-chips">${specs.map(text=>`<span class="sl-size">${e(text)}</span>`).join('')}</span>`;
  return `<section class="sl-section sl-sign-specs" aria-label="표지판 모양·크기"><div class="sl-specs-heading"><div class="sl-specs-shape"><button type="button" class="sl-edit-value" data-sign-field="registration" aria-label="형태 ${e(shape)}, 더블클릭 또는 Enter로 수정" title="더블클릭 또는 Enter로 형태 수정">${e(shape)}</button></div><span>폭 × 높이 (mm)</span></div><div class="sl-specs-value">${specs.length?chips:'<span class="sl-sub">연결된 규격 없음</span>'}</div></section>`;
}
export function related() { return ''; }
export function view(s) {
  const d=s.detail,r=d.sign;
  return `<div class="sl-panel-head"><h2>표지판 정보</h2><div class="sl-actions"><button type="button" class="sl-button" data-sign-history>수정 이력</button>${button('닫기','close')}</div></div><div class="sl-body sl-sign-detail"><div class="sl-hero">${image(r)}<div class="sl-sign-identity"><div class="sl-sign-title"><div>${signFields.fieldValue(r,'code')}</div><div>${signFields.fieldValue(r,'name')}</div></div><div class="sl-sign-meta"><div>${signFields.fieldValue(r,'category')}</div></div></div></div>${dimensions(d)}<section class="sl-section sl-sign-cad">${cadUploadSlot(true)}<dl class="sl-dl">${item('CAD 블록명',r['CAD블록명'])}${signFields.item(r,'layer_suffix')}</dl>${coordinateSlot()}</section><section class="sl-sign-preview" data-sign-preview aria-label="3D 미리보기"></section></div><footer class="sl-footer sl-sign-footer"><div class="sl-copy-action">${button('복사해서 신규등록','copy')}</div><button type="button" class="sl-button sl-delete-button" data-action="delete" aria-label="표지판 삭제">삭제</button></footer>`;
}
export function form(s,isNew=false,copy=false) { return registrationForm(s,isNew,copy); }
