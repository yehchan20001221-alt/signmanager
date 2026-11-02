/* 도로 공통 판 설치 편집. 내민식 두 형식의 입력·미리보기·저장을 같은 화면에 둔다. */
import {e} from './views.js';
import {supportFormKey,supportNumber} from './catalog-supports.js';
import {panelEditor,payload,validateForm} from './placement.js';
import {cards} from './installation-cards.js';
import {scene,selection} from './installation-workbench.js';
import {tool} from './model-workspace.js';

export const active=s=>s.section==='installation'&&s.installationMode!=='site';
export function displayToggle(s){
 return `<div class="sl-installation-toggle" role="group" aria-label="표지판 설치 보기" ${s.panelInstallationKind==='부착식'?'hidden':''}>${[['overview','한눈에 보기'],['assembly','자세히 보기']].map(([key,label])=>`<button type="button" data-installation-display="${key}" aria-pressed="${(s.installationDisplay||'overview')===key}">${label}</button>`).join('')}</div>`;
}
export function sources(s){
 const keys=s.panelInstallationKind==='부착식'?[]:s.panelInstallationKind==='내민식'?['HW_CantileverPost_TS1','HW_CantileverPost_TS2']:['HW_SinglePost_TS1'];
 return keys.map(key=>s.tables.supports.find(p=>supportFormKey(p)===key)).filter(Boolean);
}
export function commonCombinations(s){
 const forms=s.supportForms.filter(f=>/^HW_SinglePost_TS[1-4]$|^GR_SinglePost_TS[1-6]$/.test(f.key));
 return s.combinationOptions.filter(r=>forms.some(f=>f.sizes.includes(r.size)&&f.patterns.some(p=>p.join(':')===r.pattern.join(':'))));
}
export function grid(s){
 const kind=s.panelInstallationKind||'단주식',items=s.panelInstallations||[];
 return `<div class="sl-master sl-panel-installation"><nav class="sl-master-list" aria-label="표지판 설치 방식">${['단주식','내민식','부착식'].map(k=>`<button type="button" data-panel-installation-kind="${k}" aria-pressed="${kind===k}"><strong>${k}</strong></button>`).join('')}</nav><div class="sl-panel-installation-work"><div class="sl-panel-installation-panes ${items.length===2?'sl-panel-installation-pair':''}">${kind==='부착식'?'<div class="sl-master-stage-empty">추가 예정</div>':items.length?items.map(item=>`<form data-panel-installation-form="${e(item.key)}"><header><strong>${items.length===1?'단주식 공통':`형식 ${supportNumber(item.detail.support)}`}</strong>${tool('입력표',panelEditor({...s,detail:item.detail}))}</header><div data-panel-installation-controls></div><div class="sl-panel-installation-drawing"></div></form>`).join(''):'<p class="sl-empty">설치값을 불러오는 중입니다…</p>'}</div><footer class="sl-panel-installation-footer"><p class="sl-error" role="alert" ${s.panelInstallationError?'':'hidden'}>${e(s.panelInstallationError||'')}</p>${items.length?'<button type="button" class="sl-button" data-panel-installation-reset>취소</button><button type="button" class="sl-button sl-primary" data-panel-installation-save>저장</button>':''}</footer></div></div>`;
}
export function entryForm(root,key){return [...root.querySelectorAll('[data-panel-installation-form]')].find(f=>f.dataset.panelInstallationForm===key);}
export function entries(root){
 return [...root.querySelectorAll('[data-panel-installation-form]')].map(form=>{
  const rule=payload(form);delete rule.site;return {key:form.dataset.panelInstallationForm,rule};
 });
}
export function validate(root){
 const forms=[...root.querySelectorAll('[data-panel-installation-form]')],valid=forms.map(validateForm).every(Boolean);
 const button=root.querySelector('[data-panel-installation-save]');if(button)button.disabled=!forms.length||!valid;
 return !!forms.length&&valid;
}
export function draw(root,s){
 for(const item of s.panelInstallations||[]){
  const form=entryForm(root,item.key);if(!form)continue;
  const rule=payload(form),drawing=form.querySelector('.sl-panel-installation-drawing'),controls=form.querySelector('[data-panel-installation-controls]');
  const selected=selection({...s,detail:item.detail,installationChoice:item.choice||{}});
  controls.innerHTML=s.installationDisplay==='assembly'?selected.controls:'';
  const render=(p,size,x,z)=>item.model?.available&&x!=null&&z!=null?scene(item.model,{complete:true,size,pattern:[1,0],panels:[{...p,x_mm:x,z_mm:z,x_m:x/1000,z_m:z/1000}]},s.registrationOptions,false,rule.direction,true):'';
  drawing.innerHTML=s.installationDisplay==='assembly'?scene(item.model,item.preview||selected.row,s.registrationOptions,false,rule.direction):cards(item.detail.placement.catalog,s.registrationOptions,rule,render);
 }
 validate(root);
}
