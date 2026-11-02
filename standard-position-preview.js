/* 같은 지주·판 OBJ와 설치 XYZ를 정면·평면으로 투영한다. 저장값은 바꾸지 않는다. */
import {e} from './views.js';
import {points} from './plate-shape.js';
import {dimension} from './dimension.js';
import {meshLayer} from './mesh-preview.js';

export function assembly(option,width,height,thickness,position,plate,support){
 if(!position||!['단주식','내민식'].includes(position.kind)||!support?.available||!support.origin?.every(Number.isFinite)||!support.vertices?.length||!support.faces?.length)return null;
 if([position.x,position.y,position.z].some(v=>v==null||v===''))return null;
 const [w,h,t,x,z]=[width,height,thickness,position.x,position.z].map(v=>Number(v)/1000);
 const y=Number(position.y)/1000;
 if(![w,h,t,x,y,z].every(Number.isFinite)||w<=0||h<=0||t<=0)return null;
 if(!plate){
  const contour=points(option),n=contour.length;if(!n)return null;
  plate={vertices:[0,t].flatMap(depth=>contour.map(([a,b])=>[(a-.5)*w,depth,b*h])),faces:[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>n+i),...contour.map((_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])]};
 }
 if(!plate.vertices?.length||!plate.faces?.length)return null;
 const offset=[support.origin[0]+x,support.origin[1]+y,support.origin[2]+z];
 const vertices=plate.vertices.map(p=>p.map((v,k)=>v+offset[k])),start=support.vertices.length;
 const faces=plate.faces.map(face=>Array.isArray(face)?face.map(i=>i+start):{...face,ids:face.ids.map(i=>i+start)});
 return {...support,vertices:[...support.vertices,...vertices],faces:[...support.faces,...faces],materials:[...(support.materials||[]),...(plate.materials||[])],viewExtent:[support.origin,...vertices]};
}

export function topLayout(option,width,height,thickness,position,plate,support){
 // 접합부를 위에서 보므로 기초는 제외하고 실제 철재와 판을 같은 배율로 투영한다.
 const source=support&&{...support,faces:support.faces?.filter((_,i)=>support.materials?.[i]?.toLowerCase()!=='concrete'),materials:support.materials?.filter(m=>m.toLowerCase()!=='concrete')};
 const model=assembly(option,width,height,thickness,position,plate,source);if(!model)return null;
 const origin=support.origin,target=origin.map((v,i)=>v+Number(position[['x','y','z'][i]])/1000);
 const vertices=model.vertices.slice(support.vertices.length),extent=[origin,...vertices];
 const lo=[0,1].map(k=>Math.min(...extent.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...extent.map(p=>p[k])));
 const middle=(lo[1]+hi[1])/2,depth=Math.max(hi[1]-lo[1],(hi[0]-lo[0])*.6,.2);
 return {model,origin,target,vertices,frame:[[lo[0],middle-depth/2,origin[2]],[hi[0],middle+depth/2,origin[2]]]};
}

export function topDrawing(option,width,height,thickness,position,plate,support){
 if(!position||position.kind==='부착식')return '<div class="sl-master-stage-empty">지주를 선택하면 평면도가 표시됩니다.</div>';
 const missing=['x','y','z'].filter(axis=>position[axis]==null||position[axis]==='');
 if(missing.length)return `<div class="sl-master-stage-empty">${missing.map(a=>a.toUpperCase()).join('·')}를 입력하세요.</div>`;
 const plan=topLayout(option,width,height,thickness,position,plate,support);
 if(!plan)return `<div class="sl-master-stage-empty">${e(support?.message||'지주 OBJ를 불러오는 중입니다.')}</div>`;
 const layer=meshLayer(plan.model,0,-Math.PI/2,[65,65,440,270],plan.frame,true,null,[0,0,620,430]);
 const a=layer.point(plan.origin),b=layer.point(plan.target),x=Number(position.x),y=Number(position.y);
 const edit=axis=>`data-standard-measure="${axis}" tabindex="0" role="button" aria-label="${axis.toUpperCase()} 설치거리 수정"`;
 const zero=(axis,px,py)=>`<g class="sl-dimension sl-master-measure" ${edit(axis)}><text x="${px}" y="${py}" text-anchor="middle">${axis.toUpperCase()} 0 mm</text></g>`;
 const marker=(point,label,kind,dy)=>`<g class="sl-position-point ${kind}" data-position-marker="${label}"><circle cx="${point[0]}" cy="${point[1]}" r="5"/><text x="${point[0]+10}" y="${point[1]+dy}">${label}</text></g>`;
 const left=layer.point([Math.min(...plan.vertices.map(p=>p[0])),plan.target[1],plan.target[2]]),right=layer.point([Math.max(...plan.vertices.map(p=>p[0])),plan.target[1],plan.target[2]]);
 return `<svg class="sl-master-canvas sl-position-diagram sl-position-top" viewBox="0 0 620 430" role="group" aria-label="평면: 지주 기준 A에서 표지판 기준 B까지 X ${x} mm, Y ${y} mm">
 <text class="sl-plan-size" x="20" y="28">폭 ${e(width)} mm · 높이 ${e(height)} mm</text>
 ${layer.html}<path class="sl-plan-plate" d="M${left}L${right}"/>
 <path class="sl-position-projection" d="M${a}H${b[0]}V${b[1]}"/>
 ${position.kind==='단주식'?'':x?dimension(a,[b[0],a[1]],365,`X ${signed(x)} mm`,edit('x')):zero('x',b[0],365)}
 ${y?dimension([b[0],a[1]],b,540,`Y ${signed(y)} mm`,edit('y')):zero('y',540,b[1]-15)}
 ${x||y?marker(a,'A','sl-position-origin',y>0?22:-12)+marker(b,'B','sl-position-target',y>0?-12:22):marker(a,'A=B','sl-position-target',-12)}
 </svg>`;
}

