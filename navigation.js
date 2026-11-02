/* 화면별 조회 위치만 브라우저 이력에 보존한다. 입력 초안·모델·파일은 이력에 넣지 않는다. */
const fields=['section','mainSection','selected','search','filter','masterName','masterSize','postRoad','postScope','guideSelected','guideRoad','guideFilter'];
const commonFields=['tab','panelTab','query','selected','spec','piecePosition','assetSelection','assetFamily','assetUse','assetSpec','positionSelected','positionSign'];
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>['string','boolean'].includes(typeof value?.[k])).map(k=>[k,value[k]]));
export const route=s=>({...pick(s,fields),common:pick(s.guideStandardsUI,commonFields)});
export const pageKey=r=>r.section==='guide-standards'?r.section+':'+(r.common.tab||'panels'):r.section;
export function historyController(host,read,restore,canLeave,onError=()=>{}){
 let index=host.history.state?.signManager?.index||0,current=read(),restoring=false,reverting=false;
 const pack=()=>({signManager:{index,route:current}});
 host.history.replaceState(pack(),'');
 const sync=()=>{
  if(restoring||reverting)return;
  const next=read();if(JSON.stringify(next)===JSON.stringify(current))return;
  const push=pageKey(next)!==pageKey(current);current=next;if(push)index++;
  host.history[push?'pushState':'replaceState'](pack(),'');
 };
 host.addEventListener('popstate',async ev=>{
  const entry=ev.state?.signManager;if(!entry)return;
  if(reverting){reverting=false;return;}
  if(restoring||!canLeave()){reverting=true;host.history.go(index-entry.index);return;}
  restoring=true;index=entry.index;current=entry.route;
  try{await restore(current);}catch(err){onError(err);}finally{restoring=false;current=read();host.history.replaceState(pack(),'');}
 });
 return sync;
}
export function neighbor(rects,index,key){
 const a=rects[index];if(!a)return -1;
 const horizontal=key==='ArrowLeft'||key==='ArrowRight',direction=key==='ArrowLeft'||key==='ArrowUp'?-1:1;
 const [main,cross]=horizontal?['x','y']:['y','x'];
 const candidates=rects.map((r,i)=>({i,d:(r[main]-a[main])*direction,c:Math.abs(r[cross]-a[cross])})).filter(r=>r.i!==index&&r.d>1);
 candidates.sort((p,q)=>p.c-q.c||p.d-q.d);return candidates[0]?.i??-1;
}
export function bindKeyboard(root,blocked){
 const groups=[['.ga-catalog-scroll','data-ga-asset'],['.gs-spec-scroll','data-gs-value'],['.gs-list','data-gs-value'],['.sl-grid','data-master-select'],['.sl-grid','data-post'],['.sl-grid','data-sign'],['.sl-guide-list','data-guide']];
 root.addEventListener('keydown',ev=>{
  if(ev.defaultPrevented||blocked()||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)||ev.ctrlKey||ev.altKey||ev.metaKey||ev.target.closest('input,select,textarea,[contenteditable=true]'))return;
  const scope=groups.find(([selector,attr])=>ev.target.closest(selector)&&ev.target.closest(`button[${attr}]`));if(!scope)return;
  const [selector,attr]=scope,container=ev.target.closest(selector),buttons=[...container.querySelectorAll(`button[${attr}]`)].filter(b=>!b.disabled&&b.getBoundingClientRect().width);
  const index=buttons.indexOf(ev.target.closest(`button[${attr}]`)),rects=buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}),next=neighbor(rects,index,ev.key);
  ev.preventDefault();if(next<0)return;
  const key=buttons[next].getAttribute(attr);buttons[next].click();
  const focus=()=>{const target=[...root.querySelectorAll(`${selector} button[${attr}]`)].find(b=>b.getAttribute(attr)===key);if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest'});}};
  window.requestAnimationFrame(focus);
 });
}
export function observe(root,sync){const observer=new window.MutationObserver(sync);observer.observe(root,{childList:true,subtree:true});return observer;}
