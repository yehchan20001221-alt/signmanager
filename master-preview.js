/* 공통 판의 폭·높이를 미리 보는 치수 화면. OBJ 형상이나 파일을 변경하지 않는다. */
import {e} from './views.js';
import {outline,points} from './plate-shape.js';
import {meshSvg,meshLayer} from './mesh-preview.js';
import {dimension} from './dimension.js';

export const label=name=>(name||'').replace('보조_','보조');
export function thumbnail(option){
 const spec=option.specs[0],scale=Math.min(44/spec.width,40/spec.height),w=spec.width*scale,h=spec.height*scale;
 return `<svg viewBox="0 0 64 56" aria-hidden="true"><g class="sl-master-silhouette">${outline(option,(64-w)/2,(56-h)/2,w,h)}</g></svg>`;
}
export function specimen(option,spec){
 const scale=Math.min(126/Math.max(...option.specs.map(p=>p.width)),100/Math.max(...option.specs.map(p=>p.height)));
 const w=spec.width*scale,h=spec.height*scale;
 return `<svg class="sl-plate-specimen" viewBox="0 0 160 116" aria-hidden="true"><path class="sl-specimen-baseline" d="M12 108H148"/><g>${outline(option,(160-w)/2,108-h,w,h)}</g></svg>`;
}
export function drawing(option,width,height,model,editable=!model){
 const w=Number(width),h=Number(height);
 if(!option||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return '<div class="sl-master-stage-empty">모양과 폭·높이를 선택하세요.</div>';
 const scale=Math.min(400/w,250/h);
 const pw=w*scale,ph=h*scale,x=270-pw/2,y=205-ph/2,top=y-40,right=x+pw+42;
 const plateImage=model&&meshLayer(model,0,0,[x,y,pw,ph],undefined,true,null,[0,0,600,380]);
 return `<svg class="sl-master-canvas" viewBox="0 0 600 380" role="group" aria-label="${e(label(option.displayName||option.name))} 폭 ${w} mm, 높이 ${h} mm">
 <defs><marker id="sl-master-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z"/></marker></defs>
 <path class="sl-master-guide" d="M${x} ${top-10}V${y+ph+15}M${x+pw} ${top-10}V${y+ph+15}M${x-15} ${y}H${right+12}M${x-15} ${y+ph}H${right+12}"/>
 ${plateImage?plateImage.html:`<g class="sl-master-silhouette">${outline(option,x,y,pw,ph)}</g>`}
 <path class="sl-master-center" d="M270 ${y-15}V${y+ph+15}M${x-15} 205H${x+pw+15}"/>
 ${dimension([x,y],[x+pw,y],top,w,!editable?'':`data-master-axis="width" tabindex="0" role="button" aria-label="폭 ${w} mm 수정"`)}
 ${dimension([x+pw,y],[x+pw,y+ph],right,h,!editable?'':`data-master-axis="height" tabindex="0" role="button" aria-label="높이 ${h} mm 수정"`)}
 </svg>`;
}

export function solid(option,width,height,thickness,yaw=-.55,pitch=-.2,camera){
 const w=Number(width),h=Number(height),t=Number(thickness),contour=points(option);
 if(!option||![w,h,t].every(v=>Number.isFinite(v)&&v>0)||!contour.length)return '<div class="sl-master-stage-empty">모양과 치수를 입력하세요.</div>';
 const vertices=[0,t].flatMap(y=>contour.map(([x,z])=>[(x-.5)*w,y,(z-.5)*h])),n=contour.length;
 const faces=[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>n+i),...contour.map((_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])];
 return meshSvg({vertices,faces},label(option.displayName||option.name)+` ${w} × ${h} mm`,yaw,pitch,camera);
}
