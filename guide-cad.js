/* 상세는 변수와 도안의 연결을 확인한다. */
import {e} from './views.js';

export function previewQueue(request,show,fail){
 let sequence=0,running=false,next=null,stopped=false;
 async function run(){
  if(running||!next||stopped)return;
  running=true;const job=next;next=null;
  try{const result=await request(job.value);if(!stopped&&job.sequence===sequence)show(result);}
  catch(err){if(!stopped&&job.sequence===sequence)fail(err);}
  finally{running=false;run();}
 }
 return {update(value){if(stopped)return;next={value,sequence:++sequence};run();},invalidate(){++sequence;next=null;},stop(){stopped=true;next=null;++sequence;}};
}
function input(field){return `<input type="text" data-cad-value="${e(field.tag)}" aria-label="${e(field.label)} 미리보기 문구" value="${e(field.value)}" maxlength="300" autocomplete="off">`;}
export function fields(result,selected=null){
 const visible=selected?result.fields.filter(f=>selected.fields.includes(f.index)):result.fields;
 return `${visible.length?`<div class="sl-cad-inputs">${visible.map(f=>`<label><span>${f.index?`<b>${f.index}</b>`:''}${e(f.label)}${!f.index?'<small>CAD</small>':''}</span>${input(f)}</label>`).join('')}</div>`:''}
 ${(result.missing.length||result.notes.length)?`<div class="sl-cad-notes">${result.notes.map(n=>`<p>${e(n)}</p>`).join('')}${result.missing.map(f=>`<p>${e(f.name)} · CAD 속성 없음</p>`).join('')}</div>`:''}`;
}
export function inspection(result,tag){
 const field=result.available===false?null:result.fields?.find(f=>f.tag===tag);
 return field?`<header><strong>${e(field.label||'CAD 속성')}</strong><button type="button" data-cad-dismiss aria-label="속성 말풍선 닫기">×</button></header><dl><dt>변수명</dt><dd>${e(field.tag)}</dd><dt>문구</dt><dd>${e(field.value||'—')}</dd></dl>`:'';
}
export function attributeTable(result){
 const rows=result?.available?result.fields||[]:[];
 const cell=f=>f?`<td data-cad-attribute="${e(f.tag)}" tabindex="0" role="button" aria-label="${e(f.tag+' '+f.value)}" aria-pressed="false" title="${e(f.tag)}">${e(f.tag)}</td><td data-cad-attribute="${e(f.tag)}" tabindex="0" role="button" aria-label="${e(f.tag+' '+f.value)}" aria-pressed="false" title="${e(f.value||'—')}">${e(f.value||'—')}</td>`:'<td></td><td></td>';
 return `<h4>속성변수</h4>${rows.length?`<table><colgroup><col style="width:33%"><col style="width:17%"><col style="width:33%"><col style="width:17%"></colgroup><thead><tr><th>변수명</th><th>문구</th><th>변수명</th><th>문구</th></tr></thead><tbody>${Array.from({length:Math.ceil(rows.length/2)},(_,i)=>`<tr>${cell(rows[i*2])}${cell(rows[i*2+1])}</tr>`).join('')}</tbody></table>`:'<p class="sl-sub">연결된 속성변수 없음</p>'}`;
}
let active=null;
export function clear(){active?.();active=null;}
function selection(area,onSelect){
 let result=null,tag='';
 const callout=area.querySelector('[data-cad-callout]');
 const table=document.createElement('section');table.className='gg-cad-attributes';table.hidden=true;
 area.querySelector('.gg-registration-plate').append(table);
 const sync=()=>table.querySelectorAll('[data-cad-attribute]').forEach(row=>row.setAttribute('aria-pressed',String(row.dataset.cadAttribute===tag)));
 const dismiss=()=>{tag='';callout.hidden=true;sync();onSelect('');};
 const select=(value,point={})=>{
  if(!value){dismiss();return;}
  if(!result?.available||!result.fields.some(f=>f.tag===value))return;
  tag=tag===value?'':value;
  callout.innerHTML=inspection(result,tag);callout.hidden=!tag||!!point.fromTable;sync();
  if(tag&&!point.fromTable){
   const box=callout.parentElement.getBoundingClientRect();
   callout.style.left=Math.max(8,Math.min((point.clientX??box.left+box.width/2)-box.left+12,box.width-callout.offsetWidth-8))+'px';
   callout.style.top=Math.max(8,Math.min((point.clientY??box.top+box.height/2)-box.top+12,box.height-callout.offsetHeight-8))+'px';
  }
  onSelect(tag);
 };
 const click=ev=>{const row=ev.target.closest('[data-cad-attribute]');if(row)select(row.dataset.cadAttribute,{fromTable:true});else if(ev.target.closest('[data-cad-dismiss]'))dismiss();else if(ev.target.closest('[data-guide-view],[data-guide-focus],[data-guide-model-choice],[data-camera]'))dismiss();};
 const key=ev=>{if(['Enter',' '].includes(ev.key)&&ev.target.matches('[data-cad-attribute]')){ev.preventDefault();select(ev.target.dataset.cadAttribute,{fromTable:true});}else if(ev.key==='Escape'&&tag){ev.preventDefault();dismiss();}};
 const pick=ev=>select(ev.detail.tag,ev.detail);
 area.addEventListener('click',click);area.addEventListener('keydown',key);area.addEventListener('guide-cad-select',pick);
 return {show(value){result=value;tag='';callout.hidden=true;table.hidden=!value?.available;table.innerHTML=attributeTable(value);},stop(){table.remove();area.removeEventListener('click',click);area.removeEventListener('keydown',key);area.removeEventListener('guide-cad-select',pick);}};
}
export function load(app,s,api,onPreview=()=>{},onSelect=()=>{}){
 clear();const area=app.querySelector('[data-guide-cad]');if(!area)return;
 const id=s.guideSelected,message=area.querySelector('[data-cad-message]'),select=selection(area,onSelect);
 const queue=previewQueue(()=>api('/api/guides/cad-preview',{id,values:{}}),result=>{
  if(!area.isConnected)return;
  s.guideCadBlocks=result.blocks||[];message.textContent=result.available?'':'CAD 블록을 연결하세요.';
  const block=area.querySelector('[data-guide-cad-block]');
  if(block){block.textContent=result.block||'미연결';block.dataset.guideEdit=JSON.stringify({field:'CAD블록명',value:result.block||'-'});}
  area.querySelector('[data-cad-retry]').hidden=true;
  select.show(result);
  area.querySelector('[data-cad-warnings]').textContent=(result.warnings||[]).join(' ');
  onPreview(result);
 },err=>{if(area.isConnected){select.show(null);message.textContent=err.message;area.querySelector('[data-cad-retry]').hidden=false;onPreview({available:false,error:err.message});}});
 const refresh=()=>{select.show(null);message.textContent='도안을 불러오는 중…';onPreview(null);queue.update({});};
 area.querySelector('[data-cad-retry]').onclick=refresh;
 active=()=>{queue.stop();select.stop();};refresh();
}

