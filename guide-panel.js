/* 안내표지 신규·상세 공용 배치. 입력 방식만 다르고 항목 순서·간격은 같다. */
import {e} from './views.js';
import {cadUploadSlot} from './registration.js';
import {slot} from './guide-sign-panels.js';
export const categories={'고속도로':['정규표지','비정규표지','가번호표지'],'일반도로':['비도시지역','도시지역','도로명 안내표지']};
export const option=(value,label,current)=>`<option value="${e(value)}"${value===current?' selected':''}>${e(label)}</option>`;
export const field=(label,content)=>`<div class="gg-field"><span>${label}</span><div>${content}</div></div>`;
export const header=isNew=>`<header class="sl-panel-head"><h2>안내표지 ${isNew?'신규등록':'정보'}</h2><div class="sl-actions">${isNew?'':'<button type="button" data-sign-history>수정 이력</button>'}<button type="button" data-guide-close>닫기</button></div></header>`;
export function modelSection(){
 return `<section class="gg-model gg-sign-panels">${slot()}</section>`;
}
function viewerSection(){
 return `<div class="gg-view-toolbar" hidden><div class="gg-view-options"><details class="gg-view-issues" data-guide-issues hidden><summary aria-label="모델·도안 문제 확인">!</summary><div data-guide-issue-list></div></details></div></div><div class="gg-view-content">${preview()}</div>`;
}
const cadStatus=()=>'<div class="gg-view-status"><p data-cad-message role="status"></p><button type="button" data-cad-retry hidden>다시 불러오기</button><p data-cad-warnings role="status"></p></div>';
const cadFields=(block,layer)=>`<div class="gg-cad-fields">${field('CAD 블록명',block)}${field('CAD 레이어 변수',layer)}</div>`;
export function body(basics,model,block,layer,placement,isNew=false){
 return `<div class="gg-body gg-registration-body"><div class="gg-basics">${basics}</div><div class="gg-registration-work" data-guide-cad><div class="gg-registration-inputs"><section class="gg-registration-plate" aria-label="표지판 입력"><h3 class="gg-step-title">1. 표지판</h3><div class="gg-plate-data"><div class="gg-registration-cad">${cadUploadSlot(!isNew,false)}${cadFields(block,layer)}${cadStatus()}</div><section class="gsp-coordinate-table" data-gsp-coordinates hidden></section></div></section><section class="gg-registration-post" aria-label="지주 선택"><div class="gg-post-heading"><h3 class="gg-step-title">2. 지주</h3><div class="gg-post-tools"><button type="button" class="sl-button" data-guide-post-add>+ 지주 추가</button></div></div><div data-registration-placement>${placement}</div></section></div><div class="gg-unified" data-gsp-workspace="cad"><nav class="gsp-view-modes" aria-label="보기 방향"><div class="gsp-directions"><button type="button" data-gsp-mode="cad" aria-pressed="true">정면</button><button type="button" data-gsp-mode="installation" aria-pressed="false">설치 정면</button><button type="button" data-gsp-mode="plan" aria-pressed="false">평면</button><button type="button" data-gsp-mode="3d" aria-pressed="false">3D</button></div><div class="gsp-conditions" data-gsp-conditions></div></nav><div class="gsp-main-plan" data-gsp-main-plan></div><div class="gsp-installation" data-gsp-installation></div>${viewerSection()}${model}</div></div><p class="sl-error" role="alert" hidden></p></div>`;
}
export function preview(){
 return `<section class="sl-guide-solid" aria-label="3D 도안 미리보기"><div class="sl-guide-model-stage"><div data-guide-model></div><div class="gg-cad-callout" data-cad-callout role="dialog" aria-label="CAD 속성 확인" hidden></div></div><p data-guide-mapping role="status"></p></section>`;
}
