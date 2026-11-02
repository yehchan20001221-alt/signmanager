/* 같은 폼의 입력값을 유지한 채 항목별로 전환한다. 숨긴 페이지도 검증 대상이다. */
import {e} from './views.js';
export const page=(key,html,hidden=false)=>`<section data-panel-page="${key}" ${hidden?'hidden':''}>${html}</section>`;
export const tabs=items=>`<nav class="sl-panel-pages" aria-label="입력 항목">${items.map(([key,label],i)=>`<button type="button" data-panel-page-choice="${key}" aria-pressed="${i===0}">${e(label)}</button>`).join('')}</nav>`;
export function select(form,key){
 if(form.classList.contains('sl-registration-flat')){form.querySelectorAll('[data-panel-page]').forEach(el=>el.hidden=false);return;}
 form.dataset.page=key;
 form.querySelectorAll('[data-panel-page]').forEach(el=>el.hidden=el.dataset.panelPage!==key);
 form.querySelectorAll('[data-panel-page-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panelPageChoice===key)));
}
export function reveal(input){
 const page=input.closest('[data-panel-page]');if(page)select(input.closest('form'),page.dataset.panelPage);
}
