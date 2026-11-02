/* 판과 기존 지주 OBJ가 같은 축·화면 배율로 회전하는 입체 보기. */
import {e} from './views.js';
import {raster,edgePaths,rasterImage} from './mesh-raster.js';
import {initial} from './model-camera.js';
export function meshLayer(model,yaw=0,pitch=0,box=[30,30,660,320],extent=model?.vertices,drawing=false,camera=null,viewport=[0,0,box[0]+box[2]+1,box[1]+box[3]+1]){
 const raw=model?.vertices,faces=model?.faces;if(!raw?.length||!faces?.length)return '';
 const lo=[0,1,2].map(k=>extent.reduce((v,p)=>Math.min(v,p[k]),Infinity)),hi=[0,1,2].map(k=>extent.reduce((v,p)=>Math.max(v,p[k]),-Infinity));
 const centre=lo.map((v,k)=>(v+hi[k])/2),cx=box[0]+box[2]/2+(camera?.x||0),cy=box[1]+box[3]/2+(camera?.y||0);
 const rotate=p=>{
  const [x,y,z]=p.map((v,k)=>v-centre[k]),a=x*Math.cos(yaw)+y*Math.sin(yaw),b=-x*Math.sin(yaw)+y*Math.cos(yaw);
  return [a,z*Math.cos(pitch)-b*Math.sin(pitch),b*Math.cos(pitch)+z*Math.sin(pitch)];
 };
 const rotated=raw.map(rotate),frame=extent.map(rotate),span=[0,1].map(k=>frame.reduce((v,p)=>Math.max(v,p[k]),-Infinity)-frame.reduce((v,p)=>Math.min(v,p[k]),Infinity));
 const diameter=Math.max(.001,2*extent.reduce((max,p)=>Math.max(max,Math.hypot(...p.map((v,k)=>v-centre[k]))),0));
 const fit=Math.min(box[2]/Math.max(span[0],.001),box[3]/Math.max(span[1],.001));
 const scale=camera?(camera.fitBounds?fit:Math.min(box[2],box[3])/diameter)*camera.zoom:fit;
 const projected=rotated.map(p=>[cx+p[0]*scale,cy-p[1]*scale,p[2]*scale]);
 const paint=faces.map((face,index)=>{
  const ids=Array.isArray(face)?face:face.ids;
  const [a,b,c]=ids.slice(0,3).map(i=>rotated[i]),u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1;
  // 양면 OBJ도 카메라 쪽 법선으로 조명하며, 면 경계선을 따로 그리지 않는다.
  const facing=normal[2]>0?-1:1,light=Math.max(0,facing*(normal[0]*-.4+normal[1]*.6-normal[2])/(length*Math.sqrt(1.52)));
  const base=model.materials?.[index]?.toLowerCase()==='concrete'?190:220,shade=Math.round(base*(.42+.58*light));
  const color=typeof face.fill==='string'?face.fill.match(/^#([\da-f]{6})$/i)?.[1]:null;
  return {ids,uv:face.uv,uvClip:face.uvClip,texture:face.texture,cutout:face.cutout,projected:face.projected,pickBounds:face.pickBounds,pickable:face.pickable,part:face.part,stroke:face.stroke,material:model.materials?.[index],color:color?[0,2,4].map(i=>parseInt(color.slice(i,i+2),16)):drawing?[255,255,255]:[shade,shade,shade]};
 });
 const [left,top,width,height]=viewport,pixels=projected.map(([x,y,z])=>[x-left,y-top,z]);
 const buffer=raster(pixels,paint,Math.ceil(width),Math.ceil(height));
 let html=`<image x="${left}" y="${top}" width="${buffer.width}" height="${buffer.height}" href="${rasterImage(buffer)}"/>`;
 if(drawing){
  const lines=edgePaths(pixels,paint,buffer);
  html+=`<g transform="translate(${left} ${top})" fill="none" stroke-width=".8"><path d="${lines.hidden}" stroke="#8893a1" stroke-dasharray="4 3"/><path d="${lines.visible}" stroke="#303840"/></g>`;
 }
 for(const f of paint.filter(f=>f.part!==undefined)){
  html+=`<polygon points="${f.ids.map(i=>projected[i].slice(0,2).join(',')).join(' ')}" fill="transparent" stroke="${e(f.stroke||'none')}" stroke-width="1"/>`;
 }
 return {html,buffer,point:p=>{const r=rotate(p);return [cx+r[0]*scale,cy-r[1]*scale];},scale,lo,hi};
}
export function meshSvg(model,label,yaw=-.55,pitch=-.2,camera={...initial(),yaw,pitch},viewport=[0,0,720,380]){
 const [x,y,width,height]=viewport,box=[x+30,y+30,width-60,height-60];
 const drawing=meshLayer(model,camera.yaw??yaw,camera.pitch??pitch,box,model?.viewExtent,false,camera,viewport);
 return drawing?`<div class="sl-viewer"><svg class="sl-master-canvas sl-solid-canvas" viewBox="${viewport.join(' ')}" role="img" tabindex="0" aria-label="${e(label)}. 드래그 회전, Shift 드래그 이동, 휠 확대 축소">${drawing.html}</svg><span class="sl-camera-help">드래그 회전 · Shift+드래그 이동 · 휠 확대/축소</span><div class="sl-camera-tools">${[['orbit','↻','회전'],['pan','↔','이동'],['out','−','축소'],['in','+','확대'],['fit','⌖','전체 보기']].map(([key,text,name])=>`<button type="button" data-camera="${key}" ${['orbit','pan'].includes(key)?`aria-pressed="${camera.mode===key}"`:''} aria-label="${name}" title="${name}">${text}</button>`).join('')}</div></div>`:'';
}
