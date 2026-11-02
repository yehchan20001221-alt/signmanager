/* 평면 XY·정면/측면 Z와 동일 좌표의 3D 결과를 함께 표시한다. */
import {e} from './views.js';
import {meshLayer,meshSvg} from './mesh-preview.js';
import {initial,viewport as cameraViewport} from './model-camera.js';
import {dimensions as panelDimensions,dimensionLayout} from './guide-panel-layout.js';

export const hasCoordinates=d=>['X','Y','Z'].every(k=>d[k]!==''&&d[k]!=null&&Number.isFinite(Number(d[k])));
export function coordinateDimensions(project,d,view='plan',width=720,height=380,millimetres=false,panelEdit=false){
 if(!hasCoordinates(d))return '';
 const [x,y,z]=['X','Y','Z'].map(k=>Number(d[k]));
 const points=[[0,0,0],[x,0,0],[x,y,0],[x,y,z]].map(project);
 const axes=view==='plan'?['X','Y']:millimetres&&view==='front'?['X','Z']:['Z'];
 const dimensions=axes.map(axis=>{
  const i=['X','Y','Z'].indexOf(axis),a=points[i],b=points[i+1];
  const horizontal=axis==='X',line=axis==='Y'?(panelEdit?30:millimetres?75:140):width-(panelEdit?24:millimetres?75:145);
  const p=horizontal?[a[0],height-22]:[line,a[1]],q=horizontal?[b[0],height-22]:[line,b[1]];
  const tx=horizontal?Math.max(80,Math.min(width-80,(p[0]+q[0])/2)):line+(axis==='Y'?-14:14),ty=horizontal?p[1]-12:(p[1]+q[1])/2-10;
  const rotate=millimetres&&!horizontal,align=horizontal||rotate?'middle':axis==='Y'?'end':'start';
  const value=millimetres?Math.round(Number(d[axis])*1e5)/100:d[axis],unit=millimetres?'mm':'m';
  const fixed=axis==='X'&&d.preview_x_auto;
  return `<g class="gi-dimension${fixed?' gi-dimension-auto':''}" ${fixed?'role="img"':`data-gi-axis="${axis}" role="button" tabindex="0"`} aria-label="설치 ${axis} ${e(value)} ${unit} ${fixed?'자동':'수정'}"><path d="M${a.join(' ')}L${p.join(' ')}L${q.join(' ')}L${b.join(' ')}M${p[0]-5} ${p[1]+5}l10 -10M${q[0]-5} ${q[1]+5}l10 -10"/><text x="${tx}" y="${ty}" ${rotate?`transform="rotate(-90 ${tx} ${ty})"`:''} text-anchor="${align}">${e(value)}</text></g>`;
 }).join('');
 const [origin,anchor]=[points[0],points[3]];
 const marker=([x,y],label,kind)=>`<g class="gi-reference gi-reference-${kind}"><title>${label}</title><path class="gi-origin-halo" d="M${x-4} ${y-4}l8 8m0 -8l-8 8"/><path d="M${x-4} ${y-4}l8 8m0 -8l-8 8"/></g>`;
 return `<g class="gi-coordinate-drawing">${dimensions}${marker(origin,'지주 기준점','post')}${marker(anchor,'판 기준점 · 중앙 하단','plate')}</g>`;
}
export function positionDrawing(model,d,camera=initial(),viewport=[0,0,720,380],extent,selectedViews=['plan','front','side','solid'],layout){
 const panels=layout?.mode==='panels';
 if(!panels&&model.preview_position)d={...d,...model.preview_position,preview_x_auto:model.preview_x_auto};
 const single=selectedViews.length===1;
 let w=Math.max(320,viewport[2]/(single?1:2)-1),h=Math.max(240,viewport[3]/Math.ceil(selectedViews.length/2)-(single?0:27));
 const margin=panels&&single&&selectedViews[0]==='front'&&layout?.draft?dimensionLayout(layout.draft.parts,layout.assets,layout.selected,layout.readonly).margin:null;
 if(margin){w=Math.max(w,margin.left+margin.right+180);h=Math.max(h,margin.top+margin.bottom+150);}
 if(single&&selectedViews[0]==='solid')return meshSvg(model,'안내표지 배치',camera.yaw,camera.pitch,{...camera,fitBounds:true},[0,0,w,h]);
 // 이동 전 배율을 유지하되 현재 판·좌표가 화면 밖으로 나가면 범위를 넓힌다.
 const frame=panels?[...model.vertices]:[...(extent||[]),...model.vertices,[0,0,0]];
 if(!panels&&hasCoordinates(d))frame.push([Number(d.X),0,0],[Number(d.X),Number(d.Y),0],[Number(d.X),Number(d.Y),Number(d.Z)]);
 const painted={...model,faces:model.faces.map((f,i)=>Array.isArray(f)&&model.materials[i]==='plate'?{ids:f,fill:'#dce8f8'}:f)};
 const views=[['plan','평면 · X / Y',0,-Math.PI/2],['front','정면 · Z',0,0],['side','측면 · Z',Math.PI/2,0],['solid','3D',camera.yaw,camera.pitch]];
 return views.filter(([view])=>selectedViews.includes(view)).map(([view,label,yaw,pitch])=>{
  const solid=view==='solid',vp=solid?cameraViewport({width:w,height:h}):[0,0,w,h];
  const [vx,vy,vw,vh]=vp,editable=hasCoordinates(d)||!!layout?.draft,box=solid?[vx+20,vy+20,vw-40,vh-40]:margin?[margin.left,margin.top,w-margin.left-margin.right,h-margin.top-margin.bottom]:!editable?[24,18,w-48,h-36]:single?[80,55,Math.max(30,w-175),Math.max(20,h-150)]:view==='plan'?[165,24,Math.max(30,w-195),Math.max(20,h-95)]:[30,24,Math.max(30,w-205),Math.max(20,h-75)];
  const layer=meshLayer(painted,yaw,pitch,box,frame,!solid,solid?camera:null,vp);
  if(!layer)return '';
  const outlines=solid?'':model.faces.map((f,i)=>model.materials[i]==='plate'?`<polygon points="${(Array.isArray(f)?f:f.ids).map(id=>layer.point(model.vertices[id]).join(',')).join(' ')}" fill="none" stroke="#2860a2" stroke-width="1.5"/>`:'').join('');
  const dimensions=panels?(layout.draft?panelDimensions(layer.point,layout.draft,layout.assets,layout.selected,view,w,h,d,layout.readonly):''):coordinateDimensions(layer.point,d,view,w,h,single,!!layout);
  return `<section class="gi-view" aria-label="${label}">${single?'':`<header>${label}${solid?'<span>회전 · 드래그</span>':''}</header>`}<svg class="gi-position-canvas${solid?' sl-solid-canvas':''}" viewBox="${vp.join(' ')}" role="${editable&&!solid?'group':'img'}" tabindex="0" aria-label="${label} ${layout?.draft?'판 배치':'설치 위치'}">${layer.html}${outlines}${solid?'':dimensions}</svg></section>`;
 }).join('');
}
