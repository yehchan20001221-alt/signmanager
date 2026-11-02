/* 표지별 이력 확인·복원. 복원 직전 영향 표지를 확인하고 기존 revision 저장을 사용한다. */
import {e} from './views.js';
const names={repair_guide_source_post_links:'원본 대조 지주 연결 보완',restore_sign_change:'이전 값 복원',add_guide_post:'지주 추가',remove_guide_post_link:'지주 연결 삭제',save_guide_sign_edits:'판·설치위치 수정',save_guide_configuration:'판 구성 수정',update_guide:'안내표지 수정',save_catalog_sign:'교통표지 수정',save_quantities:'단위수량 수정',create_guide:'안내표지 등록'};
const content=v=>e(v==null?'—':String(v)||'빈 값');
export async function openHistory(s,api,commit,identity){
 const dialog=document.createElement('dialog');dialog.className='gsi-dialog sh-dialog';
 dialog.innerHTML='<header><h2>수정 이력</h2><button type="button" data-history-close aria-label="수정 이력 닫기">×</button></header><div data-history-body>불러오는 중…</div><p role="status"></p>';
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-history-close]').onclick=()=>dialog.close();dialog.showModal();
 const body=dialog.querySelector('[data-history-body]'),message=dialog.querySelector('[role=status]');
 try{
  const result=await api('/api/sign-history/'+encodeURIComponent(identity));if(!dialog.isConnected)return;
  dialog.querySelector('h2').textContent=result.code+' · 수정 이력';
  body.innerHTML=(result.events.length?'<p class="sh-scope">'+e(result.events[0].scopeNote||'')+'</p>':'')+result.events.map((row,index)=>`<article class="sh-entry"><header><div><strong>${e(names[row.action]||'표지 데이터 수정')}</strong><span>${e(new Date(row.time).toLocaleString('ko-KR'))} · ${e(row.actor)}</span></div>${row.restorable?`<div class="sh-restore-actions"><button type="button" data-history-restore="${e(row.id)}">이 시점으로 복원</button><button type="button" data-history-restore="${e(row.id)}" data-history-before>변경 전</button></div>`:`<span>이전 값 기록 없음</span>`}</header><details ${index===0?'open':''}><summary>${row.changes.length?row.changes.length+'개 변경 항목':'연결 정보 정리'}</summary><table><thead><tr><th>항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>${row.changes.map(c=>`<tr><th><span>${e(c.table)} · ${e(c.operation)}</span>${e(c.item)}${c.field?`<b>${e(c.field)}</b>`:''}</th><td>${content(c.before)}</td><td>${content(c.after)}</td></tr>`).join('')}</tbody></table></details></article>`).join('')+(result.events.length?'':'<p>저장된 수정 이력이 없습니다.</p>');
  body.onclick=async ev=>{
   const button=ev.target.closest('[data-history-restore]');if(!button)return;
   const payload={id:identity,change:button.dataset.historyRestore,mode:'point',boundary:button.hasAttribute('data-history-before')?'before':'after'};button.disabled=true;message.textContent='복원할 값과 연결을 확인하는 중…';
   try{
    const preview=await api('/api/sign-history-preview',payload);if(!dialog.isConnected)return;
    message.textContent='';
    const confirmation=document.createElement('dialog');confirmation.className='gsi-dialog sh-confirm';
    confirmation.innerHTML=`<header><h2>선택한 시점으로 복원할까요?</h2></header><p>${e(new Date(preview.time).toLocaleString('ko-KR'))} 변경 ${payload.boundary==='before'?'직전':'직후'}으로 돌아갑니다. 이후 관련 변경 ${preview.count}건을 함께 되돌립니다. 복원한 내용도 수정 이력에 남습니다.</p><p>${preview.affected.length>1?'함께 영향을 받는 표지':'대상 표지'}: ${e(preview.affected.map(r=>r.code+' '+r.name).join(', '))}</p><p class="sl-error" role="status"></p><footer><button type="button" data-cancel>취소</button><button type="button" class="sl-primary" data-confirm>복원</button></footer>`;
    document.body.append(confirmation);confirmation.addEventListener('close',()=>{confirmation.remove();button.disabled=false;});confirmation.querySelector('[data-cancel]').onclick=()=>confirmation.close();confirmation.showModal();
    confirmation.querySelector('[data-confirm]').onclick=async()=>{
     confirmation.querySelectorAll('button').forEach(b=>b.disabled=true);
     try{await commit('restore_sign_change',payload);confirmation.close();dialog.close();}
     catch(err){confirmation.querySelector('[role=status]').textContent=err.message;confirmation.querySelectorAll('button').forEach(b=>b.disabled=false);}
    };
   }catch(err){message.textContent=err.message;button.disabled=false;}
  };
 }catch(err){body.textContent='';message.textContent=err.message;}
}
