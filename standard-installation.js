/* 선택한 표지판 규격의 지주별 설치값. 다른 모양·수량·도로 좌표는 수정하지 않는다. */
import {e} from './views.js';
import {supportFormKey} from './catalog-supports.js';

export function supportsPlan(plan,key,options=[]){
 return !key||plan.panels.every(p=>{
  const option=options.find(o=>o.name===p.name),spec=option?.auxiliary?option.specs[['소형','중형','대형'].indexOf(plan.size)]:option?.specs.find(s=>s.name===plan.size);
  return !spec?.supportForms||spec.supportForms.includes(key);
 });
}

export function rows(s,option,spec){
 if(!option||!spec)return [];
 const size=option.auxiliary?['소형','중형','대형'][option.specs.indexOf(spec)]:spec.name;
 if(option.auxiliary&&option.name!=='보조_사각형 A')return [];
 return (s.supportForms||[]).filter(f=>f.sizes.includes(size)&&['단주식','내민식','부착식'].includes(f.kind)&&f.patterns?.length!==0&&s.tables.supports.some(p=>supportFormKey(p)===f.key)&&(!f.shapeFilter||(option.shape==='삼각'||option.shape==='역삼각')===(f.shapeFilter==='triangle'))).map(f=>{
  const rule=f.placement||{},entry=rule.distances?.find(r=>r.name===option.name&&r.size===size);
  return {...f,size,x:entry?.x??(option.manualPlacement?null:rule.x)??(f.kind==='단주식'?0:null),y:entry?.y??null,z:entry?.z??(option.manualPlacement?null:rule.z)};
 });
}
export function groups(items){
 const result=[];
 for(const item of items){
  const group=item.kind==='단주식'&&result.find(g=>g.kind===item.kind&&g.road===item.road);
  if(group)group.members.push(item);
  else result.push({...item,label:item.kind+(item.kind!=='단주식'&&item.number?' '+item.number:''),members:[item]});
 }
 return result.map(group=>{const mixedAxes=['y','z'].filter(axis=>!group.members.every(m=>m[axis]===group[axis]));return {...group,...Object.fromEntries(mixedAxes.map(axis=>[axis,''])),mixed:mixedAxes.length>0,mixedAxes};});
}
function coordinates(group){
 return group.members.map(member=>{
  const label=member.kind+' '+member.number;
  return `<tr data-standard-member="${e(member.key)}" aria-label="${e(member.road+' '+label)}"><th scope="row">${e(member.kind==='단주식'?'형식 '+member.number:label)}</th>${['x','y','z'].map(axis=>`<td><input class="sl-input" type="number" step="any" data-standard-axis="${axis}" data-standard-members="${e(JSON.stringify([member.key]))}" aria-label="${e(member.road+' '+label+' '+axis.toUpperCase())}" value="${e(member[axis]??'')}" data-original="${e(member[axis]??'')}" ${axis==='x'&&member.kind==='단주식'?'readonly aria-disabled="true" tabindex="-1" title="단주식 X는 0으로 고정"':'placeholder="입력 필요"'}></td>`).join('')}</tr>`;
 }).join('');
}
export function view(s,option,spec,fresh=false){
 const items=groups(rows(s,option,spec));
 if(!items.length)return `<section><p class="sl-sub">${option?'가용 지주가 없습니다.':'OBJ를 업로드하면 가용 지주가 표시됩니다.'}</p></section>`;
 const active=items[0].key;
 return `<section><div class="sl-standard-supports">${[...new Set(items.map(f=>f.road))].map(road=>`<fieldset><legend>${e(road)}</legend><div>${items.filter(f=>f.road===road).map(f=>`<button type="button" data-standard-position-choice="${e(f.key)}" data-kind="${e(f.kind)}" data-number="${e(f.kind==='단주식'?'':f.number||'')}" aria-label="${e(f.road+' '+f.label+' 설치위치 보기')}" aria-pressed="${f.key===active}" title="${e(f.members.map(m=>m.kind+(m.number?' '+m.number:'')).join(', '))}">${e(f.label)}</button>`).join('')}</div></fieldset>`).join('')}</div></section><section><table class="sl-standard-positions" aria-label="${e(spec.name)} 설치위치" data-fresh="${fresh}" data-active="${e(active)}"><thead><tr><th scope="col">형식</th><th scope="col">X · 가로거리 (mm)</th><th scope="col">Y · 앞뒤거리 (mm)</th><th scope="col">Z · 높이차 (mm)</th></tr></thead>${items.map(f=>`<tbody data-standard-position="${e(f.key)}" data-kind="${e(f.kind)}" data-size="${e(f.size)}" data-members="${e(JSON.stringify(f.members.map(m=>({key:m.key,x:m.x,y:m.y,z:m.z}))))}" aria-label="${e(f.road+' '+f.label+' 설치위치')}" ${f.key===active||f.kind==='내민식'?'':'hidden'}>${f.kind==='부착식'?'':coordinates(f)}</tbody>`).join('')}</table></section>`;
}
export function values(row){
 const axes=[...row.querySelectorAll('[data-standard-axis]')],members=JSON.parse(row.dataset.members);
 return members.map(member=>({key:member.key,size:row.dataset.size,...Object.fromEntries(axes.filter(input=>!input.dataset.standardMembers||JSON.parse(input.dataset.standardMembers).includes(member.key)).map(input=>[input.dataset.standardAxis,input.value!==input.dataset.original?input.value:member[input.dataset.standardAxis]??'']))}));
}
export function previewChoices(form){
 const roads=[...(form?.querySelectorAll('.sl-standard-supports fieldset')||[])].map(group=>({
  road:group.querySelector('legend').textContent,
  buttons:[...group.querySelectorAll('[data-standard-position-choice]')].filter(button=>!button.disabled)
 })).filter(group=>group.buttons.length);
 const active=roads.find(group=>group.buttons.some(button=>button.getAttribute('aria-pressed')==='true'))||roads[0];
 if(!active)return '';
 const roadChoices=roads.length===1?`<span>${e(active.road)}</span>`:roads.map(group=>{
  const target=group.buttons.find(button=>button.getAttribute('aria-pressed')==='true')||group.buttons[0];
  return `<button type="button" data-standard-position-choice="${e(target.dataset.standardPositionChoice)}" aria-pressed="${group===active}" aria-label="미리보기 도로: ${e(group.road)}" title="${e(group.road)}">${e(group.road.replace(/도로$/,''))}</button>`;
 }).join('');
 const kinds=[...new Set(active.buttons.map(button=>button.dataset.kind))].map(kind=>{
  const buttons=active.buttons.filter(button=>button.dataset.kind===kind);
  return `<div>${buttons.some(button=>button.dataset.number)?`<span>${e(kind)}</span>`:''}${buttons.map(button=>`<button type="button" data-standard-position-choice="${e(button.dataset.standardPositionChoice)}" aria-pressed="${button.getAttribute('aria-pressed')}" aria-label="미리보기: ${e(button.getAttribute('aria-label'))}" title="${e(button.textContent)}">${e(button.dataset.number||button.textContent)}</button>`).join('')}</div>`;
 }).join('');
 return `<div class="sl-standard-view-roads" role="group" aria-label="미리보기 도로">${roadChoices}</div>${kinds}`;
}
export function update(form,key=''){
 const table=form.querySelector('.sl-standard-positions');if(!table)return;
 const rows=[...form.querySelectorAll('[data-standard-position]')];
 const active=[key,table.dataset.active,rows[0]?.dataset.standardPosition].find(value=>rows.some(row=>row.dataset.standardPosition===value))||'';
 if(table.dataset.active!==active)table.dataset.previewKey='';
 table.dataset.active=active;
 for(const button of form.querySelectorAll('[data-standard-position-choice]'))button.setAttribute('aria-pressed',String(button.dataset.standardPositionChoice===active));
 for(const row of rows){
  row.hidden=row.dataset.kind!=='내민식'&&row.dataset.standardPosition!==active;
  for(const input of row.querySelectorAll('[data-standard-axis]'))input.required=false;
 }
 const heading=table.querySelector?.('thead');if(heading)heading.hidden=!rows.some(row=>!row.hidden&&row.dataset.kind!=='부착식');
}
export function sync(target,form){
 if(target.matches('[data-standard-position-choice]')){update(form,target.dataset.standardPositionChoice);form.querySelector('.sl-standard-positions').dataset.previewKey='';}
 if(target.matches('[data-standard-axis]')){
  update(form,target.closest('[data-standard-position]').dataset.standardPosition);
  if(target.dataset.standardMembers)form.querySelector('.sl-standard-positions').dataset.previewKey=JSON.parse(target.dataset.standardMembers)[0];
 }
}
export function changes(form){
 const fresh=form.querySelector('.sl-standard-positions')?.dataset.fresh==='true';
 return [...form.querySelectorAll('[data-standard-position]')].filter(row=>row.dataset.kind!=='부착식').flatMap(row=>{
  const edited=[...row.querySelectorAll('[data-standard-axis]')].filter(input=>fresh||input.value!==input.dataset.original);
  return values(row).filter(member=>edited.some(input=>!input.dataset.standardMembers||JSON.parse(input.dataset.standardMembers).includes(member.key)));
 });
}
export function changed(form){return changes(form).length>0;}
export function payload(form){
 const fresh=form.dataset.mode!=='edit';
 return {positions:changes(form),...(fresh?{support_forms:[...form.querySelectorAll('[data-standard-position]')].flatMap(row=>JSON.parse(row.dataset.members).map(m=>m.key))}:{})};
}
export function selected(form){
 const key=form?.querySelector('.sl-standard-positions')?.dataset.active;
 const row=[...(form?.querySelectorAll('[data-standard-position]')||[])].find(row=>row.dataset.standardPosition===key);
 const previewKey=form?.querySelector('.sl-standard-positions')?.dataset.previewKey;
 const entries=row&&values(row),value=entries&&(entries.find(item=>item.key===previewKey)||entries[0]);
 return row?{key:value.key,kind:row.dataset.kind,x:value.x,...(Object.hasOwn(value,'y')?{y:value.y}:{}),z:value.z}:null;
}
