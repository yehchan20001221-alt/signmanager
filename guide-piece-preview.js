/* 사용 중인 CAD 판 연결을 보존한 개별 판 미리보기. 같은 판이 여러 번 쓰이면 각 도안을 선택한다. DB는 수정하지 않는다. */
import {mappedModel,texture} from './guide-model-preview.js';
import {positionDrawing} from './guide-position-drawing.js';
import {initial} from './model-camera.js';
import {artworkIssue,showMappingWarning} from './guide-mapping-warning.js';
let observer,drawCurrent,sequence=0;
export function clear(){sequence++;observer?.disconnect();observer=null;drawCurrent=null;}
export function drawModel(){drawCurrent?.();}
export const partKey=p=>JSON.stringify([p.piece,p.cadPanel??-1,p.cadCrop||null,!!p.cadUnmapped,p.cadRegion||null]);
export function occurrences(choice,assets,signId){
 const keys=new Set(choice.aliases||[choice.key]),rows=new Map();
 for(const assembly of assets.filter(a=>a.kind==='assembly'&&a.uses?.some(u=>u.id===signId))){
  for(const p of assembly.parts||[])if(keys.has(p.piece)){
   const signature=partKey(p);
   if(!rows.has(signature))rows.set(signature,{...p,X:0,Y:0,Z:0});
  }
 }
 return rows.size?[...rows.values()]:[{id:'piece',name:choice.variant||'판',piece:choice.key,X:0,Y:0,Z:0,cadPanel:-1,cadUnmapped:!!signId}];
}
export async function mount(root,s,api,choice,assets){
 clear();const seq=sequence,target=root.querySelector('[data-ga-model]');if(!target||!choice)return;
 const ui=s.guideStandardsUI,use=choice.uses.find(u=>u.id===ui.assetUse),sign=s.tables.guidesigns.find(g=>g['안내표지ID']===use?.id);
 const rows=occurrences(choice,assets,use?.id);const index=Math.max(0,rows.findIndex(p=>partKey(p)===ui.assetPart));let model,textures=[];
 const render=()=>{
  if(!target.isConnected||!model?.available)return;
  const rect=target.getBoundingClientRect(),view=ui.assetView||'front';
  target.innerHTML=positionDrawing(mappedModel(model,textures,true),{},s.guidePositionCamera||initial(),[0,0,rect.width,rect.height],undefined,[view],{draft:{parts:[rows[index]]},assets,selected:0,readonly:true,mode:'panels'});
 };
 drawCurrent=render;observer=new window.ResizeObserver(render);observer.observe(target);
 let updateId=0;
 const load=async()=>{
  const current=++updateId;
  try{
   const cad=use?(sign?await api('/api/guides/cad-preview',{id:use.id,values:{}}):await api('/api/guide-registration/preview',{code:use.code,block:'CMRG'+use.code,values:{}})):null;
   if(seq!==sequence||current!==updateId||!target.isConnected)return;
   const value={configuration:{parts:[rows[index]]},X:0,Y:0,Z:0,post:'',...(cad?.available?{block:cad.block,cad:sign?.['CAD파일']||''}:{})};
   const result=await api('/api/guide-assets/preview',value);
   const images=cad?.available?await Promise.all((cad.textures||[]).map(texture)):[];
   if(cad?.texture_sheet)images[-1]=await texture(cad.texture_sheet);
   if(seq!==sequence||current!==updateId||!target.isConnected)return;
   model=result;textures=images;render();
   showMappingWarning(root,artworkIssue(choice,rows[index],cad)||result.mapping_error||'');
   const message=root.querySelector('[data-ga-preview-message]');
   message.textContent=use&&!cad?.available?'CAD 도안 미연결':use&&rows[index].cadUnmapped?'이 판의 CAD 연결을 확인하세요.':'';
  }catch(err){if(seq===sequence&&target.isConnected)root.querySelector('[data-ga-preview-message]').textContent=err.message;}
 };
 root.addEventListener('click',ev=>{
  const view=ev.target.closest('[data-ga-view]');
  if(view){ui.assetView=view.dataset.gaView;s.guidePositionCamera=initial();root.querySelectorAll('[data-ga-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===view)));render();}
 });
 await load();
}
