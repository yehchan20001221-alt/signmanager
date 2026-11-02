/* 설치값 편집과 실제 OBJ 정면 배치. 미리보기의 Y는 조립 DB에 저장하지 않는다. */
import {e} from './views.js';
import {points} from './plate-shape.js';
import {meshLayer} from './mesh-preview.js';
import {dimension,mm} from './dimension.js';
import {payload} from './placement.js';
import {cards} from './installation-cards.js';

const key=r=>`${r.size}:${r.pattern.join(':')}`;
const short=name=>name.replace('보조_사각형 ','보조사각 ');
const select=(name,label,values,current)=>`<label class="sl-field"><span>${label}</span><select class="sl-input" name="${name}" data-assembly-choice>${values.map(([value,text])=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(text)}</option>`).join('')}</select></label>`;
export function selection(s){
 const rows=s.detail?.placement?.results||[],current=s.installationChoice||{};
 if(!rows.length)return {controls:'',row:null};
 const groups=[...new Map(rows.map(r=>[key(r),`${r.size} · 본표지 ${r.pattern[0]}장${r.pattern[1]?' + 보조표지 B':''}`]))];
 const group=groups.some(([k])=>k===current.group)?current.group:groups[0][0],candidates=rows.filter(r=>key(r)===group);
 const names=Array.from({length:candidates[0].pattern[0]},(_,i)=>{
  const options=[...new Set(candidates.map(r=>(r.sourcePanels||r.panels)[i].name))];
  return options.includes(current[i])?current[i]:options[0];
 });
 const row=candidates.find(r=>names.every((n,i)=>(r.sourcePanels||r.panels)[i].name===n));
 return {row,controls:`<div class="sl-assembly-choices">${select('assembly_group','크기·장수',groups,group)}${names.map((n,i)=>select('assembly_'+i,`${i+1}번째 표지판`,[...new Set(candidates.map(r=>(r.sourcePanels||r.panels)[i].name))].map(v=>[v,short(v)]),n)).join('')}</div>`};
}
export function request(s,form){
 const {row}=selection(s);if(!row||!form?.querySelector('.sl-placement-editor'))return null;
 return {rule:payload(form),choice:{size:row.size,pattern:row.pattern,names:(row.sourcePanels||row.panels).map(p=>p.name)}};
}
export function scene(model,result,options,full=false,direction='세로',compact=false){
 if(!model?.available)return `<p class="sl-master-stage-empty">${e(model?.message||'등록된 지주 OBJ가 없습니다.')}</p>`;
 if(!model.origin)return '<p class="sl-master-stage-empty">이 OBJ의 지주 끝 기준점을 확인해야 합니다.</p>';
 if(!result?.complete)return `<p class="sl-master-stage-empty">${e(result?.message||'설치값을 입력하세요.')}</p>`;
 const origin=model.origin,vertices=model.vertices.slice(),faces=model.faces.slice(),platePositions=[];
 for(const [index,p] of result.panels.entries()){
  const option=options.find(o=>o.name===p.name),contour=points(option);if(!option||!contour.length)return '<p class="sl-master-stage-empty">등록된 판 모양을 확인하세요.</p>';
  const x=origin[0]+p.x_m,z=origin[2]+p.z_m,ids=contour.map(([a,b])=>{vertices.push([x+(a-.5)*p.width/1000,-1,z+b*p.height/1000]);return vertices.length-1;});
  faces.push({ids,fill:'#edf3fc',stroke:'#255d99',part:index});platePositions.push([x,-1,z]);
 }
 const extent=full?vertices:[...vertices.slice(model.vertices.length),origin];
 const layer=meshLayer({...model,vertices,faces},0,0,compact?[28,52,170,110]:[80,65,500,320],extent,true);let svg=layer.html;
 const [ox,oy]=layer.point(origin),first=layer.point(platePositions[0]);
 svg+=`<circle class="sl-origin-point" cx="${ox}" cy="${oy}" r="3"/>`;
 const attributes=(axis,p,index)=>`data-placement-axis="${axis}" data-placement-name="${e(p.name)}" data-placement-size="${e(result.size)}" data-placement-index="${index}" tabindex="0" role="button" aria-label="${e(p.name)} ${axis.toUpperCase()} 수정"`;
 if(direction==='가로'||result.panels[0].x_mm)svg+=dimension([ox,oy],[first[0],oy],40,result.panels[0].x_mm,attributes('x',result.panels[0],0));
 svg+=dimension([ox,oy],[ox,first[1]],compact?235:40,Math.abs(result.panels[0].z_mm),attributes('z',result.panels[0],0));
 for(const [i,p] of result.panels.entries()){
  const at=layer.point(platePositions[i]);
  svg+=`<circle class="sl-reference-dot" cx="${at[0]}" cy="${at[1]}" r="3"/>`;
  if(i){
   if(direction==='가로'&&i<result.pattern[0])svg+=dimension([at[0],oy],at,520+35*i,Math.abs(p.z_mm),attributes('z',p,i));
   const previous=result.panels[i-1],before=layer.point(platePositions[i-1]),aux=i>=result.pattern[0];
   const horizontal=!aux&&p.x_mm!==previous.x_mm;
   const a=horizontal?[before[0]+previous.width/2000*layer.scale,before[1]]:before;
   const b=horizontal?[at[0]-p.width/2000*layer.scale,at[1]]:[at[0],at[1]-p.height/1000*layer.scale];
   const gap=horizontal?(p.x_mm-previous.x_mm-(p.width+previous.width)/2):(previous.z_mm-p.z_mm-p.height);
   svg+=dimension(a,horizontal?[b[0],a[1]]:[a[0],b[1]],horizontal?430:615,gap,`data-placement-field="placement_${aux?'aux':'main'}_gap" tabindex="0" role="button" aria-label="표지판 사이 이격거리 수정"`);
  }
 }
 return `<svg class="sl-master-canvas sl-placement-canvas${compact?' sl-compact-placement':''}" viewBox="${compact?'0 0 270 185':'0 0 680 470'}" data-scale="${layer.scale}" role="group" aria-label="실제 지주 OBJ와 판 모델의 표지판 설치위치">${svg}</svg>`;
}
export function draw(root,s){
 const area=root.querySelector('[data-support-drawing]'),controls=root.querySelector('[data-installation-controls]');if(!area)return;
 if(s.detail?.support?.형식==='부착식'){
  if(controls)controls.innerHTML='';
  area.innerHTML='<div class="sl-master-stage-empty">추가 예정</div>';return;
 }
 const selected=selection(s),mode=s.installationMode||'panels';
 if(controls)controls.innerHTML=mode==='panels'?`<div class="sl-installation-display" role="group" aria-label="표지판 설치 보기">${[['overview','한눈에 보기'],['assembly','자세히 보기']].map(([key,text])=>`<button type="button" data-installation-display="${key}" aria-pressed="${(s.installationDisplay||'overview')===key}">${text}</button>`).join('')}</div>${s.installationDisplay==='assembly'?`<div class="sl-installation-selection">${selected.controls}<button type="button" class="sl-button" data-assembly-zoom aria-pressed="${!!s.installationFull}">전체 모델</button></div>`:''}`:'';
 const result=s.installationResult||selected.row;
 const form=root.querySelector('.sl-post-form'),rule=form?payload(form):s.detail?.placement?.rule;
 const panel=(p,size,x,z)=>s.supportModel?.available&&x!=null&&z!=null?scene(s.supportModel,{complete:true,size,pattern:[1,0],panels:[{...p,x_mm:x,z_mm:z,x_m:x/1000,z_m:z/1000}]},s.registrationOptions||[],false,rule?.direction,true):'';
 area.innerHTML=mode==='panels'?(s.installationDisplay==='assembly'?scene(s.supportModel,result,s.registrationOptions||[],s.installationFull,rule?.direction):cards(s.detail?.placement?.catalog||s.detail?.placement?.results||[],s.registrationOptions||[],rule||{},panel)):`<div class="sl-site-comparison">${['fill','cut'].map((mode,i)=>`<section><h3>${i?'절토부':'성토부'}</h3>${siteScene(s.supportModel,rule?.site[mode],mode)}</section>`).join('')}</div>`;
}
// 회사 문서 삽도의 형상 관계. 측구·비탈면 자체의 설계 치수를 저장하는 값은 아니다.
export function siteProfile(mode,foundation=[]){
 // 설명용 사면이 기초를 뚫지 않도록 형상에 맞춘다. 설치값·기초 치수는 바꾸지 않는다.
 const fall=Math.max(0,Math.min(1.65/2.48,...foundation.filter(([x,z])=>x>.32&&z<=0).map(([x,z])=>-z/(x-.32))));
 const toe=Math.min(.68,...foundation.filter(([,z])=>z>=-.2).map(([x,z])=>x-(z+.2)/1.5));
 const end=Math.max(mode==='fill'?2.8:2.3,...foundation.map(([x])=>x+.3));
 return mode==='cut'?{
  ground:[[-1,.03],[0,0],[0,-.08],[-.06,-.08],[-.06,-.2],[toe,-.2],[end,-.2+(end-toe)*1.5]],
  curb:[[-.06,-.2],[-.06,-.08],[0,-.08],[0,.12],[.09,.30],[.14,.64],[.30,.64],[.36,0],[.36,-.2]],
  bench:[[.33,.25],[.98,.25]],label:[2.05,1.8]
 }:{
  ground:[[-1,.02],[0,0],[.32,0],[end,-(end-.32)*fall]],
  curb:[[-.05,-.18],[.12,-.18],[.12,.20],[.04,.20],[0,0],[-.05,0]],
  bench:[],label:[end-.5,-(end-.82)*fall]
 };
}
export function siteScene(model,site,mode){
 if(!model?.available||!model.measurements?.concrete)return `<p class="sl-master-stage-empty">${e(model?.message||'기초가 구분된 지주 OBJ가 필요합니다.')}</p>`;
 if(site?.x==null||site?.z==null)return '<p class="sl-master-stage-empty">X축·Z축 이격거리를 입력하세요.</p>';
 const bounds=model.measurements.concrete.bounds,centre=(bounds[0][0]+bounds[0][1])/2,dx=site.x/1000-centre,dz=site.z/1000-bounds[2][1];
 const vertices=model.vertices.map(([x,y,z])=>[x+dx,y,z+dz]);vertices.push([0,0,0]);
 const frame=[[-1,0,-2.5],[3.2,0,2],...[bounds[0][0],bounds[0][1]].flatMap(x=>[bounds[2][0],bounds[2][1]].map(z=>[x+dx,0,z+dz]))];
 const layer=meshLayer({...model,vertices},0,0,[80,50,480,340],frame,true),zero=layer.point([0,0,0]),point=layer.point([site.x/1000,0,site.z/1000]);
 const concrete=model.measurements.concrete;
 const foundation=(concrete.levels||[{z:bounds[2][0],bounds},{z:bounds[2][1],bounds}]).flatMap(level=>level.bounds[0].map(x=>[x+dx,level.z+dz]));
 const profile=siteProfile(mode,foundation),ground=profile.ground;
 const projected=ground.map(([x,z])=>layer.point([x,0,z]));
 const line=projected.map(p=>p.join(',')).join(' '),left=projected[0],right=projected.at(-1),road=layer.point([-.65,0,0]),slope=layer.point([profile.label[0],0,profile.label[1]]);
 const plot=points=>points.map(([x,z])=>layer.point([x,0,z]).join(',')).join(' ');
 const terrain=`<g class="sl-terrain" aria-label="${mode==='fill'?'성토부 내려가는 비탈면':'절토부 올라가는 비탈면'}"><polygon points="${line} ${right[0]},425 ${left[0]},425" class="sl-ground-fill"/><polyline points="${line}" class="sl-ground-line"/><polygon points="${plot(profile.curb)}" class="sl-curb"/>${profile.bench.length?`<polyline points="${plot(profile.bench)}" class="sl-ground-line"/>`:''}<text x="${road[0]}" y="${road[1]-12}">도로</text><text x="${slope[0]}" y="${slope[1]-14}">비탈면</text></g>`;
 const label=mode==='fill'?'성토부':'절토부';
 const zDimension=dimension([point[0],zero[1]],point,610,mm(site.z/1000),`data-placement-field="placement_${mode}_z" tabindex="0" role="button" aria-label="${label} Z축 이격거리 수정"`);
 return `<svg class="sl-master-canvas" viewBox="0 0 680 470" role="group" aria-label="${label} 비탈면과 실제 지주 기초 X축·Z축 이격거리">${terrain}${layer.html}<path class="sl-master-center" d="M${zero[0]} ${zero[1]}H${point[0]}V${point[1]}"/><g class="sl-origin-point"><title>도로 쪽 설치 기준점</title><path d="M${zero[0]-4} ${zero[1]-4}l8 8m-8 0l8 -8" stroke="currentColor" stroke-width="1.5"/></g><circle class="sl-reference-dot" cx="${point[0]}" cy="${point[1]}" r="3"><title>기초 상단 중심</title></circle>${dimension(zero,[point[0],zero[1]],40,mm(site.x/1000),`data-placement-field="placement_${mode}_x" tabindex="0" role="button" aria-label="${label} X축 이격거리 수정"`)}${zDimension}<text class="sl-site-note" x="20" y="458">측구·비탈면 형상은 예시</text></svg>`;
}
export function inputFor(root,target){
 root=target.closest?.('[data-panel-installation-form]')||root;
 const field=target.dataset.placementField;
 return field?root.querySelector(`[name="${field}"]`):[...root.querySelectorAll('.sl-distance-cell')].find(c=>c.dataset.size===target.dataset.placementSize&&c.dataset.name===target.dataset.placementName&&c.dataset.axis===target.dataset.placementAxis)?.querySelector('input');
}

