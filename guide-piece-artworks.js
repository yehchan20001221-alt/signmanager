/* 개별 판에 실제 매핑된 CAD 영역만 비교한다. 같은 도안의 표지·조합 연결은 모두 보존한다. */
import {texture} from './guide-model-preview.js';
import {occurrences,partKey} from './guide-piece-preview.js';
import {artworkIssue} from './guide-mapping-warning.js';
let revision,cache=new Map();
export function sameArtwork(a,b){
 if(a.width!==b.width||a.height!==b.height||a.data.length!==b.data.length)return false;
 let sum=0,changed=0;
 for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);sum+=d;if(d>24)changed++;}
 // 같은 판도 전체 블록의 렌더 배율·선 두께가 다를 수 있다. 문자는 별도로 정확히 대조한다.
 return sum/a.data.length<6&&changed/a.data.length<.04;
}
export function groupArtworks(rows){
 const groups=[];
 for(const row of rows){
  const group=groups.find(g=>g.words===row.words&&sameArtwork(g.pixels,row.pixels));
  if(group)group.references.push(row);else groups.push({...row,references:[row]});
 }
 return groups;
}
export function normalizedPart(part,cad){
 if(!part.cadRegion||!cad?.texture_frame?.length)return part;
 const [x,y,w,h]=cad.texture_frame,r=part.cadRegion;
 return {...part,cadPanel:-1,cadCrop:[(r[0]-x)/w,(r[1]-y)/h,r[2]/w,r[3]/h]};
}
function crop(image,part){
 const source=document.createElement('canvas');source.width=image.width;source.height=image.height;source.getContext('2d').putImageData(image,0,0);
 const [x,y,w,h]=part.cadCrop||[0,0,1,1],width=Math.max(1,w*image.width),height=Math.max(1,h*image.height);
 const canvas=document.createElement('canvas'),scale=256/Math.max(width,height);canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(source,x*image.width,(1-y-h)*image.height,width,height,0,0,canvas.width,canvas.height);
 const words=(image.words||[]).filter(word=>word.x>=x&&word.x<=x+w&&word.y>=y&&word.y<=y+h).map(word=>word.text.trim()).sort();
 return {words:JSON.stringify(words),pixels:ctx.getImageData(0,0,canvas.width,canvas.height),image:canvas.toDataURL('image/png')};
}
export async function loadArtworks(choice,assets,s,api,isCurrent=()=>true){
 if(revision!==s.revision){revision=s.revision;cache=new Map();}
 const get=use=>{
  const key=use.id;
  if(!cache.has(key)){
   if(cache.size>=64)cache.delete(cache.keys().next().value);
   const registered=s.tables.guidesigns.some(g=>g['안내표지ID']===key);
   const pending=api(registered?'/api/guides/cad-preview':'/api/guide-registration/preview',registered?{id:key,values:{}}:{code:use.code,block:'CMRG'+use.code,values:{}}).then(async cad=>{
    const images=await Promise.all((cad.textures||[]).map(texture));
    images.forEach((image,i)=>image.words=cad.texture_words?.[i]||[]);
    if(cad.texture_sheet){images[-1]=await texture(cad.texture_sheet);images[-1].words=cad.texture_words?.at(-1)||[];}return {images,cad};
   }).catch(error=>{cache.delete(key);throw error;});cache.set(key,pending);
  }
  return cache.get(key);
 };
 const rows=[],missing=[];
 // CAD 렌더러에 한 번에 모든 표지 요청을 쌓지 않는다.
 for(const use of choice.uses){
  if(!isCurrent())return null;
  try{
   const {images,cad}=await get(use);
   for(const original of occurrences(choice,assets,use.id)){
    const part=normalizedPart(original,cad);
    const image=images[part.cadPanel??-1];
    if(!image||part.cadUnmapped){missing.push(use);continue;}
    rows.push({use,part:original,key:partKey(original),mappingIssue:artworkIssue(choice,part,cad),...crop(image,part)});
   }
  }catch{missing.push(use);}
 }
 return {groups:groupArtworks(rows),missing:[...new Map(missing.map(u=>[u.id,u])).values()]};
}
