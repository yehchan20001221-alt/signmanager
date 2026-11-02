/* 직교 투영 면을 픽셀 깊이로 가린다. 같은 깊이 결과로 도면의 실선·은선을 나눈다. */
const normal=(a,b,c)=>{
 const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
 return n.map(v=>v/(length||1));
};
export function raster(vertices,faces,width,height){
 const depth=new Float64Array(width*height).fill(Infinity),owner=new Int32Array(width*height).fill(-1),pixels=new Uint8ClampedArray(width*height*4),triangles=[];
 for(const face of faces){
  // shortcut: 현재 OBJ 삼각면·볼록 판 면을 사용한다. 오목한 n각 면을 들여올 때는 먼저 삼각분할한다.
  for(let j=1;j<face.ids.length-1;j++){
   const [a,b,c]=[face.ids[0],face.ids[j],face.ids[j+1]].map(i=>vertices[i]);
   const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
   const u=[(b[1]-c[1])/den,(c[0]-b[0])/den],v=[(c[1]-a[1])/den,(a[0]-c[0])/den];
   const plane=[u[0]*(a[2]-c[2])+v[0]*(b[2]-c[2]),u[1]*(a[2]-c[2])+v[1]*(b[2]-c[2])];
   plane.push(c[2]-plane[0]*c[0]-plane[1]*c[1]);
   const id=triangles.length;triangles.push({plane,c,u,v,face,uv:face.uv?[face.uv[0],face.uv[j],face.uv[j+1]]:null});
   const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
   const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const px=x+.5,py=y+.5,wa=u[0]*(px-c[0])+u[1]*(py-c[1]),wb=v[0]*(px-c[0])+v[1]*(py-c[1]);
    if(wa< -1e-9||wb< -1e-9||wa+wb>1+1e-9)continue;
    const z=plane[0]*px+plane[1]*py+plane[2],index=y*width+x;
    if(z>=depth[index])continue;
    const offset=index*4;
    if(face.texture&&face.uv){
     const uv=[0,1].map(k=>wa*face.uv[0][k]+wb*face.uv[j][k]+(1-wa-wb)*face.uv[j+1][k]),t=face.texture;
     const outside=face.projected&&uv.some((v,k)=>v<(face.uvClip?.[k]??0)||v>(face.uvClip?.[k+2]??1));
     const tx=Math.max(0,Math.min(t.width-1,Math.floor(uv[0]*t.width))),ty=Math.max(0,Math.min(t.height-1,Math.floor((1-uv[1])*t.height))),at=(ty*t.width+tx)*4,alpha=outside?0:t.data[at+3]/255;
     if(face.cutout&&alpha===0)continue;
     for(let k=0;k<3;k++)pixels[offset+k]=t.data[at+k]*alpha+(face.projected?face.color[k]:255)*(1-alpha);
    }else for(let k=0;k<3;k++)pixels[offset+k]=face.color[k];
    depth[index]=z;owner[index]=id;pixels[offset+3]=255;
   }
  }
 }
 return {depth,owner,pixels,triangles,width,height};
}
export function texturePoint(buffer,x,y){
 const px=Math.floor(x),py=Math.floor(y);
 if(px<0||py<0||px>=buffer.width||py>=buffer.height)return null;
 const t=buffer.triangles[buffer.owner[py*buffer.width+px]];
 if(!t?.face.projected||!t.uv||!t.face.texture||t.face.pickable===false)return null;
 const a=t.u[0]*(x-t.c[0])+t.u[1]*(y-t.c[1]),b=t.v[0]*(x-t.c[0])+t.v[1]*(y-t.c[1]);
 const uv=[0,1].map(k=>a*t.uv[0][k]+b*t.uv[1][k]+(1-a-b)*t.uv[2][k]);
 if(uv.some((v,k)=>v<(t.face.uvClip?.[k]??0)||v>(t.face.uvClip?.[k+2]??1)))return null;
 return t.face.pickBounds?uv.map((v,k)=>t.face.pickBounds[k]+v*t.face.pickBounds[k+2]):uv;
}
function frontDepth(buffer,x,y){
 let depth=Infinity;
 // 이웃 픽셀의 면을 실제 좌표로 평가해 얇은 관의 내면이 반올림 오차로 드러나지 않게 한다.
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const px=Math.floor(x)+dx,py=Math.floor(y)+dy;
  if(px<0||py<0||px>=buffer.width||py>=buffer.height)continue;
  const t=buffer.triangles[buffer.owner[py*buffer.width+px]];if(!t)continue;
  const a=t.u[0]*(x-t.c[0])+t.u[1]*(y-t.c[1]),b=t.v[0]*(x-t.c[0])+t.v[1]*(y-t.c[1]);
  if(a< -1e-6||b< -1e-6||a+b>1+1e-6)continue;
  depth=Math.min(depth,t.plane[0]*x+t.plane[1]*y+t.plane[2]);
 }
 return depth;
}
export function edgePaths(vertices,faces,buffer){
 const edges=new Map(),key=p=>p.map(n=>Math.round(n*1e6)).join(',');
 for(const face of faces){
  const n=normal(...face.ids.slice(0,3).map(i=>vertices[i]));
  for(let j=0;j<face.ids.length;j++){
   const a=vertices[face.ids[j]],b=vertices[face.ids[(j+1)%face.ids.length]],k=[key(a),key(b)].sort().join('|');
   if(!edges.has(k))edges.set(k,{a,b,normals:[],materials:[]});
   edges.get(k).normals.push(n);edges.get(k).materials.push(face.material);
  }
 }
 let visible='',hidden='';
 for(const {a,b,normals,materials} of edges.values()){
  const first=normals[0],sharp=normals.some(n=>Math.abs(n.reduce((s,v,i)=>s+v*first[i],0))<.96);
  const silhouette=normals.some(n=>n[2]>1e-7)&&normals.some(n=>n[2]<-1e-7);
  if(normals.length>1&&!sharp&&!silhouette&&materials.every(m=>m===materials[0]))continue;
  const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*1.5);if(!count)continue;
  const at=t=>a.map((v,i)=>v+(b[i]-v)*t),path=(p,q)=>`M${p[0].toFixed(2)},${p[1].toFixed(2)}L${q[0].toFixed(2)},${q[1].toFixed(2)}`;
  let start=a,wasHidden;
  for(let j=0;j<count;j++){
   const p=at((j+.5)/count),isHidden=p[2]>frontDepth(buffer,p[0],p[1])+1e-6;
   if(wasHidden!==undefined&&wasHidden!==isHidden){
    const end=at(j/count);if(wasHidden)hidden+=path(start,end);else visible+=path(start,end);start=end;
   }
   wasHidden=isHidden;
  }
  if(wasHidden)hidden+=path(start,b);else visible+=path(start,b);
 }
 return {visible,hidden};
}
export function rasterImage(buffer){
 // Node에서도 같은 픽셀 결과를 검사한다. PNG 인코딩만 브라우저 Canvas에 맡긴다.
 if(typeof document==='undefined')return '';
 const canvas=document.createElement('canvas');canvas.width=buffer.width;canvas.height=buffer.height;
 const context=canvas.getContext('2d'),data=context.createImageData(buffer.width,buffer.height);
 data.data.set(buffer.pixels);context.putImageData(data,0,0);return canvas.toDataURL();
}
