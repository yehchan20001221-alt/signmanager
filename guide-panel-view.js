/* 개별 판·조합 판 공용 보기 버튼과 정보 영역. 항목 수만 다르고 위치·표현은 같다. */
import {e} from './views.js';
export const overallSize=p=>[p.B,p.H].map(v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1})).join(' × ');
export function viewbar(view,caption,attribute,mode){
 return `<div class="gi-viewbar sl-view-tabs"><div role="group" aria-label="판 보기">${[['front','정면'],['plan','평면'],['solid','3D']].map(([key,label])=>`<button type="button" ${attribute}="${key}" aria-pressed="${view===key}">${label}</button>`).join('')}</div><div class="gi-view-context">${mode?`<div role="group" aria-label="작업 보기">${[['panels','판 배치'],['installation','지주 설치위치']].map(([key,label])=>`<button type="button" data-gi-mode="${key}" aria-pressed="${mode===key}">${label}</button>`).join('')}</div>`:''}<span data-gi-caption ${mode?'hidden':''}>${e(caption)}</span><span data-gi-mapping-warning tabindex="0" hidden></span></div></div>`;
}
export function partsTable(parts,editable=false){
 const n=v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:3});
 return `<section class="gi-parts"><header><h3>판 구성</h3><span>mm</span></header><div class="gi-part-grid">${parts.map((p,i)=>`<div class="gi-part-item"><span>${parts.length===1?e(p.name||'판'):`${i+1}번 판`}</span>${editable?`<button type="button" class="gi-part-size" data-gpa-size="${i}" disabled aria-label="${i+1}번 판 규격 변경">${e(n(p.B))} × ${e(n(p.H))}</button>`:`<span>${e(n(p.B))} × ${e(n(p.H))}</span>`}</div>`).join('')}</div></section>`;
}
export const signSection=(count,buttons)=>`<section class="gi-signs"><header><h3>적용 표지</h3><span>${count}개</span></header><div class="gi-sign-grid">${buttons||'<p class="sl-sub">연결된 표지 없음</p>'}</div></section>`;
export const caption=sign=>`<div class="gi-preview-label" data-gi-sign-caption>${sign?`<b>${e(sign.code)}</b> ${e(sign.name)}`:'도안 없음'}</div>`;
