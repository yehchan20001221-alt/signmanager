/* 삭제 확인은 패널 크기를 바꾸지 않는 공용 중앙 대화상자에서 처리한다. */
import {e} from './views.js';

export function confirmDelete(name,description,remove){
 const dialog=document.querySelector('#editor');
 dialog.classList.remove('workflow-dialog','quantity-dialog');
 dialog.oninput=null;dialog.onchange=null;dialog.onsubmit=null;
 dialog.innerHTML=`<form class="delete-confirm-form"><h2 id="dialog-title">정말 삭제할까요?</h2><p class="delete-target">${e(name)}</p><p class="delete-description">${e(description)}</p><p class="error" role="alert" hidden></p><footer><button type="button" data-delete-cancel>취소</button><button type="submit" class="delete-submit">삭제</button></footer></form>`;
 const form=dialog.querySelector('form'),cancel=form.querySelector('[data-delete-cancel]'),submit=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');
 let saving=false;
 dialog.onclick=ev=>{if(ev.target.closest('[data-delete-cancel]')&&!saving)dialog.close();};
 dialog.oncancel=ev=>{if(saving)ev.preventDefault();};
 form.onsubmit=async ev=>{
  ev.preventDefault();if(saving)return;
  saving=true;cancel.disabled=submit.disabled=true;submit.textContent='삭제 중…';error.hidden=true;
  try{await remove();dialog.close();}
  catch(err){error.textContent=err.message;error.hidden=false;}
  finally{saving=false;cancel.disabled=submit.disabled=false;submit.textContent='삭제';}
 };
 dialog.showModal();cancel.focus({preventScroll:true});
}
