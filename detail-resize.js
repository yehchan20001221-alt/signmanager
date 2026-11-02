/* 표지판 상세의 폭만 관리한다. 상세 DOM과 입력값은 다시 만들지 않는다. */
const widths={sign:null,guide:null};let observer=null;
export function panelWidth(value,total,kind='sign'){return Math.min(Math.max(value??(kind==='guide'?Math.max(820,total-420):580),420),Math.max(420,total-240));}
export function clear(work){
 observer?.disconnect();observer=null;
 work?.classList.remove('sl-resizable-detail','sl-panel-resizing');
 work?.querySelector('.sl-panel-resizer')?.remove();
}
export function mount(work){
 if(!work.querySelector('.sl-sign-detail,.sl-guide-detail:not([hidden])')){clear(work);return;}
 const kind=work.querySelector('.sl-guide-detail:not([hidden])')?'guide':'sign';
 work.classList.add('sl-resizable-detail');
 let handle=work.querySelector('.sl-panel-resizer');
 const apply=()=>{
  const total=work.getBoundingClientRect().width;
  const value=panelWidth(widths[kind],total,kind);
  work.style.setProperty('--sl-detail-width',value+'px');
  handle.setAttribute('aria-valuenow',String(Math.round(value)));
  handle.setAttribute('aria-valuemax',String(Math.max(420,total-240)));
 };
 if(!handle){
  handle=document.createElement('div');handle.className='sl-panel-resizer';handle.tabIndex=0;
  handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');
  handle.setAttribute('aria-label','표지판 상세 너비 조절');handle.setAttribute('aria-valuemin','420');
  let dragging=false;
  handle.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.preventDefault();dragging=true;handle.setPointerCapture(ev.pointerId);work.classList.add('sl-panel-resizing');});
  handle.addEventListener('pointermove',ev=>{if(!dragging)return;widths[kind]=panelWidth(work.getBoundingClientRect().right-ev.clientX,work.clientWidth,kind);apply();});
  const stop=()=>{dragging=false;work.classList.remove('sl-panel-resizing');};
  handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
  handle.addEventListener('keydown',ev=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();
   const total=work.clientWidth,current=panelWidth(widths[kind],total,kind);
   widths[kind]=panelWidth(ev.key==='Home'?420:ev.key==='End'?total:current+(ev.key==='ArrowLeft'?32:-32),total,kind);apply();
  });
  work.append(handle);observer?.disconnect();observer=new window.ResizeObserver(apply);observer.observe(work);
 }
 apply();
}
