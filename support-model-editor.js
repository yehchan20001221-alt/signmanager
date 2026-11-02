/* 지주 OBJ 업로드. 치수는 왼쪽 도면에서 확인하고 파일은 저장 시 연결한다. */
import {e} from './views.js';
import {helpButton} from './obj-upload-help.js';
export function fields(form,model){
 const target=form?.querySelector('[data-support-dimensions]');if(!target)return;
 const values=model?.dimensions||{};
 const uploadLabel=model?.filename?'OBJ 교체':'OBJ 업로드';
 target.innerHTML=`<section class="sl-support-upload"><h3>OBJ 모델</h3><div class="sl-model-file"><span>${e(model?.filename||'연결된 모델 없음')}</span><div class="sl-obj-actions">${helpButton()}<label class="sl-button">${uploadLabel}<input type="file" accept=".obj" data-support-upload aria-label="지주 ${uploadLabel}" title="m 단위 OBJ · 최대 20MB"></label></div></div><p class="sl-sub">${model?.filename?'교체한 파일은 저장 시 기존 모델을 대체합니다.':'업로드한 모델은 저장 시 연결됩니다.'}</p></section>`;
 const diameter=form.elements['단면규격'];if(diameter)diameter.closest('label').hidden=Object.keys(values).length>0;
}
export async function upload(s,form,file,api){
 if(!/\.obj$/i.test(file.name)||file.size>20000000)throw new Error('20MB 이하 OBJ 파일을 선택하세요.');
 const identity=s.screen==='new'?(s.modelSource||s.copyId||''):s.selected;
 const result=await api(`/api/support-upload?filename=${encodeURIComponent(file.name)}&identity=${encodeURIComponent(identity)}`,file);
 s.supportUpload=result.key;s.supportDraftModel=result.model;s.modelSource='';
 if(form.elements.model_source)form.elements.model_source.value='';
 fields(form,result.model);
}