export function layout(option,width,height,position,model){
 if(!position||!['단주식','내민식'].includes(position.kind)||[position.x,position.z].some(v=>v==null||v===''))return null;
 if(!model?.available||!model.origin?.every(Number.isFinite)||!model.vertices?.length||!model.faces?.length)return null;
 const [w,h,x,z]=[width,height,position.x,position.z].map(Number),contour=points(option);
 if(![w,h,x,z].every(Number.isFinite)||w<=0||h<=0||!contour.length)return null;
 const plate=contour.map(([a,b])=>[x+(a-.5)*w,z+b*h]);
 const vertices=model.vertices.map(p=>p.map((v,k)=>(v-model.origin[k])*1000));
 // 긴 가로재 전체가 아닌 판과 A/B 기준점에 맞춰 확대하고, 실제 지주 형상은 화면 밖만 자른다.
 const all=[[0,0],[x,z],...plate],lo=[0,1].map(k=>Math.min(...all.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...all.map(p=>p[k])));
 const scale=Math.min(450/(hi[0]-lo[0]),290/(hi[1]-lo[1]));
 const cx=(lo[0]+hi[0])/2,cz=(lo[1]+hi[1])/2,project=([a,b])=>[305+(a-cx)*scale,205-(b-cz)*scale];
 return {origin:project([0,0]),target:project([x,z]),plate:plate.map(project),scale,x,z,
  support:{...model,vertices},extent:[[lo[0],0,lo[1]],[hi[0],0,hi[1]]],bottom:project([0,lo[1]])[1]};
}
const signed=value=>value>0?'+'+value:value<0?'−'+Math.abs(value):'0';
export function drawing(option,width,height,position,model,support,editable=!model){
 const plan=layout(option,width,height,position,support);
 if(!plan)return '';
 const {origin:a,target:b,plate,x,z}=plan,reference=position.kind==='내민식'?'가로재 끝 중심':'지주 꼭대기 중심';
 const left=Math.min(...plate.map(p=>p[0])),right=Math.max(...plate.map(p=>p[0])),top=Math.min(...plate.map(p=>p[1])),bottom=Math.max(...plate.map(p=>p[1]));
 const dimX=Math.max(right,a[0],b[0])+32;
 const dimY=plan.bottom+48;
 const edit=axis=>axis==='x'&&position.kind==='단주식'?'':`data-standard-measure="${axis}" tabindex="0" role="button" aria-label="${axis.toUpperCase()} 설치거리 수정"`;
 const zero=(axis,at)=>`<g class="sl-dimension ${edit(axis)?'sl-master-measure':''}" ${edit(axis)}><text x="${at[0]}" y="${at[1]}" text-anchor="middle">${axis.toUpperCase()} 0 mm</text></g>`;
 const marker=(point,label,kind,description,dy)=>`<g class="sl-position-point ${kind}" data-position-marker="${label}"><title>${description}</title><circle cx="${point[0]}" cy="${point[1]}" r="5"/><text x="${point[0]+10}" y="${point[1]+dy}">${label}</text></g>`;
 const postImage=meshLayer(plan.support,0,0,[80,60,450,290],plan.extent,false,null,[60,45,dimX-76,plan.bottom-10]);
 const plateImage=model&&meshLayer(model,0,0,[left,top,right-left,bottom-top],undefined,true,null,[0,0,620,430]);
 return `<svg class="sl-master-canvas sl-position-diagram" viewBox="0 0 620 430" role="group" aria-label="폭 ${e(width)} mm, 높이 ${e(height)} mm. ${e(reference)} A에서 표지판 중앙 하단 B까지 X ${x} mm, Z ${z} mm">
 <title>실제 지주 OBJ 접합부와 표지판 설치위치</title>
 <defs><clipPath id="sl-position-support-clip"><rect x="60" y="45" width="${dimX-76}" height="${plan.bottom-10}"/></clipPath></defs>
 <g class="sl-position-post" data-position-support clip-path="url(#sl-position-support-clip)">${postImage.html}</g>
 ${plateImage?plateImage.html:`<polygon class="sl-position-plate" points="${plate.map(p=>p.join(',')).join(' ')}"/>`}
 <path class="sl-position-projection" d="M${a}H${b[0]}V${b[1]}"/>
 ${dimension([left,top],[right,top],top-32,`폭 ${width} mm`,!editable?'':'data-master-axis="width" tabindex="0" role="button" aria-label="표지판 폭 수정"')}
 ${dimension([left,top],[left,bottom],left-32,`높이 ${height} mm`,!editable?'':'data-master-axis="height" tabindex="0" role="button" aria-label="표지판 높이 수정"')}
 ${position.kind==='단주식'?'':x?dimension(a,b,dimY,`X ${signed(x)} mm`,edit('x')):zero('x',[b[0],dimY])}
 ${z?dimension([b[0],a[1]],b,dimX,`Z ${signed(z)} mm`,edit('z')):zero('z',[dimX,b[1]-15])}
 ${x||z?marker(a,'A','sl-position-origin',reference,z>0?22:-12)+marker(b,'B','sl-position-target','표지판 중앙 하단',z>0?-12:22):marker(a,'A=B','sl-position-target',`${reference} = 중앙 하단`,-12)}
 </svg>`;
}
