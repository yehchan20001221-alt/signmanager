/* 마스터의 지주 목록·설명도. 지주 정보·수량·설치위치 저장은 기존 편집기를 사용한다. */
import {e,supportSize} from './views.js';
import {supportNumber,supportLabel,supportRoad} from './catalog-supports.js';
import {grid as cards,records,managementTitle} from './support-manager.js';
import {meshSvg} from './mesh-preview.js';
import {supportDrawing} from './support-dimensions.js';
import * as installation from './installation-workbench.js';
import {roadPayload} from './placement.js';
export function title(p){return supportNumber(p)?`${p['형식']} · ${supportLabel(p)}`:p['형식'];}
export function grid(s){
 const rows=records(s);
 return `<div class="sl-support-groups">${['고속도로','일반도로'].map(road=>`<section class="sl-common-road"><h2>${road}</h2><div class="sl-common-cards sl-support-cards" aria-label="${road} 지주 형식">${cards(s,rows.filter(p=>supportRoad(p)===road)).replaceAll('data-post=','data-master-post=')}</div></section>`).join('')}</div>`;
}
export function viewport(s){
 return `<div class="sl-common-model"><div class="sl-view-tabs" role="group" aria-label="지주 보기">${[['front','정면'],['top','평면'],['solid','3D'],...(s.section==='supports'?[['site','도로 단면']]:[])].map(([key,text])=>`<button type="button" data-post-view="${key}" aria-pressed="${(s.postView||'front')===key}">${text}</button>`).join('')}<button type="button" data-post-foundation aria-pressed="${!!s.postFoundation}" ${['solid','site'].includes(s.postView)?'hidden':''}>기초 확대</button></div><div class="sl-master-stage sl-post-stage" data-support-drawing></div></div>`;
}
export function selectRoad(root,s,target){
 const row=target.closest('[data-road-site-row]');if(!row)return false;
 s.postView='site';s.postSite=row.dataset.roadSiteRow;
 draw(root,s,row.closest('form'));return true;
}
export function draw(root,s,form){
 const area=root.querySelector('[data-support-drawing]');if(!area)return;
 const site=roadPayload(form),road=root.querySelector('[data-post-view="site"]');
 if(road)road.hidden=!site;
 if(s.postView==='site'&&!site)s.postView='front';
 root.querySelectorAll?.('[data-post-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.postView===(s.postView||'front'))));
 root.querySelectorAll?.('[data-road-site]').forEach(b=>b.setAttribute('aria-pressed',String(s.postView==='site'&&b.dataset.roadSite===(s.postSite||'fill'))));
 const foundation=root.querySelector('[data-post-foundation]');if(foundation?.setAttribute){foundation.hidden=['solid','site'].includes(s.postView);foundation.setAttribute('aria-pressed',String(!!s.postFoundation));}
 const original=s.screen==='new'?{}:s.tables.supports.find(p=>p['지주기초ID']===s.selected);
 if(!original){area.innerHTML='<div class="sl-master-stage-empty">지주를 선택하세요.</div>';return;}
 const post={...original};
 if(form){for(const key of ['형식','단면규격'])post[key]=form.elements[key]?.value||'';if(form.elements.form_number)post.formNumber=Number(form.elements.form_number.value);}
 const size=supportSize(post);
 const model=s.supportDraftModel||s.supportModel,view=s.postView||'front',drawing=view!=='solid';
 if(view==='site'){
  const mode=s.postSite||'fill';
  area.innerHTML=`<div class="sl-road-preview"><h3>${mode==='fill'?'성토부':'절토부'}</h3>${installation.siteScene(model,site[mode],mode)}</div>`;return;
 }
 if(s.section==='installation'){const heading=root.querySelector('.sl-canvas-top strong');if(heading)heading.textContent=managementTitle(s,original);installation.draw(root,s,form);return;}
 // 기존 지주 OBJ의 좌표 단위는 m이며, 정면 치수는 기초를 포함한 전체 형상이다.
 const image=model?.available?(drawing?supportDrawing(model,title(post),view,s.postFoundation):meshSvg(model,title(post)+' OBJ 미리보기',s.postYaw,s.postPitch,s.postCamera)):`<div class="sl-master-stage-empty">${e(model?.message||(s.screen==='new'?'OBJ를 업로드하거나 등록된 모델을 선택하세요.':'OBJ를 불러오는 중입니다.'))}</div>`;
 area.innerHTML=`${image}${model?.available===false&&s.screen!=='new'?`<button class="sl-post-size-edit" type="button" data-support-size><strong>${e(size)}</strong></button>`:''}`;
}
