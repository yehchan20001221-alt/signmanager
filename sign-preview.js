/* 표지 상세에서 등록된 판·지주 OBJ와 표지 이미지를 함께 확인한다. */
import {e,panelSize} from './views.js';
import {meshSvg} from './mesh-preview.js';
import {initial,viewport} from './model-camera.js';
import {supportRoad} from './catalog-supports.js';
import * as signCoordinates from './sign-coordinates.js';

export function choices(s){
 const detail=s.screen==='new'?s.signDraft?.detail:s.detail;
 const panels=detail?.panelSelections||[],selected=s.signPreviewChoice;
 const panel=panels.find(p=>p['판ID']===selected?.panelId)||panels.find(p=>p['제원명']==='중형')||panels[0];
 const position=c=>c.slots.findIndex(slot=>slot.own&&slot['판ID']===panel?.['판ID']);
 const selectedPost=detail?.configs?.find(c=>c['구성ID']===selected?.configId)?.support['지주기초ID'];
 const seen=new Set(),configs=(detail?.configs||[]).filter(c=>c.support.modelLinked!==false&&(s.screen==='new'?s.tables.configs.find(r=>r['구성ID']===c['구성ID']):(s.tables.overrides?.find(r=>r['표지ID']===s.selected&&r['구성ID']===c['구성ID'])||s.tables.configs.find(r=>r['구성ID']===c['구성ID'])))?.active!==false&&c.slots.some(slot=>slot.own&&slot['판ID']===panel?.['판ID']))
  .sort((a,b)=>a.slots.length-b.slots.length||Number(a.support.formNumber||99)-Number(b.support.formNumber||99)||position(a)-position(b))
  .filter(c=>{const id=c.support['지주기초ID'];if(seen.has(id))return false;seen.add(id);return true;})
  .sort((a,b)=>Number(a.support.formNumber||99)-Number(b.support.formNumber||99));
 const config=selected?.panelId===panel?.['판ID']&&selected?.configId!==undefined?configs.find(c=>c.support['지주기초ID']===selectedPost):configs.find(c=>c.support['형식']!=='부착식')||configs[0];
 return {panels,panel,configs,config};
}
export function draw(root,s){
 const target=root.querySelector('[data-sign-model]');if(!target)return;
 const model=s.signModel;
 target.innerHTML=model?.available?meshSvg(model,'표지판과 지주 3D 미리보기',-.18,-.08,s.signCamera||{...initial(),yaw:-.18,pitch:-.08},viewport(target.getBoundingClientRect())):`<p class="sl-empty" role="status">${e(model?.message||'3D 미리보기를 불러오는 중입니다…')}</p>`;
 target.title=model?.depthBasis||'';
}
let sequence=0,imageKey='',imagePromise,observer;
export function clear(){++sequence;observer?.disconnect();observer=null;}
function texture(identity){
 if(imageKey===identity)return imagePromise;
 imageKey=identity;
 imagePromise=new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{
   try{
    const scale=Math.min(1,768/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
    resolve(context.getImageData(0,0,canvas.width,canvas.height));
   }catch{imageKey='';reject(new Error('표지판 이미지를 읽지 못했습니다.'));}
  };
  image.onerror=()=>{imageKey='';reject(new Error('표지판 이미지를 불러오지 못했습니다.'));};
  image.src=identity;
 });
 return imagePromise;
}
export async function load(root,s,api){
 const area=root.querySelector('[data-sign-preview]');if(!area)return;
 signCoordinates.load(root,s.screen==='new'?(s.signDraft?.payload?.code?'CMRS'+s.signDraft.payload.code:''):s.detail?.sign?.['CAD블록명'],api);
 const seq=++sequence,{panels,panel,configs,config}=choices(s);
 const panelId=panel?.['판ID'],configId=config?.['구성ID']||'';
 s.signPreviewChoice={panelId,configId};
 const button=(kind,id,label,selected,title=label)=>`<button type="button" data-sign-preview-${kind} value="${e(id)}" aria-pressed="${selected}" title="${e(title)}">${e(label)}</button>`;
 const roads=['고속도로','일반도로'].filter(road=>configs.some(c=>supportRoad(c.support)===road));
 area.innerHTML=`${panel?`<div class="sl-sign-preview-controls" role="group" aria-label="3D 미리보기 선택"><div class="sl-sign-preview-choice" role="group" aria-label="미리보기 크기"><span>크기</span>${panels.map(p=>button('size',p['판ID'],panelSize(p).split(' · ')[0],p['판ID']===panelId,panelSize(p))).join('')}</div><div class="sl-sign-preview-choice" role="group" aria-label="미리보기 지주"><span>지주</span>${button('config','','지주 없음',!configId)}${roads.map(road=>`<div class="sl-sign-preview-choice" role="group" aria-label="${road}">${roads.length>1?`<span>${road}</span>`:''}${configs.filter(c=>supportRoad(c.support)===road).map(c=>button('config',c['구성ID'],c.support.formNumber?'형식 '+c.support.formNumber:c.support['형식'],c['구성ID']===configId,`${road} · ${c.support['형식']}${c.support.formNumber?' · 형식 '+c.support.formNumber:''}`)).join('')}</div>`).join('')}</div></div>`:''}<div data-sign-model></div>`;
 observer?.disconnect();
 observer=new window.ResizeObserver(()=>{if(area.isConnected&&s.signModel?.available)draw(root,s);});
 observer.observe(area.querySelector('[data-sign-model]'));
 if(!panel){s.signModel={message:s.screen==='new'?(s.signDraft?.message||'분류와 모양을 선택하면 3D를 확인할 수 있습니다.'):'표지판 크기를 등록하면 미리보기를 볼 수 있습니다.'};draw(root,s);return;}
 const draft=s.screen==='new'?s.signDraft:null;
 const key=[draft?.key||s.selected,panelId,configId].join('/');
 if(s.signModelKey===key){draw(root,s);return;}
 s.signModelKey='';s.signModel=null;draw(root,s);
 try{
  const modelRequest=draft?api('/api/sign-registration-model',{...draft.payload,panel_id:panelId,config_id:configId}):api(`/api/signs/${encodeURIComponent(s.selected)}/model?panel_id=${encodeURIComponent(panelId)}&config_id=${encodeURIComponent(configId)}`);
  const imageUrl=draft?draft.imageUrl:`/api/signs/${encodeURIComponent(s.selected)}/image`;
  const [model,pixels]=await Promise.all([modelRequest,imageUrl?texture(imageUrl):null]);
  if(seq!==sequence||!area.isConnected)return;
  for(const face of model.faces)if(face.signImage&&pixels)face.texture=pixels;
  s.signModel=model;s.signModelKey=key;draw(root,s);
 }catch(err){if(seq===sequence&&area.isConnected){s.signModel={message:err.message};draw(root,s);}}
}
