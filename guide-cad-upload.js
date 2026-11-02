/* 안내 CAD 파일 선택과 블록 선택. 저장·미리보기는 신규/상세의 기존 경로를 사용한다. */
import {e} from './views.js';
export const selectedBlock=(asset,current)=>asset.blocks.includes(current)?current:asset.blocks.length===1?asset.blocks[0]:'';
export function mount(root,api,asset,current,onChoose){
 const slot=root.querySelector('[data-cad-upload]');if(!slot)return;
 const input=slot.querySelector('[data-registration-cad-file]'),info=slot.querySelector('[data-registration-cad-info]'),name=slot.querySelector('[data-registration-cad-name]');
 const show=(value,block)=>{
  name.textContent=value?.filename||'';
  name.parentElement.hidden=!value?.filename;
  info.hidden=!value||!!block;
  info.innerHTML=value&&!block?`<label>CAD 블록<select data-guide-upload-block aria-label="업로드 파일 블록"><option value="">블록 선택</option>${value.blocks.map(b=>`<option value="${e(b)}">${e(b)}</option>`).join('')}</select></label>`:'';
 };
 show(asset,current);
 slot.addEventListener('change',async ev=>{
  if(ev.target.matches('[data-guide-upload-block]')){if(ev.target.value)onChoose(asset,ev.target.value);return;}
  if(ev.target!==input)return;
  const file=input.files[0];if(!file)return;
  const controls=Array.from(root.querySelectorAll('input,select,button')).map(c=>[c,c.disabled]);controls.forEach(([c])=>c.disabled=true);
  let unlocked=false;const unlock=()=>{if(!unlocked){controls.forEach(([c,disabled])=>c.disabled=disabled);unlocked=true;}};
  try{
   if(!/\.(dwg|dxf)$/i.test(file.name)||file.size>50_000_000)throw Error('50MB 이하 DWG 또는 DXF 파일을 선택하세요.');
   info.hidden=false;info.textContent='CAD 파일을 읽는 중…';
   const uploaded=await api('/api/guide-cad-upload?filename='+encodeURIComponent(file.name),file);
   if(!slot.isConnected)return;
   asset=uploaded;const block=selectedBlock(asset,current);show(asset,block);unlock();onChoose(asset,block);
  }catch(err){if(slot.isConnected){info.hidden=false;info.innerHTML=`<p class="sl-error" role="alert">${e(err.message)}</p>`;}}
  finally{unlock();input.value='';}
 });
}
