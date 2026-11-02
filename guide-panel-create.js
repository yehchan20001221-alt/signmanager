/* 개별 판과 조합 판의 공통 등록 작업면. 미리보기는 저장하지 않고 적용 시에만 공통 규격으로 등록한다. */
import {e} from './views.js';
import {viewbar} from './guide-panel-view.js';
import {pieceGroups,pieceLabel} from './guide-piece-groups.js';
import {setDimension,replacePiece,dimensionEdit} from './guide-panel-layout.js';
import {positionDrawing} from './guide-position-drawing.js';
import {previewQueue} from './guide-cad.js';
let redraw,cleanup;
export const clear=()=>{cleanup?.();cleanup=null;redraw=null;};
export const drawModel=()=>redraw?.();
export const initial=kind=>({kind,shape:'rectangle',B:'',H:'',parts:[],selected:0,view:'front',direction:'right',gap:'100'});
export function addPart(d,assets,key){
 if(d.parts.length>=8)throw Error('판은 8장까지 추가할 수 있습니다.');
 const chosen=assets.find(a=>a.key===key);if(!chosen)throw Error('추가할 판 규격을 선택하세요.');
 const anchor=d.parts[d.selected],size=assets.find(a=>a.key===anchor?.piece),gap=Number(d.gap);
 if(d.gap===''||!Number.isFinite(gap)||gap<0||gap>50000)throw Error('간격은 0~50,000 mm로 입력하세요.');
 let X=anchor?.X||0,Z=anchor?.Z||0;
 if(anchor){if(d.direction==='right')X+=size.B+gap;else if(d.direction==='left')X-=chosen.B+gap;else if(d.direction==='above')Z+=size.H+gap;else Z-=chosen.H+gap;}
 if(Math.abs(X)>50000||Math.abs(Z)>50000)throw Error('판 위치는 ±50,000 mm 안에서 입력하세요.');
 const id='p'+(Math.max(0,...d.parts.map(p=>Number(p.id.slice(1))))+1);
 d.parts.push({id,name:`${d.parts.length+1}번 판`,piece:key,X,Y:0,Z,cadPanel:-1});d.selected=d.parts.length-1;
}
export function pieceMesh(d){
 const w=Number(d.B)/1000,h=Number(d.H)/1000,tip=Math.min(h/2,w/4);
 const points={rectangle:[[0,0],[w,0],[w,h],[0,h]],'arrow-left':[[tip,0],[w,0],[w,h],[tip,h],[0,h/2]],'arrow-right':[[0,0],[w-tip,0],[w,h/2],[w-tip,h],[0,h]],'arrow-both':[[tip,0],[w-tip,0],[w,h/2],[w-tip,h],[tip,h],[0,h/2]]}[d.shape];
 const n=points.length;
 return {available:true,vertices:[0,.003].flatMap(y=>points.map(([x,z])=>[x,y,z])),faces:[points.map((_,i)=>i),points.map((_,i)=>2*n-1-i),...points.map((_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])],materials:Array(n+2).fill('plate')};
}
const valid=d=>d.kind==='piece'?['B','H'].every(k=>d[k]!==''&&Number(d[k])>0&&Number(d[k])<=50000):d.parts.length>=2;
export function content(d){
 const title=(d.kind==='piece'?'개별 판':'조합 판')+(d.id?' 수정':' 추가');
 const sizes=d.kind==='piece'?`<div class="gpc-fields"><label>모양<select name="shape" aria-label="판 모양">${[['rectangle','사각형'],['arrow-left','왼쪽 화살표'],['arrow-right','오른쪽 화살표'],['arrow-both','양쪽 화살표']].map(([k,v])=>`<option value="${k}" ${d.shape===k?'selected':''}>${v}</option>`).join('')}</select></label>${[['B','폭'],['H','높이']].map(([k,v])=>`<label>${v} (mm)<input name="${k}" aria-label="판 ${v} (mm)" type="number" min="0.001" max="50000" step="any" required value="${e(d[k])}"></label>`).join('')}</div>`:`<div class="gi-part-grid" data-gpc-parts></div><div class="gpc-add"><label>추가할 개별 판<select data-gpc-choice aria-label="추가할 개별 판"><option value="">규격 선택</option></select></label><div><label>배치<select name="direction" aria-label="추가할 판 배치">${[['right','오른쪽'],['left','왼쪽'],['above','위쪽'],['below','아래쪽']].map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>간격 (mm)<input name="gap" aria-label="추가할 판 간격 (mm)" type="number" min="0" max="50000" value="${e(d.gap)}"></label><button type="button" class="sl-button" data-gpc-add>판 추가</button></div><span class="sl-sub" data-gpc-anchor></span></div>`;
 return `<section class="gi-workspace gpc-create" data-gpc-create aria-label="${title}"><header class="gi-heading"><strong>${title}</strong><span>mm</span></header><div class="gi-columns"><section class="gi-preview">${viewbar(d.view,'판 배치','data-gpc-view')}<div class="gi-model" data-gpc-model><p class="sl-empty">${d.kind==='piece'?'모양과 규격을 입력하세요.':'개별 판을 선택하여 추가하세요.'}</p></div></section><aside class="gi-details"><section class="gi-parts"><header><h3>${d.kind==='piece'?'판 규격':'판 구성'}</h3><span>mm</span></header>${sizes}</section><section class="gi-signs"><header><h3>적용 표지</h3></header><p class="sl-sub">아직 연결된 표지가 없습니다.</p></section></aside></div><footer class="gpa-tools"><span class="gpa-message" role="status"></span><button type="button" class="sl-button" data-gpc-cancel>취소</button><button type="button" class="sl-button sl-primary" data-gpc-save disabled>적용</button></footer></section>`;
}
export function mount(root,s,api){
 clear();const area=root.querySelector('[data-gpc-create]');if(!area)return;
 const d=s.guideStandardsUI.panelCreation,target=area.querySelector('[data-gpc-model]');let assets=[],model,busy=false,alive=true;
 const message=text=>area.querySelector('.gpa-message').textContent=text;
 const sync=()=>{area.querySelector('[data-gpc-save]').disabled=busy||!valid(d)||!!area.querySelector('[aria-invalid=true]');area.querySelectorAll('[data-gpc-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gpcView===d.view)));};
 const draw=()=>{
  if(!model||!target.isConnected)return;const box=target.getBoundingClientRect();
  const draft=d.kind==='piece'?{parts:[{piece:'new',X:0,Y:0,Z:0}]}:d,library=d.kind==='piece'?[{key:'new',B:Number(d.B),H:Number(d.H)}]:assets;
  const focused=document.activeElement?.matches('.gpa-inline')?document.activeElement:null,start=focused?.selectionStart,end=focused?.selectionEnd;
  target.innerHTML=positionDrawing(model,{X:0,Y:0,Z:0},s.guidePositionCamera||undefined,[0,0,box.width,box.height],null,[d.view],{mode:'panels',draft,assets:library,selected:d.selected,readonly:d.kind==='piece'});
  if(focused){const next=target.querySelector(`[data-gpa-gap="${focused.dataset.gpaGap}"]`);if(next){next.replaceWith(focused);focused.focus({preventScroll:true});focused.setSelectionRange(start,end);}}
 };redraw=draw;
 const queue=previewQueue(value=>api('/api/guide-assets/preview',{configuration:value,X:0,Y:0,Z:0}),value=>{model=value;draw();},err=>message(err.message));
 const update=()=>{area.dataset.layoutChanged='true';message('');sync();if(d.kind==='piece'){if(valid(d)){model=pieceMesh(d);draw();}else{model=null;target.innerHTML='<p class="sl-empty">폭과 높이를 입력하세요.</p>';}}else if(d.parts.length)queue.update({parts:d.parts});else{model=null;target.innerHTML='<p class="sl-empty">개별 판을 선택하여 추가하세요.</p>';}};
 const renderParts=()=>{
  if(d.kind==='piece')return;
  area.querySelector('[data-gpc-parts]').innerHTML=d.parts.map((p,i)=>`<label class="gi-part-item"><span>${i+1}번 판</span><select data-gpc-part="${i}" aria-label="${i+1}번 판 규격">${assets.map(a=>`<option value="${e(a.key)}" ${a.key===p.piece?'selected':''}>${e(pieceLabel(a))}</option>`).join('')}</select><button type="button" data-gpc-remove="${i}" aria-label="${i+1}번 판 제거">×</button></label>`).join('');
  area.querySelector('[data-gpc-add]').disabled=d.parts.length>=8;
  area.querySelector('[data-gpc-anchor]').textContent=d.parts.length?`${d.selected+1}번 판 기준`:'첫 번째 판';
 };
 const observer=new window.ResizeObserver(draw);observer.observe(target);cleanup=()=>{alive=false;observer.disconnect();queue.stop();};
 area.addEventListener('input',ev=>{
  const input=ev.target;
  if(['B','H','gap'].includes(input.name)){d[input.name]=input.value;if(input.name!=='gap')update();return;}
  if(input.matches('.gpa-inline')){try{setDimension(d.parts,assets,dimensionEdit(input.dataset.gpaGap),input.value);input.removeAttribute('aria-invalid');update();}catch(err){input.setAttribute('aria-invalid','true');message(err.message);sync();}}
 });
 area.addEventListener('focusin',ev=>{if(ev.target.hasAttribute('data-gpc-part')){d.selected=Number(ev.target.dataset.gpcPart);area.querySelector('[data-gpc-anchor]').textContent=`${d.selected+1}번 판 기준`;draw();}});
 area.addEventListener('change',ev=>{
  if(ev.target.name==='direction'){d.direction=ev.target.value;return;}
  if(ev.target.name==='shape'){d.shape=ev.target.value;update();return;}
  if(ev.target.hasAttribute('data-gpc-part')){try{replacePiece(d.parts,assets,Number(ev.target.dataset.gpcPart),ev.target.value);update();}catch(err){message(err.message);renderParts();}}
 });
 area.addEventListener('click',async ev=>{
  if(busy)return;
  const view=ev.target.closest('[data-gpc-view]');if(view){d.view=view.dataset.gpcView;s.guidePositionCamera=null;sync();draw();return;}
  if(ev.target.closest('[data-gpc-cancel]')){area.dispatchEvent(new window.CustomEvent('guide-panel-create-cancel',{bubbles:true}));return;}
  try{
   if(ev.target.closest('[data-gpc-add]')){addPart(d,assets,area.querySelector('[data-gpc-choice]').value);renderParts();update();}
   const remove=ev.target.closest('[data-gpc-remove]');if(remove){d.parts.splice(Number(remove.dataset.gpcRemove),1);d.selected=Math.max(0,Math.min(d.selected,d.parts.length-1));renderParts();update();}
   if(ev.target.closest('[data-gpc-save]')){
    busy=true;sync();area.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);const payload={...(d.id?{id:d.id}:{}),...(d.kind==='piece'?{kind:d.kind,shape:d.shape,B:d.B,H:d.H}:{kind:d.kind,parts:d.parts})};
    await new Promise((resolve,reject)=>area.dispatchEvent(new window.CustomEvent('guide-common-panel-save',{bubbles:true,detail:{payload,resolve,reject}})));
   }
  }catch(err){message(err.message);}finally{busy=false;if(area.isConnected){area.querySelectorAll('input,select,button').forEach(el=>el.disabled=false);sync();}}
 });
 if(d.kind==='assembly')api('/api/guide-assets').then(result=>{if(!alive)return;assets=pieceGroups(result.assets).sort((a,b)=>a.B-b.B||a.H-b.H);area.querySelector('[data-gpc-choice]').innerHTML='<option value="">규격 선택</option>'+assets.map(a=>`<option value="${e(a.key)}">${e(pieceLabel(a))}</option>`).join('');renderParts();if(d.parts.length)update();}).catch(err=>message(err.message));
 else if(valid(d))update();
}
