/* CAD 판별 원본 비율과 모델을 비교한다. 폭에 맞추는 기존 매핑의 1% 허용 오차를 따른다. */
import {e} from './views.js';

export function artworkIssue(piece,part,cad){
 if(part.cadUnmapped)return '';
 const size=part.cadRegion?.slice(2)||((part.cadPanel??-1)===-1?cad?.texture_sheet_size:cad?.texture_sizes?.[part.cadPanel]);
 const crop=part.cadRegion?[0,0,1,1]:part.cadCrop||[0,0,1,1],values=[Number(piece.B),Number(piece.H),size?.[0]*crop[2],size?.[1]*crop[3]];
 if(!values.every(v=>Number.isFinite(v)&&v>0))return '';
 const [width,height,cadWidth,cadHeight]=values;
 if(Math.abs((width/height)/(cadWidth/cadHeight)-1)<=.01+1e-9)return '';
 const number=v=>v.toLocaleString('ko-KR',{maximumFractionDigits:1});
 return `판과 도안 비율이 다릅니다. 판 ${number(width)} × ${number(height)} mm · 도안 ${number(width)} × ${number(width*cadHeight/cadWidth)} mm (판 폭 기준)`;
}
export const mappingBadge=message=>message?`<span class="gp-model-warning" role="img" aria-label="${e(message)}" title="${e(message)}">!</span>`:'';
export function showMappingWarning(root,message){
 const slot=root.querySelector('[data-gi-mapping-warning]');if(!slot)return;
 slot.hidden=!message;slot.innerHTML=mappingBadge(message);
}
