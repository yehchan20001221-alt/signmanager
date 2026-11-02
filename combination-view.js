/* 지주·표지판 공통 표시. 실제 조합을 빠짐없이 묶되 없는 경우의 수는 만들지 않는다. */
import {e} from './views.js';

const key=p=>JSON.stringify([p.shape,p.width,p.height]);
const auxiliary=p=>p.shape==='보조'&&p.width!==p.height;
const name=p=>(p.displayName||p.name)?.replace('보조_사각형 ','보조사각 ')||
 (p.shape==='보조'?(p.width===p.height?'보조사각 A':'보조표지'):
 p.shape==='사각'?(p.width===p.height?'정사각형':'사각형'):
 ['삼각','역삼각','팔각','오각'].includes(p.shape)?p.shape+'형':p.shape);

export function factorView(factors,main,{selected,dependentAux=false}={}){
 return `<div class="sl-combination-factors">${factors.map((panels,index)=>{
  const aux=index>=main,chosen=selected&&panels.length===1&&key(panels[0])===key(selected);
  return `<section class="sl-factor"><h4>${aux?'보조표지':`${index+1}번째 표지판`}</h4><p>${chosen?'선택한 표지판':aux&&dependentAux?'앞 판에 따라 1종':`${panels.length}종`}</p><ul>${panels.map(p=>`<li${selected&&key(p)===key(selected)?' class="sl-factor-selected"':''}>${aux&&dependentAux?`<em>${p.name.endsWith('B1')?'삼각형·역삼각형일 때':'그 외 모양일 때'}</em>`:''}<span>${e(name(p))}</span> <small>(${e(p.width)}×${e(p.height)})</small></li>`).join('')}</ul></section>`;
 }).join('<span class="sl-times" aria-label="조합">×</span>')}</div>`;
}

export function factorize(rows,index=0){
 if(!rows.length)return [];
 if(index===rows[0].length)return [[]];
 const first=new Map(),groups=new Map();
 for(const row of rows){const k=key(row[index]);if(!first.has(k))first.set(k,[]);first.get(k).push(row);}
 for(const subset of first.values()){
  for(const tail of factorize(subset,index+1)){
   // 뒤쪽 후보가 모두 같은 경우에만 앞쪽 모양들을 하나의 목록으로 합친다.
   const k=JSON.stringify(tail.map(ps=>ps.map(key).sort()));
   if(!groups.has(k))groups.set(k,[[],...tail]);
   groups.get(k)[0].push(subset[0][index]);
  }
 }
 return [...groups.values()];
}

export function linkedCombinations(models,selected,compact=false){
 const forms=new Map();
 for(const m of models){
  if(!m.panels?.length)continue;
  if(!forms.has(m.form))forms.set(m.form,new Map());
  forms.get(m.form).set(JSON.stringify(m.panels.map(key)),m.panels);
 }
 if(!forms.size)return '<p class="sl-model-missing">이 크기에 연결된 조합 없음</p>';
 const total=[...forms.values()].reduce((n,rows)=>n+rows.size,0);
 const order=label=>Number(label.match(/형식 (\d+)/)?.[1]||Infinity);
 const sorted=[...forms].sort(([a],[b])=>order(a)-order(b)||a.localeCompare(b,'ko'));
 return `${compact?`<details class="sl-sign-combinations" name="sign-combinations"><summary>가용조합 · ${total}가지</summary><div class="sl-sign-combination-popover">`:`<div class="sl-auto-combinations"><h3>가용조합 <span>${total}가지</span></h3>`}${sorted.map(([form,rows])=>{
  const patterns=new Map();
  for(const row of rows.values()){
   const aux=row.filter(auxiliary).length,main=row.length-aux,k=`${main}:${aux}`;
   if(!patterns.has(k))patterns.set(k,{main,aux,rows:[]});patterns.get(k).rows.push(row);
  }
  return `<details class="sl-auto-group"><summary>${e(form)}<strong>${rows.size}가지</strong></summary>${[...patterns.values()].map(p=>`<div class="sl-linked-pattern"><h4>표지판 ${p.main}장${p.aux?` + 보조표지 ${p.aux}장`:''}</h4>${factorize(p.rows).map(f=>factorView(f,p.main,{selected})).join('')}</div>`).join('')}</details>`;
 }).join('')}<p class="sl-sub">선택한 표지판은 파란색으로 표시합니다. · 치수 mm</p></div>${compact?'</details>':''}`;
}
