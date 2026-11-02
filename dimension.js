/* 치수선·보조선·숫자만 표시한다. SVG 좌표와 표기값을 분리해 확대도에도 사용한다. */
import {e} from './views.js';
export const mm=value=>(Math.round(value*1000*10)/10).toLocaleString('en-US',{maximumFractionDigits:1,useGrouping:false});
export function dimension(a,b,offset,text,attributes=''){
 const vertical=a[0]===b[0],start=vertical?[offset,a[1]]:[a[0],offset],end=vertical?[offset,b[1]]:[b[0],offset];
 const x=(start[0]+end[0])/2,y=(start[1]+end[1])/2;
 const tick=([px,py])=>`M${px-3} ${py+3}l6 -6`;
 return `<g class="sl-dimension ${attributes?'sl-master-measure':''}" ${attributes}><path class="sl-dimension-extension" d="M${a}L${start}M${b}L${end}"/><path class="sl-dimension-stroke" d="M${start}L${end}${tick(start)}${tick(end)}"/><text transform="translate(${vertical?x-7:x} ${vertical?y:y-7})${vertical?' rotate(-90)':''}" text-anchor="middle">${e(text)}</text></g>`;
}
