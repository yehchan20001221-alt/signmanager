/* 저장된 설치값을 출처와 함께 제안하며 불러온 값은 적용 전까지 편집 초안이다. */
import {e} from './views.js';
import {toMillimetres} from './guide-positions.js';
export async function choosePosition(api,payload){
 const dialog=document.createElement('dialog');dialog.className='gsi-dialog gsi-recommend';
 dialog.innerHTML='<header><h2>설치위치 추천</h2><button type="button" data-close aria-label="닫기">×</button></header><p>같은 지주를 사용한 기존 설치값입니다. 불러온 뒤 뷰에서 확인하고 적용하세요.</p><div data-results>불러오는 중…</div>';
 document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();
 let selected=null;
 const done=new Promise(resolve=>dialog.addEventListener('close',()=>{dialog.remove();resolve(selected);},{once:true}));
 try{
  const result=await api('/api/guide-position-recommendations',payload);if(!dialog.isConnected)return null;
  dialog.querySelector('[data-results]').innerHTML=result.candidates.length?result.candidates.map((p,i)=>`<article><img src="/api/guides/${encodeURIComponent(p.id)}/image" alt="${e(p.code)}"><div><strong>${e(p.code)} ${e(p.name)}</strong><span>${e(p.match)} · ${e(p.size)} mm</span><span>${e(p.condition)}</span><span>${['X','Z'].map(k=>k+' '+e(toMillimetres(p[k]))).join(' / ')} mm</span></div><button type="button" data-use="${i}">불러오기</button></article>`).join(''):`<p>${e(result.message)}</p>`;
  dialog.addEventListener('click',ev=>{const button=ev.target.closest('[data-use]');if(button){selected=result.candidates[Number(button.dataset.use)];dialog.close();}});
 }catch(error){if(dialog.isConnected)dialog.querySelector('[data-results]').textContent=error.message;}
 return done;
}
