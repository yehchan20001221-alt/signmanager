/* 저장 전 교통표지 미리보기. CAD 파일 선택은 화면 시안이며 서버로 전송하지 않는다. */
import {selectionPayload} from './registration.js';
import * as signPreview from './sign-preview.js';
import {e} from './views.js';

let sequence=0,timer;
export function refresh(root,s,api){
 const form=root.querySelector('.sl-registration-flat');if(!form)return;
 let payload;
 try{
  if(!form.elements.category.value)throw new Error();
  payload={category:form.elements.category.value,code:form.elements.code.value.trim(),registration:selectionPayload(form,s.registrationOptions)};
 }catch{payload=null;}
 const key=JSON.stringify(payload);if(s.signDraft?.key===key)return;
 const seq=++sequence;clearTimeout(timer);signPreview.clear();
 s.signDraft={key,payload,message:payload?'3D 미리보기를 불러오는 중입니다…':'분류와 모양을 선택하면 3D를 확인할 수 있습니다.'};
 s.signModelKey='';signPreview.load(root,s,api);
 if(!payload)return;
 timer=setTimeout(async()=>{
  try{
   const result=await api('/api/sign-registration-preview',payload);
   if(seq!==sequence||!form.isConnected||s.screen!=='new')return;
   s.signDraft={...result,key,payload};await signPreview.load(root,s,api);
  }catch(err){
   if(seq!==sequence||!form.isConnected||s.screen!=='new')return;
   s.signDraft.message=err.message;signPreview.load(root,s,api);
  }
 },180);
}
export function syncFile(form){
 if(!form)return;
 const input=form.querySelector('[data-registration-cad-file]'),file=input?.files[0];
 const button=form.querySelector('[data-registration-cad-view]');
 if(button)button.disabled=!file;
}
export function chooseFile(form){
 const input=form.querySelector('[data-registration-cad-file]'),file=input.files[0];
 form.querySelector('[data-registration-cad-name]').textContent=file?.name||(form.closest('.gg-cad')?'':'선택한 파일 없음');
 const info=form.querySelector('[data-registration-cad-info]');info.hidden=true;
 info.innerHTML=file?`<strong>${e(file.name)}</strong><span>${(file.size/1024).toLocaleString('ko-KR',{maximumFractionDigits:1})} KB · CAD 도안 미리보기 연결 예정</span>`:'';
 syncFile(form);
}
