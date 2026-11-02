/* 같은 OBJ를 정면·평면으로 투영한다. 치수는 해당 뷰의 실제 축에 표시한다. */
import {e} from './views.js';
import {meshLayer} from './mesh-preview.js';
import {dimension,mm} from './dimension.js';
const edit=()=>'';

export function supportDrawing(model,label,view='front',foundation=false){
 const {steel,concrete}=model.measurements||{};
 let source=model;
 if(foundation&&concrete){
  const faces=model.faces.filter((_,i)=>model.materials[i]?.toLowerCase()==='concrete'),ids=[...new Set(faces.flat())],map=new Map(ids.map((id,i)=>[id,i]));
  source={vertices:ids.map(i=>model.vertices[i]),faces:faces.map(f=>f.map(i=>map.get(i))),materials:faces.map(()=>'Concrete')};
 }
 const top=view==='top';
 const main=meshLayer(source,0,top?-Math.PI/2:0,[130,75,420,320],source.vertices,true);if(!main)return '';
 const b=concrete?.bounds,s=steel?.bounds;let svg=main.html;
 const point=(a,z)=>main.point([a,0,z]);
 const horizontal=(left,right,z,y,key)=>dimension(point(left,z),point(right,z),y,mm(right-left),key?edit(key):'');
 const vertical=(a,low,high,x,key)=>dimension(point(a,low),point(a,high),x,mm(high-low),key?edit(key):'');
 if(top){
  if(b){
   const a=main.point([b[0][0],b[1][0],b[2][1]]),c=main.point([b[0][1],b[1][1],b[2][1]]);
   svg+=dimension(a,[c[0],a[1]],430,mm(b[0][1]-b[0][0]),edit('foundation_width'))+dimension([c[0],a[1]],c,610,mm(b[1][1]-b[1][0]),edit('foundation_depth'));
  }
  if(s&&!foundation&&s[0][1]-s[0][0]>(steel.diameter||.5)*3){
   const a=main.point([s[0][0],s[1][1],s[2][1]]),c=main.point([steel.centre?.[0]??s[0][1],s[1][1],s[2][1]]);
   svg+=dimension(a,c,45,mm((steel.centre?.[0]??s[0][1])-s[0][0]));
  }
 }else{
  if(s&&!foundation){
   const base=b?.[2][1]??s[2][0];
   svg+=vertical(s[0][1],base,s[2][1],625,'height');
   if(s[2][0]<base-.01)svg+=vertical(s[0][1],s[2][0],base,590,model.embed_clearance_mm==null?'embed_depth':null);
   if(s[0][1]-s[0][0]>(steel.diameter||.5)*3)svg+=horizontal(s[0][0],steel.centre?.[0]??s[0][1],s[2][1],40);
  }
  if(b){
   svg+=horizontal(b[0][0],b[0][1],b[2][0],435,'foundation_width');
   svg+=vertical(b[0][0],b[2][0],b[2][1],90,'foundation_height');
   if(foundation){
    const levels=concrete.levels||[],upper=levels.at(-1);
    if(upper)svg+=horizontal(upper.bounds[0][0],upper.bounds[0][1],upper.z,45);
    for(let i=1;i<levels.length;i++)svg+=vertical(b[0][1],levels[i-1].z,levels[i].z,610);
   }
  }
 }
 if(steel?.diameter&&!foundation){
  const [cx,cy]=steel.centre,p=main.point([cx,cy,top?s[2][1]:steel.section_z]);
  const editable=false;
  svg+=`<g class="sl-dimension ${editable?'sl-master-measure':''}" ${editable?edit('diameter'):''}><path class="sl-dimension-stroke" d="M${p}l-35 -25h-30"/><text x="${p[0]-40}" y="${p[1]-32}" text-anchor="end">Φ${mm(steel.diameter)}</text></g>`;
 }
 return `<svg class="sl-master-canvas sl-support-dimensions" viewBox="0 0 730 480" role="img" aria-label="${e(label)} ${top?'평면':'정면'}${foundation?' 기초 확대':''} 치수">${svg}</svg>`;
}
