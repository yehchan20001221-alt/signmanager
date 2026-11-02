/* 안내표지 통합 뷰어. 실제 면의 래스터 깊이·UV로 도안 문구를 선택한다. */
import {e} from './views.js';
import {meshLayer} from './mesh-preview.js';
import {texturePoint} from './mesh-raster.js';
import {initial} from './model-camera.js';

export const state=s=>s.guideViewer??={view:'3d',part:-1,overlay:true,focus:'plates'};
export function problems(s){
 const model=s.guideModel,result=s.guideCadPreview;
 const texture=s.guideTextureMessage?.includes('불러오는 중')?'':s.guideTextureMessage;
 return [...new Set([model?.error,model?.warning,model?.mapping_error,model?.position_missing?'설치위치가 등록되지 않았습니다.':'',model?.model_missing||model?.plate_missing?model.message:'',result?.error,...(result?.warnings||[]),texture].filter(Boolean))];
}
export function combine(base,highlight){
 if(base.width!==highlight.width||base.height!==highlight.height)throw new Error('CAD 문구와 도안의 크기가 다릅니다.');
 const data=new Uint8ClampedArray(base.data);
 for(let i=0;i<data.length;i+=4){const a=highlight.data[i+3]/255;for(let k=0;k<3;k++)data[i+k]=highlight.data[i+k]*a+data[i+k]*(1-a);data[i+3]=highlight.data[i+3]+data[i+3]*(1-a);}
 return {width:base.width,height:base.height,data};
}
const corners=p=>{const [x,z,w,h]=p.box;return [[x,p.y,z],[x+w,p.y,z],[x+w,p.y,z+h],[x,p.y,z+h]];};
export function sync(root,s){
 const toolbar=root.querySelector('.gg-view-toolbar');if(!toolbar)return;
 const ui=state(s);
 toolbar.querySelectorAll('[data-guide-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideView===ui.view)));
 const issues=problems(s),notice=toolbar.querySelector('[data-guide-issues]');
 toolbar.hidden=!issues.length;
 notice.hidden=!issues.length;if(!issues.length)notice.open=false;
 notice.querySelector('[data-guide-issue-list]').innerHTML=issues.map(message=>`<p>${e(message)}</p>`).join('');

}
export function render(model,s,viewport){
 const ui=state(s),plates=model.drawing_projection?.plates||[];
 const extent=ui.focus==='all'?model.vertices:plates.length?plates.flatMap(corners):model.vertices;
 const camera=s.guideSignCamera||{...initial(),yaw:ui.view==='front'?0:-.18,pitch:ui.view==='front'?0:-.05};
 const [x,y,w,h]=viewport,frame=meshLayer(model,camera.yaw,camera.pitch,[x+30,y+30,w-60,h-60],extent,false,{...camera,fitBounds:true},viewport);
 if(!frame)return {html:''};
 let outlines='';
 if(Math.cos(camera.yaw)>0)outlines=plates.map(p=>`<polygon points="${corners(p).map(p=>frame.point(p).join(',')).join(' ')}" fill="none" stroke="#245fa8" stroke-width="1" pointer-events="none"/>`).join('');
 const tools=[['orbit','↻','회전'],['pan','↔','이동'],['out','−','축소'],['in','+','확대']].map(([key,text,label])=>`<button type="button" data-camera="${key}" ${['orbit','pan'].includes(key)?`aria-pressed="${camera.mode===key}"`:''} aria-label="${label}" title="${label}">${text}</button>`).join('');
 return {html:`<div class="sl-viewer"><svg class="sl-master-canvas sl-solid-canvas" viewBox="${viewport.join(' ')}" role="img" tabindex="0" aria-label="안내표지 3D 모델. 문구 선택, 드래그 회전, 휠 확대 축소">${frame.html}${outlines}</svg><div class="sl-camera-tools">${tools}<button type="button" data-guide-focus="plates" aria-pressed="${ui.focus==='plates'}">표지판 확대</button><button type="button" data-guide-focus="all" aria-pressed="${ui.focus==='all'}">전체 보기</button></div></div>`,
  pick(px,py,fields){const uv=texturePoint(frame.buffer,px-x,py-y);if(!uv)return '';return fields.find(f=>{const b=f.bounds;return b&&uv[0]>=b[0]&&uv[0]<=b[0]+b[2]&&1-uv[1]>=b[1]&&1-uv[1]<=b[1]+b[3];})?.tag||'';}};
}
