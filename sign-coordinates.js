/* 교통표지 신규·상세의 CAD 자르기 좌표. 모델 제원이나 지주 설치값과 무관한 조회 값이다. */
import {pixelRegions,coordinateMarkup} from './cad-coordinates.js';
import {e} from './views.js';
export const slot=()=>'<section class="gsp-coordinate-table sl-sign-coordinates" data-sign-coordinates hidden></section>';
const requests=new Map();
export async function load(root,block,api){
 const area=root.querySelector('[data-sign-coordinates]');if(!area)return;
 area.dataset.block=block||'';
 if(!block){area.hidden=true;area.innerHTML='';return;}
 area.hidden=false;
 area.innerHTML='<p class="sl-sub">좌표를 불러오는 중…</p>';
 try{
  if(!requests.has(block))requests.set(block,api('/api/guide-assets/cad-regions',{block}).catch(err=>{requests.delete(block);throw err;}));
  const regions=await requests.get(block);
  if(!area.isConnected||area.dataset.block!==block)return;
  area.innerHTML=coordinateMarkup(pixelRegions(regions.boxes,regions.frame))||'<p class="sl-sub">CAD에서 판 영역을 찾을 수 없습니다.</p>';
 }catch(err){if(area.isConnected&&area.dataset.block===block)area.innerHTML=`<p class="sl-sub">좌표 확인 불가 · ${e(err.message)}</p>`;}
}
