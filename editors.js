/* 공용 수정의 영향과 입력 검증을 저장 직전에 보여준다. */
import {e,button,chip,pks,nameOf,size,supportSize} from './views.js';
import {quantityTable,quantityRow,quantityValues} from './quantity-editor.js';
import {changeMaterial} from './quantity-material.js';
import {supportLabel} from './catalog-supports.js';

const field=(label,name,value='',type='text',required=false)=>`<label>${e(label)}<input name="${e(name)}" type="${type}" ${type==='number'?'step="any"':''} value="${e(value)}" ${required?'required':''}></label>`;
const select=(label,name,options,value='',required=true)=>`<label>${e(label)}<select name="${name}" ${required?'required':''}>${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const long=(label,name,value='')=>`<label class="wide">${e(label)}<textarea name="${name}" rows="2">${e(value)}</textarea></label>`;
const options=(rows,key,label)=>rows.map(r=>[r[key],label(r)]);
const labels={'명칭':'명칭','폭_mm':'폭 (mm)','높이_mm':'높이 (mm)','자료구분':'규격 구분','출처':'근거','비고':'비고','회사모델코드':'모델 코드','주지주직경_mm':'주지주 직경 (mm)','조립X_m':'조립 X (m)','조립Y_m':'조립 Y (m)','조립Z_m':'조립 Z (m)','판간격_m':'판 간격 (m)','간격적용범위':'간격이 적용되는 위치','검토사항':'조립 참고사항','서버주소':'서버 주소 또는 공유 경로'};
const numeric=new Set(['폭_mm','높이_mm','주지주직경_mm','조립X_m','조립Y_m','조립Z_m','판간격_m','분류코드','형태코드']);

export async function edit(s,action,id,api,save) {
  const t=s.tables, dialog=document.querySelector('#editor');
  if(['add-quantity','edit-quantity'].includes(action)){const q=action==='edit-quantity'?t.quantities.find(r=>r['수량ID']===id):null;if(q)id=q['대상종류']+'|'+q['대상ID'];action='edit-quantities';}
  let title='',body='',build,impactKind='',impactId='',submit='저장';
  const panels=options(t.panels,'판ID',p=>`${p['명칭']} · ${size(p)}`);
  const supports=options(t.supports,'지주기초ID',p=>`${p['형식']} ${supportSize(p)} · ${p['회사모델코드']}`);
  if (['add-sign','copy-sign'].includes(action)) {
    const copy=action==='copy-sign'; title=copy?'표지 복사':'새 표지 추가'; submit='표지 만들기';
    body=field('표지번호','code','', 'text',true)+field('표지명','name',copy?s.detail.sign['명칭']+' 복사':'','text',true)+field('용도','usage','미지정');
    if(copy){body+=`<p class="wide hint">${e(s.detail.sign['표지번호'])}의 판·지주·파일을 재사용합니다. 새 표지에 맞는 이미지와 CAD 블록은 추가 후 확인하세요.</p>`;if(s.detail.configs.length>1)body+=select('복사할 구성','config_id',[['','모든 연결 구성'],...options(s.detail.configs,'구성ID',c=>c['원본모델명'])],'',false);}
    build=v=>['add_sign',{...v,copy_id:copy?s.selected:''}];
  } else if (action==='change-panel') {
    const c=s.detail.configs.find(r=>r.slots.some(slot=>slot['자리ID']===id));
    const slot=c.slots.find(r=>r['자리ID']===id), sign=s.detail.sign;
    title=`${slot['역할']} · 판 바꾸기`;
    body=`<p class="wide hint">${e(sign['표지번호'])}에서 사용할 판을 선택하세요.</p>`+
      select('판 규격','panel_id',[...panels,['','새 규격 입력']],slot['판ID'])+
      `<div class="wide form-grid" id="new-panel-fields" hidden>${select('모양','shape',['삼각','역삼각','원형','사각','오각','팔각','보조','기타'].map(v=>[v,v]),slot.panel['형태'])}${field('폭 (mm)','width',slot.panel['폭_mm'],'number')}${field('높이 (mm)','height',slot.panel['높이_mm'],'number')}</div>`+
      `<p class="wide hint">저장 후 이미지·모델·수량이 새 규격에 맞는지 확인하세요.</p>`;
    build=v=>['save_composition',{
      sign_id:s.selected,config_id:c['구성ID'],code:sign['표지번호'],name:sign['명칭'],category:sign['분류코드'],usage:sign['용도'],block:sign['CAD블록명'],
      name_config:c['구성명'],condition:c['적용조건']||'공통',support_id:c.support['지주기초ID'],
      x:c['조립X_m'],y:c['조립Y_m'],z:c['조립Z_m'],gap:c['판간격_m'],gap_scope:c['간격적용범위'],source:c['출처'],
      slots:c.slots.map(r=>({old_slot_id:r['자리ID'],panel_id:r['판ID'],role:r['역할'],...(r['자리ID']===id?v:{})}))
    }];
    impactKind='표지';impactId=s.selected;
  } else if (action==='assign-support') {
    const c=s.detail.configs.find(r=>r['구성ID']===id);title='지주 바꾸기';
    body=`<p class="wide hint">${e(s.detail.sign['표지번호'])}에서 사용할 지주를 선택하세요.</p>`+select('사용할 지주·기초','support_id',[['',`처음 등록된 지주 · ${c.baseSupport['회사모델코드']}`],...supports],c.isOverride?c.support['지주기초ID']:'',false)+`<p class="wide hint">지주를 바꾸면 조립 위치와 모델 대응을 다시 확인해야 합니다.</p>`;
    build=v=>['assign_support',{sign_id:s.selected,config_id:id,support_id:v.support_id}];
    impactKind='표지';impactId=s.selected;
  } else if(action==='add-config') {
    title='기존 부품으로 구성 추가';
    body=field('구성명','name','','text',true)+select('지주·기초','support_id',supports)+field('조립 X (m)','x','','number')+field('조립 Y (m)','y','','number')+field('조립 Z (m)','z','','number')+field('판 간격 (m)','gap','','number')+`<div class="wide" id="slot-edit-list"><div class="slot-edit">${select('판 규격','panel_id',panels)}${field('판 역할','role','본판','text',true)}</div></div><div class="wide">${button('+ 판 한 장 추가','more-slot','','quiet')}</div><p class="wide hint">내민식 판 간격과 단주식 본판·보조판 간격은 0.1m 기준입니다. 새 구성의 조립 위치는 근거에 맞게 입력하세요.</p>`;
    build=(v,form)=>['add_config',{...v,sign_id:s.selected,slots:[...form.querySelectorAll('.slot-edit')].map(el=>({panel_id:el.querySelector('[name=panel_id]').value,role:el.querySelector('[name=role]').value}))}];
  } else if (action==='edit-quantities') {
    const [kind,target]=id.split('|');
    const post=kind==='지주기초'?t.supports.find(p=>p['지주기초ID']===target):null;
    title='단위수량 입력·수정';
    const name=post?`${post['형식']} · ${supportLabel(post)} · ${supportSize(post)}`:kind==='안내지주'?(s.guidePostCatalog.find(p=>p.key===target)?.label||target):nameOf(t,kind,target);
    body=`<div class="wide target-summary"><strong>${e(name)}</strong><p>${kind==='판'?'판 1장':'지주·기초 전체 1개소 세트'} 기준</p></div>`+(kind==='안내지주'?'<p class="wide sl-sub">입력한 수량은 자동계산보다 우선합니다. 빈칸은 자동계산값을 사용합니다.</p>':'')+quantityTable(t,kind,target);
    build=(_values,form)=>['save_quantities',{target_kind:kind,target_id:target,rows:quantityValues(form)}];
    impactKind=kind;impactId=target;
  } else if (['add-file','replace-file','add-model-file','replace-model-file'].includes(action)) {
    const modelOnly=action.includes('model-file');
    const link=action.startsWith('replace-')?t.filelinks.find(r=>r['연결ID']===id):null;
    title=link?'연결 파일 교체':'파일 연결';
    const targets=modelOnly?[[id,nameOf(t,...id.split('|'))]]:[['표지|'+s.selected,nameOf(t,'표지',s.selected)]];
    for(const c of s.detail.configs){targets.push(['구성|'+c['구성ID'],'구성 · '+c['원본모델명']],['지주기초|'+c.support['지주기초ID'],'지주 · '+c.support['회사모델코드']]);for(const slot of c.slots)targets.push(['자리|'+slot['자리ID'],c['원본모델명']+' · '+slot['역할']],['판|'+slot['판ID'],'판 규격 · '+slot.panel['명칭']]);}
    const distinct=modelOnly?targets.slice(0,1):[...new Map(targets).entries()];
    body=link?`<p class="wide">${e(nameOf(t,link['대상종류'],link['대상ID']))}의 파일을 교체합니다. 이전 파일은 기록에 남습니다.</p>`:select('연결 대상','target',distinct);
    body+=select('등록된 파일 재사용','file_id',[['','새 서버 파일 주소 등록'],...options(t.files.filter(f=>!modelOnly||/\.(obj|mtl)$/i.test(f['파일명'])),'파일ID',f=>`${f['파일명']} (${f['역할']})`)],'',false)+field('연결 역할','role',link?.['연결역할']||'3D형상 OBJ','text',true)+`<div class="wide form-grid" id="new-file-fields">${field('파일명','name','','text',true)}${field('서버 주소 또는 공유 경로','url','','text',true)}</div>`;
    build=v=>{const [kind,target]=link?[link['대상종류'],link['대상ID']]:v.target.split('|');return ['save_file',{...v,target_kind:kind,target_id:target,replace_link_id:link?.['연결ID']||'',model_only:modelOnly}];};
    if(link){impactKind=link['대상종류'];impactId=link['대상ID'];}
    else if(modelOnly){[impactKind,impactId]=id.split('|');}
  } else {
    const map={'edit-sign':['signs',s.selected,['표지번호','명칭','분류코드','형태코드','용도','CAD블록명','레이어변수'],'표지 기본정보'],'edit-panel':['panels',id,['명칭','형태','폭_mm','높이_mm','자료구분','출처','비고'],'판 규격 수정'],'new-panel':['panels','',['명칭','형태','폭_mm','높이_mm','자료구분','출처','비고'],'판 규격 등록'],'edit-support':['supports',id,['회사모델코드','형식','주지주직경_mm','단면규격','구성부품','기초정보','출처','비고'],'지주 규격 수정'],'new-support':['supports','',['회사모델코드','형식','주지주직경_mm','단면규격','구성부품','기초정보','출처','비고'],'지주 규격 등록'],'edit-config':['configs',id,['구성명','조립X_m','조립Y_m','조립Z_m','판간격_m','간격적용범위','검토사항'],'조립정보'],'edit-slot':['slots',id,['판ID','역할','원본이미지코드'],'구성의 연결 판 변경'],'edit-file':['files',id,['파일명','서버주소'],'서버 파일 주소']};
    const entry=map[action];if(!entry)return;const [table,rowId,columns,heading]=entry;title=heading;const row=rowId?t[table].find(r=>r[pks[table]]===rowId):{};
    body=columns.map(col=>col==='판ID'?select('사용할 판 규격',col,panels,row[col]):['출처','비고','검토사항'].includes(col)?long(labels[col]||col,col,row[col]):field(labels[col]||col,col,row[col],numeric.has(col)?'number':'text',['명칭','표지번호','형태','형식','회사모델코드','폭_mm','높이_mm'].includes(col))).join('');
    build=v=>rowId?['update',{table,id:rowId,fields:v}]:['add_component',{table,fields:v}];
    if(rowId){impactKind={signs:'표지',panels:'판',supports:'지주기초',configs:'구성',slots:'자리',files:'파일'}[table];impactId=rowId;}
  }
  dialog.innerHTML=`<form id="edit-form"><header><div><span class="muted">라이브러리 관리</span><h2 id="dialog-title">${e(title)}</h2></div>${button('닫기','close-dialog','','quiet')}</header><div class="form-grid">${body}</div><section id="impact" class="impact-box" ${impactKind?'':'hidden'}>영향 표지를 확인하는 중입니다…</section><p id="form-error" class="error" role="alert" hidden></p><footer>${button('취소','close-dialog')}<button type="submit" class="primary" ${impactKind?'disabled':''}>${submit}</button></footer></form>`;
  dialog.classList.remove('workflow-dialog');dialog.classList.toggle('quantity-dialog',action==='edit-quantities');dialog.oninput=null;dialog.onchange=null;dialog.onsubmit=null;dialog.showModal();
  const form=dialog.querySelector('form'), error=dialog.querySelector('#form-error'), submitButton=form.querySelector('[type=submit]');
  let impactReady=!impactKind;
  const validateQuantity=()=>{if(!['edit-quantities','add-quantity','edit-quantity'].includes(action))return;submitButton.disabled=!impactReady||!form.checkValidity();};
  form.addEventListener('input',validateQuantity);validateQuantity();
  const close=()=>{if(!submitButton.dataset.saving)dialog.close();};
  dialog.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.action==='close-dialog')close();if(b.dataset.action==='more-slot'){const area=dialog.querySelector('#slot-edit-list');if(area.children.length<16)area.insertAdjacentHTML('beforeend',`<div class="slot-edit">${select('판 규격','panel_id',panels)}${field('판 역할','role','보조판','text',true)}${button('제거','remove-slot','','quiet')}</div>`);}if(b.dataset.action==='remove-slot')b.closest('.slot-edit').remove();};
  dialog.oncancel=ev=>{if(submitButton.dataset.saving)ev.preventDefault();};
  form.addEventListener('click',function moreQuantity(ev){
    const add=ev.target.closest('[data-action=more-quantity],[data-action=more-rebar]');
    if(add){form.querySelector('.sl-bulk-quantities tbody').insertAdjacentHTML('beforeend',quantityRow(add.dataset.action==='more-rebar'?{수량항목:'철근',단위:'t'}:{},impactKind==='안내지주'));validateQuantity();}
    const remove=ev.target.closest('[data-remove-quantity]');if(remove){remove.closest('tr').remove();validateQuantity();}
  });
  form.onchange=ev=>{changeMaterial(ev.target);validateQuantity();if(['file_id','panel_id'].includes(ev.target.name)){const block=form.querySelector(ev.target.name==='file_id'?'#new-file-fields':'#new-panel-fields');if(block){block.hidden=!!ev.target.value;block.querySelectorAll('input').forEach(el=>{el.required=!ev.target.value;});}}};
  if(impactKind){try{const affected=await api('/api/impact?'+new URLSearchParams({kind:impactKind,identity:impactId}));const post=impactKind==='지주기초'?await api('/api/supports/'+encodeURIComponent(impactId)):null;dialog.querySelector('#impact').innerHTML=`<strong>${impactKind==='표지'?'이 표지에만 적용합니다':`같은 규격을 사용하는 표지 ${affected.length}개에 함께 적용합니다`}</strong>${post?`<details><summary>영향받는 조합 ${post.configs.length}개</summary>${post.configs.map(c=>`<div>${e(c['원본모델명']||c['구성명'])}</div>`).join('')}</details>`:''}${action==='edit-quantities'?'<details><summary>표지번호 보기</summary>':''}<div class="impact-codes">${affected.map(r=>chip(r['표지번호'])).join('')||'사용 중인 표지가 없습니다.'}</div>${action==='edit-quantities'?'</details>':''}`;submitButton.disabled=false;impactReady=true;validateQuantity();}catch(err){error.textContent=err.message;error.hidden=false;}}
  form.onsubmit=async ev=>{ev.preventDefault();error.hidden=true;const values=Object.fromEntries(new FormData(form));submitButton.disabled=true;submitButton.dataset.saving='true';submitButton.textContent='저장·재조회 중…';try{const [operation,payload]=build(values,form);await save(operation,payload);dialog.close();}catch(err){error.textContent=err.message;error.hidden=false;}finally{submitButton.disabled=false;delete submitButton.dataset.saving;submitButton.textContent=submit;validateQuantity();}};
}
