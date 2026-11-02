/* 판 크기·간격과 설치위치를 한 초안으로 미리 보고, 마지막 적용에서 함께 저장한다. */
import {e} from './views.js';
import {setDimension,replacePiece,dimensionEdit} from './guide-panel-layout.js';
import {pieceGroups,pieceFamily} from './guide-piece-groups.js';
import {save} from './guide-asset-editor.js';
export function mount(area,api,source,onChange){
 const state={draft:null,assets:[],selected:0,changed:false,readonly:!!source.piece};
 let baseline='',busy=false,focusedBefore,focusedInput;
 const tools=document.createElement('footer');tools.className='gpa-tools';
 tools.innerHTML='<span class="gpa-message" role="status"></span><button type="button" class="sl-button" data-gpa-cancel>취소</button><button type="button" class="sl-button sl-primary" data-gpa-save>적용</button>';
 area.append(tools);area.classList.add('gpa-session');
 const message=text=>tools.querySelector('.gpa-message').textContent=text;
 const sync=()=>{
  const pending=state.changed||!!source.position(),invalid=!!area.querySelector('.gpa-inline[aria-invalid=true]');
  tools.querySelector('[data-gpa-save]').disabled=busy||!state.draft||!pending||invalid||!source.valid();
  tools.querySelector('[data-gpa-cancel]').disabled=busy||(!pending&&!invalid);
  area.dataset.layoutChanged=String(pending||invalid);
  area.querySelectorAll('[data-gpa-piece],.gpa-inline').forEach(el=>el.disabled=busy);
 };
 state.sync=sync;
 state.preview=()=>state.readonly?{parts:[state.draft.parts[state.selected]]}:state.draft;
 const changed=()=>{state.changed=JSON.stringify(state.draft)!==baseline;message('');sync();onChange(true);};
 const renderParts=()=>{
  if(state.readonly)return;
  area.querySelector('.gi-part-grid').innerHTML=state.draft.parts.map((p,i)=>{
   const current=state.assets.find(a=>a.key===p.piece),family=pieceFamily(current||{});
   const candidates=pieceGroups(state.assets,p.piece).filter(a=>a.key===p.piece||(pieceFamily(a)===family&&(family!=='arrows'||a.variant===current?.variant))).sort((a,b)=>a.B-b.B||a.H-b.H);
   const unique=new Map();
   for(const a of candidates){const key=[Number(a.B),Number(a.H)].join('x');if(!unique.has(key)||a.key===p.piece)unique.set(key,a);}
   const rows=[...unique.values()];
   return `<div class="gi-part-item"><button type="button" class="gi-part-link" data-gs-key="piece-link" data-gs-value="${e(p.piece)}" data-piece-family="${family}" aria-label="${i+1}번 개별 판 보기">${i+1}번 판 ↗</button><select class="gi-part-size" data-gpa-piece="${i}" aria-label="${i+1}번 판 규격">${rows.map(a=>`<option value="${e(a.key)}" ${a.key===p.piece?'selected':''}>${Number(a.B).toLocaleString('ko-KR',{maximumFractionDigits:1})} × ${Number(a.H).toLocaleString('ko-KR',{maximumFractionDigits:1})}</option>`).join('')}</select></div>`;
  }).join('');
 };
 area.addEventListener('focusin',ev=>{
  if(ev.target.matches('.gpa-inline')&&focusedInput!==ev.target){focusedInput=ev.target;focusedBefore=window.structuredClone(state.draft);ev.target.select();}
  if(ev.target.matches('[data-gpa-piece]')){state.selected=Number(ev.target.dataset.gpaPiece);onChange(false);}
 });
 area.addEventListener('input',ev=>{
  if(!ev.target.matches('.gpa-inline'))return;
  try{
   setDimension(state.draft.parts,state.assets,dimensionEdit(ev.target.dataset.gpaGap),ev.target.value);
   ev.target.removeAttribute('aria-invalid');ev.target.setCustomValidity('');changed();
  }catch(err){ev.target.setAttribute('aria-invalid','true');ev.target.setCustomValidity(err.message);message(err.message);sync();}
 });
 area.addEventListener('keydown',ev=>{
  if(!ev.target.matches('.gpa-inline'))return;
  if(ev.key==='Enter'){ev.preventDefault();ev.target.blur();}
  if(ev.key==='Escape'){ev.preventDefault();state.draft=focusedBefore;ev.target.removeAttribute('aria-invalid');ev.target.blur();changed();}
 });
 area.addEventListener('change',ev=>{
  if(!ev.target.matches('[data-gpa-piece]'))return;
  try{state.selected=Number(ev.target.dataset.gpaPiece);replacePiece(state.draft.parts,state.assets,state.selected,ev.target.value);changed();}
  catch(err){message(err.message);renderParts();}
 });
 area.addEventListener('submit',ev=>{if(ev.target.matches('.gi-form')){ev.preventDefault();ev.stopPropagation();}});
 area.addEventListener('click',async ev=>{
  const part=ev.target.closest('[data-gpa-show-part]');
  if(part){state.selected=Number(part.dataset.gpaShowPart);area.querySelectorAll('[data-gpa-show-part]').forEach(b=>b.setAttribute('aria-pressed',String(b===part)));onChange(true);return;}
  if(busy)return;
  if(ev.target.closest('[data-gpa-cancel]')){area.dispatchEvent(new window.CustomEvent('guide-configuration-cancel',{bubbles:true}));return;}
  if(ev.target.closest('[data-gpa-save]')){
   busy=true;sync();
   try{
    const position=source.position();
    if(source.commonId){
     const part=state.assets.find(a=>a.key===state.draft.parts[0].piece);
     const payload={id:source.commonId,...(state.readonly?{kind:'piece',shape:part.shape||source.shape,B:part.B,H:part.H}:{kind:'assembly',parts:state.draft.parts}),...(position?{position}:{})};
     await new Promise((resolve,reject)=>area.dispatchEvent(new window.CustomEvent('guide-common-panel-save',{bubbles:true,detail:{payload,resolve,reject}})));
    }else{
     const model=state.changed?(await api('/api/guide-assets/assemble',state.draft)).key:source.value.model;
     await save(area,{id:source.sign,rules:source.rules,model,...(position?{position}:{})});
    }
    state.changed=false;
   }catch(err){message(err.message);}finally{busy=false;if(area.isConnected)sync();}
  }
 });
 Promise.all([api('/api/guide-assets/split',source.value),api('/api/guide-assets')]).then(([draft,library])=>{
  if(!area.isConnected)return;
  state.draft=draft;state.assets=library.assets;baseline=JSON.stringify(draft);
  if(source.piece){
   const keys=source.piece.aliases||[source.piece.key],matches=draft.parts.map((p,i)=>({p,i})).filter(({p})=>keys.includes(p.piece));
   if(!matches.length)throw Error('이 도안의 판 연결을 찾을 수 없습니다.');
   state.selected=matches[0].i;
  }
  renderParts();sync();onChange(true);
 }).catch(err=>{if(area.isConnected)message(err.message);});
 sync();return state;
}