export function loadDraft(area,d,api,onPreview=()=>{},onSelect=()=>{}){
 clear();let timer;
 const message=area.querySelector('[data-cad-message]'),select=selection(area.querySelector('[data-guide-cad]'),onSelect),retry=area.querySelector('[data-cad-retry]');
 const queue=previewQueue(value=>api('/api/guide-registration/preview',value),result=>{
  select.show(result);message.textContent='';retry.hidden=true;onPreview(result);
 },error=>{select.show(null);message.textContent=error.message;retry.hidden=false;onPreview({available:false,error:error.message});});
 const refresh=()=>{clearTimeout(timer);queue.invalidate();select.show(null);area.querySelector('[data-cad-warnings]').textContent='';retry.hidden=true;onPreview(null);if(!d.code||!d.block){message.textContent='';onPreview({available:false});return;}message.textContent='도안을 불러오는 중…';timer=setTimeout(()=>queue.update({road:d.road,code:d.code,block:d.block,cad:d.cad||'',values:{}}),250);};
 const change=ev=>{if(['code','block','road'].includes(ev.target.name))refresh();};
 area.addEventListener('input',change);retry.onclick=refresh;
 active=()=>{clearTimeout(timer);queue.stop();select.stop();area.removeEventListener('input',change);};refresh();
}
