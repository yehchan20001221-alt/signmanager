/* 공통 조건 수정과 표지별 분리를 기존 저장·충돌 검사 경로로 처리한다. */
import {e, size, button} from './views.js';
import {ruleLabel, wayGroups} from './waydb-view.js';

const field=(label,name,value='',type='text',required=false)=>`<label>${e(label)}<input name="${name}" type="${type}" ${type==='number'?'step="any" min="0"':''} value="${e(value)}" ${required?'required':''}></label>`;
const select=(label,name,options,value='')=>`<label>${e(label)}<select name="${name}">${options.map(([id,text])=>`<option value="${e(id)}" ${id===value?'selected':''}>${e(text)}</option>`).join('')}</select></label>`;
const shapes=['삼각','역삼각','원형','사각','오각','팔각','보조','기타'];
const kinds=['단주식','내민식','부착식','복주식','문형식','양내민식'];
export async function editWay(s,action,id,api,save){
  const t=s.tables,dialog=document.querySelector('#editor');
  const rule=(s.detail.wayRules||[]).find(r=>r['조건ID']===id);
  let title='',body='',build,affected=[s.detail.sign];
  if(action==='way-link'){
    title='기존 조건 선택';
    const linked=new Set((s.detail.wayRules||[]).map(r=>r['조건ID']));
    body=`<div class="wide">${select('다른 표지판과 같은 조건','group',[['','직접 선택'],...wayGroups(t).map(g=>[g.ids.join(','),g.signs[0]['표지번호']+' '+g.signs[0]['명칭']+' · '+g.ids.length+'개 조건'])])}</div><div class="wide way-rule-choices">${(t.wayrules||[]).filter(r=>!linked.has(r['조건ID'])).map(r=>`<label><input type="checkbox" name="rule_ids" value="${e(r['조건ID'])}"><span>${e(ruleLabel(t,r))}</span></label>`).join('')||'<p>추가로 연결할 조건이 없습니다.</p>'}</div>`;
    build=(_v,form)=>['link_way_rules',{sign_id:s.selected,rule_ids:[...form.querySelectorAll('[name=rule_ids]:checked')].map(x=>x.value)}];
  }else if(action==='way-unlink'){
    title='이 표지의 조건 연결 해제';
    body=`<p class="wide">${e(ruleLabel(t,rule))}</p><p class="wide hint">${e(s.detail.sign['표지번호'])}에서 이 조건을 해제합니다. 같은 조건을 사용하는 다른 표지는 유지됩니다.</p>`;
    build=()=>['unlink_way_rule',{sign_id:s.selected,id}];
  }else if(action==='way-post'){
    title='공통 지주 제원 수정';
    const post=t.wayposts.find(p=>p['지주제원ID']===id);
    affected=await api('/api/impact?'+new URLSearchParams({kind:'Way지주제원',identity:id}));
    body=select('지주 종류','post_kind',kinds.map(k=>[k,k]),post['지주종류'])+`<label class="wide">지주 제원<textarea name="post_size" rows="3" required>${e(post['지주제원'])}</textarea></label>`;
    build=v=>['save_way_post',{sign_id:s.selected,id,fields:{지주종류:v.post_kind,지주제원:v.post_size}}];
  }else{
    title=rule?'Way DB 조건 수정':'Way DB 조건 추가';
    if(rule&&!s.wayDraftMode)affected=await api('/api/impact?'+new URLSearchParams({kind:'Way조건',identity:id}));
    const selected=s.detail.panelSelections?.map(r=>r.panel),panels=selected?.length?selected:t.panels;
    const panelChoices=new Map();
    for(const p of panels){
      const key=[p['형태'],p['폭_mm'],p['높이_mm']].join('|');
      if(!panelChoices.has(key)||p['판ID']===rule?.['판ID'])panelChoices.set(key,p);
    }
    const newPost=s.wayDraftMode&&rule?.post&&!rule['지주제원ID'];
    body=(rule&&!s.wayDraftMode?`<div class="wide">${select('수정 범위','scope',[['single','이 표지판만 변경'],['shared','같은 조건을 쓰는 표지판 함께 변경']])}</div>`:'')+
      field('차로수(편도) 조건','lanes',rule?.['차로수조건']||'')+field('풍속(m/s) · 미기재 가능','wind',rule?.['풍속_m_s']??'','number')+
      `<div class="wide">${select('표지판 크기','panel_id',[['','선택'],...[...panelChoices.values()].map(p=>[p['판ID'],p['형태']+' '+size(p)]),...(!s.wayDraftMode&&!selected?.length?[['new','새 제원 입력']]:[])],rule?.['판ID']||'')}</div>`+
      `<div class="wide form-grid" id="way-new-panel" hidden>${select('모양','shape',shapes.map(k=>[k,k]))}${field('B (mm)','width','','number')}${field('H (mm)','height','','number')}</div>`+
      `<div class="wide">${select('지주 제원','post_id',[['','미기재'],...(t.wayposts||[]).map(p=>[p['지주제원ID'],p['지주종류']+' · '+p['지주제원']]),['new','새 지주 제원 입력']],newPost?'new':rule?.['지주제원ID']||'')}</div>`+
      `<div class="wide form-grid" id="way-new-post" ${newPost?'':'hidden'}>${select('지주 종류','post_kind',kinds.map(k=>[k,k]),newPost?rule.post['지주종류']:'')}<label class="wide">지주 제원<textarea name="post_size" rows="3" ${newPost?'required':''}>${newPost?e(rule.post['지주제원']):''}</textarea></label></div>`+
      (rule?.post&&!s.wayDraftMode?`<div class="wide">${button('현재 지주 제원 자체 수정','way-post',rule['지주제원ID'],'quiet')}</div>`:'');
    build=v=>['save_way_rule',{sign_id:s.selected,id:rule?.['조건ID']||'',scope:v.scope||'single',fields:{차로수조건:v.lanes,풍속_m_s:v.wind,판ID:v.panel_id},...(v.panel_id==='new'?{panel:{형태:v.shape,폭_mm:v.width,높이_mm:v.height}}:{}),...(v.post_id==='new'?{post:{지주종류:v.post_kind,지주제원:v.post_size}}:{post_id:v.post_id})}];
  }
  const submitLabel=action==='way-unlink'?'연결 해제':s.wayDraftMode?'적용':'저장';
  dialog.innerHTML=`<form id="way-form"><header><h2>${title}</h2>${button('닫기','close-dialog')}</header><div class="form-grid">${body}</div><section class="impact-box" id="way-impact"></section><p class="error" id="way-error" hidden></p><footer>${button('취소','close-dialog')}<button class="primary" type="submit">${submitLabel}</button></footer></form>`;
  dialog.classList.remove('workflow-dialog');dialog.onclick=null;dialog.oninput=null;dialog.onchange=null;dialog.onsubmit=null;
  const form=dialog.querySelector('form'),submit=form.querySelector('[type=submit]'),error=form.querySelector('#way-error');
  const impact=()=>{const shared=action==='way-post'||form.querySelector('[name=scope]')?.value==='shared';form.querySelector('#way-impact').innerHTML=shared?`<strong>${affected.length}개 표지에 함께 적용합니다.</strong><div class="impact-codes">${affected.map(r=>`<span>${e(r['표지번호'])}</span>`).join(' · ')}</div>`:`${e(s.detail.sign['표지번호'])} 이 표지판에 적용합니다.`;};
  impact();dialog.showModal();
  dialog.oncancel=ev=>{if(submit.disabled)ev.preventDefault();};
  dialog.onclick=async ev=>{
    const b=ev.target.closest('[data-action]');if(!b||submit.disabled)return;
    if(b.dataset.action==='close-dialog')dialog.close();
    if(b.dataset.action==='way-post'){
      if(!confirm('입력 중인 조건 변경을 버리고 공통 지주 제원 수정으로 이동할까요?'))return;
      try{await editWay(s,'way-post',b.dataset.id,api,save);}catch(err){error.textContent=err.message;error.hidden=false;}
    }
  };
  form.onchange=ev=>{
    if(ev.target.name==='scope')impact();
    if(ev.target.name==='group'){
      const ids=new Set(ev.target.value.split(','));form.querySelectorAll('[name=rule_ids]').forEach(el=>el.checked=ids.has(el.value));
    }
    for(const [name,area] of [['panel_id','#way-new-panel'],['post_id','#way-new-post']])if(ev.target.name===name){
      const block=form.querySelector(area);block.hidden=ev.target.value!=='new';block.querySelectorAll('input,textarea').forEach(el=>el.required=!block.hidden);
    }
  };
  form.onsubmit=async ev=>{
    ev.preventDefault();error.hidden=true;const v=Object.fromEntries(new FormData(form));submit.disabled=true;submit.textContent=s.wayDraftMode?'적용 중…':'저장·재조회 중…';
    try{const [operation,payload]=build(v,form);await save(operation,payload);dialog.close();}
    catch(err){error.textContent=err.message;error.hidden=false;}
    finally{submit.disabled=false;submit.textContent=submitLabel;}
  };
}
