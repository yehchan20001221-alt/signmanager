/* 판 도형 입력과 미리보기 외곽. 기존 판은 서버가 원본 OBJ·CAD에서 추출한 외곽을 받는다. */
import {e} from './views.js';
export function geometry(option){return option?.geometry||{kind:option?.shape==='원형'?'circle':'polygon',sides:{삼각:3,역삼각:3,팔각:8,오각:5}[option?.shape]||4,inverted:option?.shape==='역삼각'};}
export function fromForm(form,option){
 if(form.elements.name.value!=='__new__')return geometry(option);
 const value={kind:form.querySelector('[name=geometry_kind]:checked')?.value||'polygon',sides:Number(form.elements.geometry_sides.value),inverted:form.elements.geometry_inverted.checked};
 const copied=form.dataset?.copyGeometry?JSON.parse(form.dataset.copyGeometry):null;
 return copied&&copied.kind===value.kind&&(value.kind==='circle'||copied.sides===value.sides&&copied.inverted===value.inverted)?copied:value;
}
export function controls(){return `<fieldset class="sl-geometry"><legend>모양 종류</legend><span class="sl-geometry-label" aria-hidden="true">모양 종류</span><output class="sl-geometry-result" hidden></output><div class="sl-geometry-options"><div class="sl-checks"><label><input type="radio" name="geometry_kind" value="polygon" checked>다각형</label><label><input type="radio" name="geometry_kind" value="circle">원형</label></div><div class="sl-geometry-polygon"><label class="sl-field"><span>꼭짓점</span><input class="sl-input" name="geometry_sides" type="number" min="3" max="32" step="1" value="3" required></label><label class="sl-geometry-inverted"><input type="checkbox" name="geometry_inverted">역삼각형</label></div></div></fieldset>`;}
export function applyDetected(form,value,names=[]){
 if(form.elements.name.value!=='__new__')return false;
 form.dataset.detectedGeometry=value?JSON.stringify(value):'';
 form.querySelector(`[name=geometry_kind][value="${value?.kind||'polygon'}"]`).checked=true;
 form.elements.geometry_sides.value=value?.kind==='circle'?3:value?.sides??'';
 form.elements.geometry_inverted.checked=!!value?.inverted;
 const name=form.elements.new_name;
 if(!name.value.trim()||name.value===form.dataset.detectedName){
  const base=value?.kind==='circle'?'원형':value?.kind==='polygon'&&value.sides>=3?(value.sides===3&&value.inverted?'역삼각형':({3:'삼각형',4:'사각형',5:'오각형',6:'육각형',7:'칠각형',8:'팔각형',9:'구각형',10:'십각형',11:'십일각형',12:'십이각형'}[value.sides]||`${value.sides}각형`)):'';
  let suggested=base;
  for(let index=2;suggested&&names.includes(suggested);index++)suggested=`${base} ${index}`;
  name.value=suggested;form.dataset.detectedName=suggested;
 }
 update(form);return true;
}
export function update(form,option){
 const fresh=form.elements.name.value==='__new__';
 if(!fresh&&option){
  const value=geometry(option);
  form.querySelector(`[name=geometry_kind][value="${value.kind}"]`).checked=true;
  form.elements.geometry_sides.value=value.sides||3;
  form.elements.geometry_inverted.checked=!!value.inverted;
 }
 const circle=form.querySelector('[name=geometry_kind]:checked')?.value==='circle';
 const area=form.querySelector('.sl-geometry');area.hidden=fresh&&!Object.hasOwn(form.dataset,'detectedGeometry')&&!form.dataset.copyGeometry;
 const derived=!fresh||!!form.dataset.detectedGeometry;
 for(const input of area.querySelectorAll('input'))input.disabled=derived;
 form.querySelector('.sl-geometry-options').hidden=derived;
 const result=form.querySelector('.sl-geometry-result');result.hidden=!derived;
 result.textContent=circle?'원형':`다각형 · 꼭짓점 ${form.elements.geometry_sides.value}개${form.elements.geometry_inverted.checked?' · 역삼각형':''}`;
 form.querySelector('.sl-geometry-polygon').hidden=circle;
 form.elements.geometry_sides.disabled=derived||circle;
 const inverse=!circle&&Number(form.elements.geometry_sides.value)===3;
 form.querySelector('.sl-geometry-inverted').hidden=!inverse;form.elements.geometry_inverted.disabled=derived||!inverse;
 if(!inverse)form.elements.geometry_inverted.checked=false;
}
export function points(option){
 if(option?.outline)return option.outline;
 const g=geometry(option),n=g.kind==='circle'?96:Number(g.sides);
 if(!Number.isInteger(n)||n<3||n>96)return [];
 if(n===4)return [[0,0],[1,0],[1,1],[0,1]];
 const phase=g.kind==='circle'?0:n%2?Math.PI/2:Math.PI/2-Math.PI/n;
 const raw=Array.from({length:n},(_,i)=>[Math.cos(phase+i*2*Math.PI/n),Math.sin(phase+i*2*Math.PI/n)]);
 const low=[0,1].map(k=>Math.min(...raw.map(p=>p[k]))),high=[0,1].map(k=>Math.max(...raw.map(p=>p[k])));
 const normalized=raw.map(p=>p.map((v,k)=>(v-low[k])/(high[k]-low[k])));
 return g.inverted?normalized.reverse().map(([x,y])=>[x,1-y]):normalized;
}
export function outline(option,x,y,w,h){return `<polygon points="${points(option).map(([a,b])=>`${x+a*w},${y+(1-b)*h}`).join(' ')}"/>`;}
export function description(option){const g=geometry(option);return e(g.kind==='circle'?'원형':g.inverted?'역삼각형':`다각형 · n=${g.sides}`);}
