/* 표지별 지주 대안 선택. 차로 조건은 유지하고 새 지주의 좌표는 공통 데이터에서 읽는다. */
import {e} from './views.js';
export const laneConditions=road=>road==='고속도로'?['왕복6차로 이하','왕복8차로 이상','공통']:['왕복2차로 이하','왕복4차로 이상','공통'];
export const postText=p=>`${p.kind||p['지주종류']} · ${p.label||p['형식']}`;
export function conditionChoices(rules,posts){
 return rules.map(r=>({id:r['기준ID'],label:r['조건'],post:rules.filter(p=>p['조건']===r['조건']).length>1?postText(posts.find(p=>p['지주형식']===r['지주형식'])||{kind:r['지주형식'],label:''}):''}));
}
export function mount(root,s,conditions,signal){
 const button=root.querySelector('[data-guide-post-add]');if(!button)return;
 button.disabled=false;
 const sign=s.tables.guidesigns.find(r=>r['안내표지ID']===s.guideSelected);
 const posts=s.tables.guideposts.filter(p=>p['삭제여부']!=='삭제'&&(p['도로구분']||(p['지주형식'].startsWith('GR_')?'일반도로':'고속도로'))===sign['도로구분']);
 let editor;
 button.addEventListener('click',()=>{
  if(editor?.isConnected){editor.querySelector('select').focus();return;}
  editor=document.createElement('div');editor.className='gg-post-adder';
  editor.innerHTML=`<label>적용 조건<select data-post-source aria-label="추가 지주 적용 조건">${(conditions.length?conditionChoices(conditions,posts):laneConditions(sign['도로구분']).map(label=>({id:label,label}))).map(c=>`<option value="${e(c.id)}" ${c.id===s.guideModelRule?'selected':''}>${e(c.label+(c.post?' · '+c.post:''))}</option>`).join('')}</select></label><label>지주 형식<select data-post-choice aria-label="추가할 지주 형식"><option value="">선택</option>${posts.map(p=>`<option value="${e(p['지주형식'])}">${e(postText(p))}</option>`).join('')}</select></label><div class="gg-post-add-actions"><button type="button" data-post-cancel>취소</button><button type="button" class="sl-primary" data-post-save>추가</button></div><p role="status"></p>`;
  root.querySelector('[data-registration-placement]').append(editor);
  editor.querySelector('[data-post-cancel]').onclick=()=>editor.remove();
  editor.querySelector('[data-post-save]').onclick=async()=>{
   const message=editor.querySelector('[role=status]'),post=editor.querySelector('[data-post-choice]').value;
   if(!post){message.textContent='추가할 지주 형식을 선택하세요.';return;}
   if(root.querySelector('[data-sign-panels][data-changed=true],[data-layout-changed=true],.sl-guide-editor')){message.textContent='수정 중인 내용을 먼저 적용하거나 취소하세요.';return;}
   const payload={id:sign['안내표지ID'],rule:conditions.length?editor.querySelector('[data-post-source]').value:'',...(!conditions.length?{condition:editor.querySelector('[data-post-source]').value}:{}),post};
   const controls=editor.querySelectorAll('select,button');controls.forEach(b=>b.disabled=true);
   try{await new Promise((resolve,reject)=>root.dispatchEvent(new window.CustomEvent('guide-post-add',{bubbles:true,detail:{payload,resolve,reject}})));}
   catch(err){message.textContent=err.message;controls.forEach(b=>b.disabled=false);}
  };
  editor.querySelector('[data-post-choice]').focus();
 },{signal});
}
