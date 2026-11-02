/* 가용조합의 판을 모양별로 묶고, 기존 거리 입력표의 같은 값을 편집한다. */
import {e} from './views.js';
import {thumbnail,label} from './master-preview.js';

export function cards(results,options,rule,renderPanel){
 const groups=new Map();
 for(const r of results)for(const p of (r.sourcePanels||r.panels).slice(0,r.pattern[0])){
  if(!groups.has(p.name))groups.set(p.name,new Map());
  groups.get(p.name).set(r.size,p);
 }
 const distance=(axis,size,name)=>{
  const saved=rule.distances?.find(r=>r.size===size&&r.name===name);
  return saved?.[axis]??rule[axis]??(axis==='x'&&rule.direction==='세로'?0:null);
 };
 const value=(axis,size,name)=>{
  const n=distance(axis,size,name);
  return `<button type="button" class="sl-placement-value" data-placement-axis="${axis}" data-placement-name="${e(name)}" data-placement-size="${e(size)}" aria-label="${e(label(name)+' '+size+' '+axis.toUpperCase()+' 수정')}">${n==null?'미설정':e(axis==='z'?-n:n)}</button>`;
 };
 return `<div class="sl-installation-cards">${[...groups].map(([name,sizes])=>{
  const option=options.find(o=>o.name===name);
  return `<section class="sl-installation-card"><header><strong>${e(label(name))}</strong></header><div class="sl-installation-specimens">${[...sizes].map(([size,p])=>`<div class="sl-installation-specimen">${renderPanel?.(p,size,distance('x',size,name),distance('z',size,name))||`<div class="sl-placement-unset">${option?thumbnail(option):''}<span>${rule.direction==='가로'?`X ${value('x',size,name)}`:''} Z ${value('z',size,name)}</span></div>`}<footer>${e(size)} <span>${p.width} × ${p.height}</span></footer></div>`).join('')}</div></section>`;
 }).join('')||'<p class="sl-empty">가용조합을 선택하세요.</p>'}</div><div class="sl-installation-gaps" role="group" aria-label="표지판 간 이격거리"><span class="sl-gap-title">표지판 간 이격거리 <small>(mm)</small></span>${[['main_gap','본표지 ↔ 본표지'],['aux_gap','본표지 ↔ 보조표지']].map(([key,text])=>`<span class="sl-gap-pair"><span>${text}</span><button type="button" class="sl-placement-value" data-placement-field="placement_${key}" aria-label="${text} 이격거리 수정 (mm)">${e(rule[key]??'미설정')}</button></span>`).join('')}</div>`;
}
