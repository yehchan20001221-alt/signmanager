/* 표지판 화면은 판 수량만, 지주 화면은 해당 지주·기초 수량만 관리한다. */
import {e, size, supportSize, fileLink, panelShape} from './views.js';
import {supportLabel} from './catalog-supports.js';
import {quantityRows} from './quantity-editor.js';
import {automatic,number,effectiveRows} from './quantity-auto.js';

export const scopedModelFile=f=>['판','지주기초','구성','자리'].includes(f['대상종류'])&&/\.(obj|mtl)$/i.test(f.file['파일명']);
export function quantityModelFiles(d,target){
  const configs=d.configs.filter(c=>target.kind==='판'?c.slots.some(p=>p.own&&p['판ID']===target.id):c.support['지주기초ID']===target.id&&!c.isOverride);
  const assemblies=new Map(configs.map(c=>[c['구성ID'],c['원본모델명']]));
  const slots=new Set(target.kind==='판'?configs.flatMap(c=>c.slots.filter(p=>p.own&&p['판ID']===target.id).map(p=>p['자리ID'])):[]);
  const matching=d.files.filter(f=>scopedModelFile(f)&&(
    f['대상종류']===target.kind&&f['대상ID']===target.id||f['대상종류']==='구성'&&assemblies.has(f['대상ID'])||f['대상종류']==='자리'&&slots.has(f['대상ID'])
  )).map(f=>({...f,modelScope:f['대상종류']==='구성'?`조립 모델 · ${assemblies.get(f['대상ID'])}`:f['대상종류']==='자리'?'판 자리 모델':target.kind==='판'?'판 모델':'지주·기초 모델'}));
  return [...new Map(matching.map(f=>[`${f.modelScope}|${f.file['SHA256']||f['파일ID']}|${f.file['파일명']}|${f.file['서버주소']||''}`,f])).values()];
}

export function quantityView(s,editing=false){
  const d=s.detail,targets=new Map();
  if(d.support){const p=d.support;targets.set('지주기초|'+p['지주기초ID'],{kind:'지주기초',id:p['지주기초ID'],name:p['회사모델코드']||`${p['형식']} ${supportLabel(p)}`,description:supportSize(p),basis:'지주·기초 전체 1개소 세트'});}
  for(const r of [...d.wayRules||[],...d.panelSelections||[]])targets.set('판|'+r['판ID'],{kind:'판',id:r['판ID'],name:`${panelShape(r.panel)} ${size(r.panel)}`,basis:'판 1장'});
  for(const c of d.configs){
    for(const slot of c.slots.filter(r=>r.own))targets.set('판|'+slot['판ID'],{kind:'판',id:slot['판ID'],name:`${panelShape(slot.panel)} ${size(slot.panel)}`,basis:'판 1장'});
  }
  const kind=d.support?'지주기초':'판',shown=[...targets.values()].filter(t=>t.kind===kind);
  const target=shown.find(t=>t.id===s.quantityTarget)||shown[0];
  const quantities=target?quantityRows(d.quantities.filter(q=>q['대상종류']===kind&&q['대상ID']===target.id&&q['수량항목']),kind):[];
  const button=(label,action,id)=>`<button type="button" class="sl-button" data-action="${action}" data-id="${e(id)}">${label}</button>`;
  const heading=`<div class="sl-quantity-targets" role="group" aria-label="표지판 크기">${shown.map(t=>`<button type="button" data-quantity-target="${e(t.id)}" aria-pressed="${target===t}">${e(t.name)}</button>`).join('')}</div>`;
  let title=d.support?'':heading;
  if(!target)return title+'<p class="sl-sub">연결된 대상이 없습니다.</p>';
  const mode=s.quantityView||'quantities';
  const tabs=`<div class="sl-quantity-views sl-filters" role="group" aria-label="수량·모델 보기">${[['quantities','수량'],['models','OBJ 모델']].map(([id,label])=>`<button type="button" class="sl-filter" data-quantity-view="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div>`;
  if(mode==='models'){
    const files=quantityModelFiles(d,target);
    return title+tabs+`${editing?button('OBJ·MTL 파일 연결','add-model-file',kind+'|'+target.id):''}<div class="sl-model-files">${files.map(f=>`<div class="sl-related-row"><strong>${e(f.file['파일명'])}</strong><div class="sl-sub">${e(f.modelScope)}${/\.mtl$/i.test(f.file['파일명'])?' · 재질 MTL':''}</div><div class="sl-path">${fileLink(f.file)}</div>${editing&&f['대상종류']===kind&&f['대상ID']===target.id?button('교체','replace-model-file',f['연결ID']):''}</div>`).join('')||'<p class="sl-sub">이 대상에 연결된 OBJ·MTL 파일이 없습니다.</p>'}</div>`;
  }
  const calculated=quantities.some(automatic),condition=s.quantityCondition||'성토부';
  const visible=effectiveRows(quantities).filter(q=>!automatic(q)||!q['적용조건']||q['적용조건']===condition);
  if(calculated)title+=`<div class="sl-filters" role="group" aria-label="수량 적용 구분">${['성토부','절토부'].map(key=>`<button type="button" class="sl-filter" data-quantity-condition="${key}" aria-pressed="${key===condition}">${key}</button>`).join('')}</div>`;
  title+=button(calculated?'철근·기타 수량 입력':'수량 입력·수정','edit-quantities',kind+'|'+target.id);
  return title+tabs+`<p class="sl-sub">${e([target.description,target.basis].filter(Boolean).join(' · '))} 기준</p><div class="sl-table-scroll"><table class="sl-quantity-table"><thead><tr><th>수량 항목</th><th>재료 규격</th><th>수량</th><th>단위</th>${editing?'<th>수정</th>':''}</tr></thead><tbody>${visible.map(q=>`<tr><th scope="row">${e(q['수량항목'])}</th><td>${e(q['재료규격']||'—')}</td><td>${q['등록상태']==='등록'&&q['값']!==''&&q['값']!=null?e(automatic(q)?number(q['값']):q['값']):'미등록'}</td><td>${e(q['단위'])}</td>${editing?`<td>${automatic(q)?'자동':q['수량ID']?button('수정','edit-quantity',q['수량ID']):button('입력','edit-quantities',kind+'|'+target.id)}</td>`:''}</tr>`).join('')||`<tr><td colspan="${editing?5:4}">수량 항목 미등록</td></tr>`}</tbody></table></div>${editing?button('수량 항목 추가','add-quantity',kind+'|'+target.id):''}`;
}
