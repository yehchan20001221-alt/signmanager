/* 표지의 중복 기본정보 없이 공통 조건과 제원 참조를 보여준다. */
import {e, size, panelShape} from './views.js';

const button=(label,action,id='')=>`<button type="button" class="sl-button" data-action="${action}" data-id="${e(id)}">${label}</button>`;
export function ruleLabel(t,r){
  const panel=t.panels.find(p=>p['판ID']===r['판ID']);
  const post=(t.wayposts||[]).find(p=>p['지주제원ID']===r['지주제원ID']);
  return [r['차로수조건']||'차로수 미기재',r['풍속_m_s']===''?'':r['풍속_m_s']+'m/s',panel?`${panelShape(panel)} ${size(panel)}`:'',post?post['지주종류']+' '+post['지주제원']:''].filter(Boolean).join(' · ');
}
export function wayGroups(t){
  const groups=new Map();
  for(const sign of t.signs){
    const ids=(t.waylinks||[]).filter(l=>l['표지ID']===sign['표지ID']).sort((a,b)=>(a['순서']||0)-(b['순서']||0)).map(l=>l['조건ID']);
    if(!ids.length)continue;
    const key=[...ids].sort().join(',');
    if(!groups.has(key))groups.set(key,{ids,signs:[]});
    groups.get(key).signs.push(sign);
  }
  return [...groups.values()];
}
export function wayConditions(s,editing,source=''){
  const rows=s.detail.wayRules||[],t=s.tables;
  return `<details class="sl-fold sl-waydb" open><summary>Way DB 조건 <span class="sl-sub">${rows.length}개</span></summary>${editing?`<div class="sl-actions">${button('기존 조건 선택','way-link')}${button('조건 추가','way-add')}</div>`:''}<div class="sl-table-scroll"><table class="sl-way-table"><thead><tr><th>차로수(편도)</th><th>풍속(m/s)</th><th>표지판 크기</th><th>지주 종류·제원</th>${editing?'<th>변경</th>':''}</tr></thead><tbody>${rows.map(r=>{
    const shared=(t.waylinks||[]).filter(l=>l['조건ID']===r['조건ID']).length;
    return `<tr><td>${e(r['차로수조건']||'—')}</td><td>${e(r['풍속_m_s']===''?'—':r['풍속_m_s'])}</td><td>${e(r.panel['형태']+' '+size(r.panel))}</td><td>${r.post?`${e(r.post['지주종류'])}<br>${e(r.post['지주제원'])}`:'—'}</td>${editing?`<td>${button('수정','way-edit',r['조건ID'])}${button('연결 해제','way-unlink',r['조건ID'])}<div class="sl-sub">${shared}개 표지 사용</div></td>`:''}</tr>`;
  }).join('')||`<tr><td colspan="${editing?5:4}">연결된 조건이 없습니다.${editing?' 기존 조건을 선택하거나 추가하세요.':''}</td></tr>`}</tbody></table></div>${source}</details>`;
}
