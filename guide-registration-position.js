/* 신규 안내표지의 선택한 지주와 입력 좌표로 미리보기를 만든다. */
import {previewQueue} from './guide-cad.js';
import {positionIssue} from './guide-positions.js';
import {draw} from './guide-model-preview.js';
let stop,observer;
export function clear(){stop?.();observer?.disconnect();}
export function previewValue(d){return {road:d.road,model:d.model,...(d.configuration?{configuration:d.configuration}:{}),post:d.post,block:d.block||'',cad:d.cad||'',...Object.fromEntries(['X','Y','Z'].map(k=>[k,d.post?d[k]:'0']))};}
export function mount(area,d,options,api,s){
 clear();const target=area.querySelector('[data-guide-model]'),message=area.querySelector('[data-registration-position-message]');
 const issue=d.post?positionIssue({'지주형식':d.post},options.postCatalog,options.postModels):'';
 d.positionError=!!issue;s.guideModel=null;s.guideSignCamera=null;s.guideHidePost=false;
 const hasModel=!!(d.model||d.configuration?.parts?.length);
 message.textContent=issue||(!hasModel?'판을 추가하세요.':!d.post?'지주 없음':d.template!==''?'설치위치 등록됨':'설치위치 미등록');
 const submit=area.querySelector('[type=submit]');if(submit)submit.disabled=!hasModel||!!issue||!!d.cad&&!d.block;
 // 판 구성 편집기가 있는 화면은 그 편집기가 미리보기를 갱신한다.
 if(area.querySelector('[data-sign-panels]'))return;
 const queue=previewQueue(value=>api(value.configuration?'/api/guide-assets/preview':'/api/guide-position-preview',value).then(result=>({...result,cad_block:value.block})),value=>{
  s.guideModel={...value,source:'registration',mapping_sizes:value.mapping_sizes||{obj:d.asset?.form.parts.map(p=>[p.B,p.H])||[]}};
  if(value.warning)message.textContent=value.warning;
  draw(area,s);
 },error=>{s.guideModel={message:error.message};draw(area,s);});
 observer=new window.ResizeObserver(()=>draw(area,s));observer.observe(target);
 let timer;const change=ev=>{if(!['block','code'].includes(ev.target.name)||!d.model)return;clearTimeout(timer);queue.invalidate();timer=setTimeout(()=>queue.update(previewValue(d)),300);};
 area.addEventListener('input',change);
 stop=()=>{clearTimeout(timer);queue.stop();area.removeEventListener('input',change);};
 if(d.model||d.configuration?.parts?.length)queue.update(previewValue(d));else{s.guideModel={message:'판을 추가하면 3D가 표시됩니다.'};draw(area,s);}
}
