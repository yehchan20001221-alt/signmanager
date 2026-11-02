/* 판과 지주 조합을 한 흐름으로 입력하고, 마지막에 원자적으로 저장한다. */
import {e,button,categories,size,supportSize,diagram,currentConfig} from './views.js';
const shapes=['삼각','역삼각','원형','사각','오각','팔각','보조','기타'];
const forms=['단주식','복주식','내민식','양내민식','문형식','부착식'];
const field=(label,name,value='',type='text',required=false)=>`<label>${e(label)}<input name="${e(name)}" value="${e(value)}" type="${type}" ${type==='number'?'step="any"':''} ${required?'required':''}></label>`;
const select=(label,name,options,value='')=>`<label>${e(label)}<select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const choices=(name,values,value)=>`<div class="choice-row">${values.map(v=>`<label class="choice"><input type="radio" name="${name}" value="${e(v)}" ${v===value?'checked':''}><span class="shape-icon shape-${shapes.indexOf(v)}">${shapes.includes(v)?'':e(v==='단주식'?'┬':v==='복주식'?'Ⅱ':v==='내민식'?'Γ':v==='양내민식'?'┬':v==='문형식'?'Π':'▣')}</span><b>${e(v)}</b></label>`).join('')}</div>`;

export async function workflow(s,action,api,save) {
  const dialog=document.querySelector('#editor'), t=s.tables;
  const editing=action==='compose-edit', adding=action==='compose-add';
  const old=editing?currentConfig(s):null, sign=(editing||adding)?s.detail.sign:{};
  let step=editing?1:0, saving=false, dirty=false;
  const state={sign_id:sign['표지ID']||'',config_id:old?.['구성ID']||'',code:sign['표지번호']||'',name:sign['명칭']||'',category:String(sign['분류코드']??'0'),usage:sign['용도']||'신규 적용',block:sign['CAD블록명']||'',
    condition:old?.['적용조건']||'공통',support_id:old?.support['지주기초ID']||'',form:old?.support['형식']||'단주식',
    slots:old?old.slots.map(sl=>({old_slot_id:sl['자리ID'],panel_id:sl['판ID'],shape:sl.panel['형태'],width:sl.panel['폭_mm'],height:sl.panel['높이_mm'],role:sl['역할']})):[{panel_id:'',shape:'사각',width:'',height:'',role:'본판'}],
    x:old?.['조립X_m']??'',y:old?.['조립Y_m']??'',z:old?.['조립Z_m']??'',gap:old?.['판간격_m']??'',gap_scope:old?.['간격적용범위']||'',source:old?.['출처']||'',inputs:[],files:[],quantities:[],support:{}};
  let blocks=[];
  const labels=['표지 정보','판 조합','지주·조건','문자·파일·수량','저장 확인'];
  const targets=()=>[['sign','표지 전체'],['support','지주·기초 전체 1세트'],...state.slots.map((p,i)=>[String(i),`${i+1}. ${p.role}`])];
  function read(){
    const form=dialog.querySelector('#workflow-form');if(!form)return;
    const v=Object.fromEntries(new FormData(form));
    for(const k of ['code','name','category','usage','block','condition','form','support_id','x','y','z','gap','gap_scope','source'])if(k in v)state[k]=v[k];
    if(step===1)state.slots=[...form.querySelectorAll('.draft-panel')].map(el=>Object.fromEntries([...el.querySelectorAll('input,select')].filter(i=>i.type!=='radio'||i.checked).map(i=>[i.name.replace(/^p\d+_/u,''),i.value])));
    if(step===2)state.support=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('support_')&&k!=='support_id').map(([k,value])=>[k.slice(8),value]));
    if(step===3){
      state.inputs=[...form.querySelectorAll('.draft-input')].map(el=>({tag:el.dataset.tag,label:el.dataset.label,value:el.querySelector('input').value,panel:el.querySelector('select').value}));
      for(const key of ['files','quantities'])state[key]=[...form.querySelectorAll('.draft-'+key)].map(el=>Object.fromEntries([...el.querySelectorAll('input,select')].map(i=>[i.name,i.value])));
    }
  }
  function previewConfig(){const support=t.supports.find(p=>p['지주기초ID']===state.support_id)||{'형식':state.form,'단면규격':state.support['단면규격']||'규격 입력 전'};return {support,slots:state.slots.map(p=>({panel:t.panels.find(r=>r['판ID']===p.panel_id)||{'형태':p.shape,'폭_mm':p.width,'높이_mm':p.height},'역할':p.role}))};}
  function page(){
    if(step===0)return `<h2>어떤 표지를 등록하나요?</h2><p class="hint">번호와 이름을 정하고, 사용할 판과 지주를 차례로 선택합니다.</p><div class="form-grid">${field('표지번호','code',state.code,'text',true)}${field('표지명','name',state.name,'text',true)}${select('분류','category',Object.entries(categories),state.category)}${select('용도','usage',[['신규 적용','신규 적용'],['기존도로용','기존도로용'],['공통','공통'],[state.usage,state.usage]],state.usage)}</div>`;
    if(step===1)return `<h2>판의 모양과 장수를 정하세요</h2><p class="hint">같은 규격이 있으면 가져오고, 없으면 모양과 치수를 입력합니다.</p>${state.slots.map((p,i)=>`<section class="draft-panel"><input type="hidden" name="p${i}_old_slot_id" value="${e(p.old_slot_id||'')}"><div class="section-title"><h3>${i+1}번째 판</h3>${state.slots.length>1?button('제거','wf-remove-panel',String(i),'quiet'):''}</div>${field('역할',`p${i}_role`,p.role,'text',true)}${select('등록된 판 재사용',`p${i}_panel_id`,[['','새 규격 입력'],...t.panels.filter(r=>r['폭_mm']&&r['높이_mm']).map(r=>[r['판ID'],`${r['형태']} · ${size(r)}`])],p.panel_id)}${p.panel_id?`<p class="hint">선택한 규격의 치수를 사용합니다.</p>`:`${choices(`p${i}_shape`,shapes,p.shape)}<div class="form-grid">${field('폭 (mm)',`p${i}_width`,p.width,'number',true)}${field('높이 (mm)',`p${i}_height`,p.height,'number',true)}</div>`}</section>`).join('')}${button('+ 판 한 장 추가','wf-panel','','quiet')}`;
    if(step===2){const available=t.supports.filter(p=>p['형식']===state.form);return `<h2>어떤 지주에 결합하나요?</h2>${choices('form',forms,state.form)}${select('지주·기초 선택','support_id',[['','새 지주·기초 등록'],...available.map(p=>[p['지주기초ID'],`${supportSize(p)} · ${p['회사모델코드']}`])],state.support_id)}${!state.support_id?`<div class="form-grid new-support">${field('모델 코드','support_회사모델코드',state.support['회사모델코드']||'','text',true)}${field('단면 규격 (예: Φ89.1, H100×100)','support_단면규격',state.support['단면규격']||'','text',true)}${field('원형 지주 직경 (해당 시 mm)','support_주지주직경_mm',state.support['주지주직경_mm']||'','number')}${field('기초 정보 / 미확인','support_기초정보',state.support['기초정보']||'미등록')}${field('구성 부품 (좌·우 등)','support_구성부품',state.support['구성부품']||'')}</div>`:`<p class="hint">${e(available.find(p=>p['지주기초ID']===state.support_id)?.['기초정보']||'기초 규격·수량은 연결 자료에서 확인하세요.')}</p>`}<div class="form-grid">${select('적용 조건','condition',[...new Set(['공통','편도 2차로 이하 · 중형','편도 3차로 이상 · 대형','왕복 6차로 이하','왕복 8차로 이상',state.condition])].map(v=>[v,v]),state.condition)}${field('조건·규격 근거','source',state.source)}</div><p class="hint">이 조건 한 개를 등록합니다. 다른 조건은 저장 후 ‘조건·조합 추가’로 이어서 관리합니다.</p><details class="source" ${old?'open':''}><summary>조립 위치와 판 사이 간격</summary><div class="form-grid">${field('조립 X (m)','x',state.x,'number')}${field('조립 Y (m)','y',state.y,'number')}${field('조립 Z (m)','z',state.z,'number')}${field('판 간격 (m)','gap',state.gap,'number')}${field('간격이 적용되는 판 사이','gap_scope',state.gap_scope)}</div><p class="hint">내민식 판 간격, 단주식 본판–보조판은 0.1m. 다른 간격과 조립 좌표는 근거를 확인하여 입력합니다.</p></details>`;}
    if(step===3)return `<h2>문자·파일·단위수량 연결</h2><p class="hint">미등록 항목은 비워둘 수 있습니다. 수량 0은 입력된 값으로 저장합니다.</p><section><div class="section-title"><h3>CAD 문자</h3>${button('입력 항목 읽기','wf-cad','','quiet')}</div>${select('CAD 속성블록','block',[['','나중에 연결'],...blocks.map(b=>[b,b])],state.block)}${state.inputs.map(r=>`<div class="draft-input form-grid" data-tag="${e(r.tag)}" data-label="${e(r.label)}">${field(r.label,'value',r.value)}${select('들어갈 판','panel',[['','판 선택'],...state.slots.map((p,i)=>[String(i),`${i+1}. ${p.role}`])],String(r.panel))}</div>`).join('')}</section><section><div class="section-title"><h3>서버 파일</h3>${button('+ 파일','wf-file','','quiet')}</div><p class="hint">OBJ·MTL은 같은 이름, 모델 단위는 m. 판 이미지와 재질의 연결도 확인하세요. 기존 연결은 유지됩니다.</p>${state.files.map((f,i)=>`<div class="draft-files form-grid">${select('연결 대상','target',targets(),f.target)}${select('파일 역할','role',['3D형상 OBJ','재질 MTL','CAD 원본','판 이미지','근거 문서'].map(v=>[v,v]),f.role)}${field('파일명','name',f.name,'text',true)}${field('서버 주소 / 공유 경로','url',f.url,'text',true)}${button('제거','wf-remove-file',String(i),'quiet')}</div>`).join('')}</section><section><div class="section-title"><h3>개소당 단위수량</h3>${button('+ 수량 항목','wf-quantity','','quiet')}</div>${state.quantities.map((q,i)=>`<div class="draft-quantities form-grid">${select('수량 대상','target',targets().filter(([v])=>v!=='sign'),q.target)}${field('수량 항목','item',q.item,'text',true)}${field('재료 규격','material',q.material)}${field('단위','unit',q.unit,'text',true)}${field('값 (0 입력 가능)','value',q.value,'number',true)}${button('제거','wf-remove-quantity',String(i),'quiet')}</div>`).join('')}<p class="hint">판은 1장, 지주·기초는 전체 1개소 세트. 복주식 기초 두 개를 합산한 값은 한 번 등록합니다.</p></section>`;
    return `<h2>이 조합으로 저장합니다</h2><dl class="review-list"><div><dt>표지</dt><dd>${e(state.code)} · ${e(state.name)}</dd></div><div><dt>적용 조건</dt><dd>${e(state.condition)}</dd></div><div><dt>판</dt><dd>${state.slots.length}장 · ${state.slots.map(p=>e(p.role)).join(' + ')}</dd></div><div><dt>지주</dt><dd>${e(state.form)} · ${e(supportSize(previewConfig().support))}</dd></div><div><dt>연결</dt><dd>CAD ${e(state.block||'미등록')} / 추가 파일 ${state.files.length}개 / 추가 수량 ${state.quantities.length}항목</dd></div></dl>${old?'<p class="impact-box">선택한 표지의 판·지주 구성을 바꿉니다. 문자와 파일은 원래 판을 따라 유지됩니다. 삭제한 판의 문자는 다시 지정해야 합니다.</p>':'<p class="impact-box">표지·판·지주와 입력한 연결 정보를 한 번에 저장합니다.</p>'}${state.quantities.length||state.files.some(f=>f.target==='support')?'<p class="impact-box">추가한 규격별 수량과 지주 파일은 같은 규격을 사용하는 다른 표지에서도 함께 사용됩니다.</p>':''}<p class="hint">CAD 이미지는 저장 후 ‘문자·이미지’에서 생성·확인하세요. 파일 주소가 없는 항목과 수량 미등록 상태도 보존됩니다.</p>`;
  }
  function draw(){dialog.classList.add('workflow-dialog');dialog.innerHTML=`<form id="workflow-form"><header><div><span class="muted">${editing?'선택한 조합 수정':adding?'조건·조합 추가':'처음부터 표지 등록'}</span><h2 id="dialog-title">판 + 지주 + 연결 정보</h2></div>${button('닫기','wf-close','','quiet')}</header><ol class="workflow-steps">${labels.map((l,i)=>`<li class="${i===step?'active':i<step?'done':''}"><b>${i+1}</b>${l}</li>`).join('')}</ol><div class="workflow-body"><div class="workflow-fields">${page()}<p class="error" id="wf-error" role="alert" hidden></p></div><aside class="composition-preview"><span class="eyebrow">현재 조합</span>${diagram(previewConfig())}<strong>${e(state.code||'새 표지')}</strong><p>${e(state.name||'번호와 이름 입력')}</p><p>${state.slots.length}장 · ${e(state.form)}</p><span class="chip">${e(state.condition)}</span><p class="hint">조합 설명도 · 실제 제작도 아님</p></aside></div><footer>${button('취소','wf-close')}${step?button('이전','wf-prev'):''}<button type="submit" class="primary">${step===4?'구글시트에 저장':'다음 단계 →'}</button></footer></form>`;}
  function error(err){const el=dialog.querySelector('#wf-error');el.hidden=false;el.textContent=err.message;}
  function close(){if(!saving&&(!dirty||confirm('입력한 내용을 저장하지 않고 닫을까요?'))){dialog.close();dialog.classList.remove('workflow-dialog');}}
  draw();dialog.showModal();
  try{blocks=await api('/api/cad/blocks');}catch(err){error(err);}
  dialog.oncancel=ev=>{ev.preventDefault();close();};
  dialog.oninput=()=>{dirty=true;};
  dialog.onchange=ev=>{dirty=true;read();if(ev.target.name==='form'){state.support_id='';state.support={};}if(ev.target.name==='block')state.inputs=[];if(ev.target.name==='form'||ev.target.name==='support_id'||/_panel_id$/u.test(ev.target.name))draw();};
  dialog.onclick=async ev=>{const b=ev.target.closest('button[data-action]');if(!b||saving)return;const a=b.dataset.action;read();
    if(a==='wf-close'){close();return;}if(a==='wf-prev'){step--;draw();return;}
    if(a==='wf-panel'&&state.slots.length<16)state.slots.push({panel_id:'',shape:'사각',width:'',height:'',role:'보조판'});
    if(a==='wf-remove-panel')state.slots.splice(Number(b.dataset.id),1);
    if(a==='wf-file')state.files.push({target:'sign',role:'3D형상 OBJ',name:'',url:''});
    if(a==='wf-quantity')state.quantities.push({target:'support',item:'',material:'',value:'',unit:''});
    if(a==='wf-remove-file')state.files.splice(Number(b.dataset.id),1);
    if(a==='wf-remove-quantity')state.quantities.splice(Number(b.dataset.id),1);
    if(a==='wf-cad'){try{const attrs=await api('/api/cad/block-attributes?'+new URLSearchParams({block:state.block}));state.inputs=attrs.map(r=>({...r,panel:state.slots.length===1?'0':'',...state.inputs.find(old=>old.tag===r.tag)}));}catch(err){error(err);return;}}
    draw();
  };
  dialog.onsubmit=async ev=>{ev.preventDefault();if(saving)return;read();
    if(step===3&&state.inputs.some(i=>i.panel==='')){error(new Error('각 문자가 들어갈 판을 선택하세요.'));return;}if(step<4){step++;draw();return;}
    saving=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{state.support['형식']=state.form;state.support['출처']=state.source;await save('save_composition',state);dirty=false;dialog.close();dialog.classList.remove('workflow-dialog');}
    catch(err){error(err);}finally{saving=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  };
}
