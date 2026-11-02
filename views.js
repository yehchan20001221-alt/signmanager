/* 실제 데이터의 이름과 관계를 작업자가 읽는 화면으로 표현한다. */
export const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const categories = {0:'주의',1:'규제',2:'지시',3:'보조',4:'경계',5:'이정',6:'방향',7:'노선',8:'시설',9:'영업소',10:'차로유도',11:'비정규',12:'안개구간',13:'기타 표지'};
export const kindTable = {'표지':'signs','판':'panels','지주기초':'supports','구성':'configs','자리':'slots','파일':'files'};
export const pks = {signs:'표지ID',panels:'판ID',supports:'지주기초ID',configs:'구성ID',slots:'자리ID',files:'파일ID',quantities:'수량ID'};
export const button = (label,action,id='',style='') => `<button type="button" class="${style}" data-action="${action}" data-id="${e(id)}">${e(label)}</button>`;
export const chip = (label,style='') => `<span class="chip ${style}">${e(label)}</span>`;
export const empty = message => `<div class="empty">${e(message)}</div>`;
export const size = row => `${row['폭_mm']||'미확인'} × ${row['높이_mm']||'미확인'} mm`;
export function panelSize(row) {
  const name=row['제원명']||'',p=row.panel;
  const dimensions=name.match(/^\s*(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s*$/u);
  const redundant=dimensions&&Number(dimensions[1])===Number(p['폭_mm'])&&Number(dimensions[2])===Number(p['높이_mm']);
  return `${name&&!redundant?name+' · ':''}${p['폭_mm']} × ${p['높이_mm']}`;
}
export const panelShape = p => p['형태']==='사각' ? (p['폭_mm']>0&&p['폭_mm']===p['높이_mm']?'정사각형':'사각형') : p['형태'];
export const supportSize = row => row['단면규격'] || (row['주지주직경_mm'] ? `Φ${row['주지주직경_mm']} mm` : '규격 미확인');
export function diagram(c) {
  if(!c)return '';
  const form=c.support['형식'],slots=c.slots;
  const posts=form==='부착식'?'<path d="M35 30V190"/>':form==='문형식'?'<path d="M30 190V35H250V190"/>':form==='복주식'?'<path d="M65 65V190M215 65V190"/>':form==='내민식'?'<path d="M35 190V45H240"/>':form==='양내민식'?'<path d="M140 190V40M35 85H245"/>':'<path d="M140 190V35"/>';
  const count=slots.length,columns=form==='양내민식'||form==='문형식'?2:1, width=columns===2?90:140;
  const paired=columns===2&&count===4&&slots.every(sl=>/^(좌|우)/u.test(sl['역할']))&&slots.filter(sl=>sl['역할'].includes('보조')).length===2;
  return `<svg class="combination-diagram" viewBox="0 0 280 215" role="img" aria-label="${e(form)} 판 ${count}장 조합 설명도"><g class="diagram-post">${posts}<path d="M15 192H265"/></g>${slots.map((sl,i)=>{const x=paired?(sl['역할'].startsWith('좌')?40:150):columns===2?40+(i%2)*110:70,y=paired?(sl['역할'].includes('보조')?30:65):35+Math.floor(i/columns)*Math.min(48,140/Math.ceil(count/columns)),h=paired?(sl['역할'].includes('보조')?26:50):Math.min(40,130/Math.ceil(count/columns));return `<g><rect x="${x}" y="${y}" width="${width}" height="${h}" rx="3"/><text x="${x+width/2}" y="${y+h/2+4}" text-anchor="middle">${e(sl['역할']||'판 '+(i+1))}</text></g>`;}).join('')}</svg>`;
}
export function nameOf(t,kind,id) {
  const key=kindTable[kind], row=(t[key]||[]).find(r=>r[pks[key]]===id);
  if (!row) return '연결 없음';
  if (kind==='표지') return `${row['표지번호']} ${row['명칭']}`;
  if (kind==='판') return row['명칭'];
  if (kind==='지주기초') return row['회사모델코드']||`${row['형식']} ${supportSize(row)}`;
  return row['구성명']||row['역할']||row['파일명'];
}
export function fileLink(file) {
  const url=file['서버주소'];
  return /^https?:\/\//i.test(url) ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">서버 파일 열기 ↗</a>` : `<span class="muted">${e(url||'서버 주소 미등록')}</span>`;
}
export function currentConfig(s) {return s.detail?.configs.find(c=>c['구성ID']===s.config)||s.detail?.configs.find(c=>c['채택상태']==='회사 기준')||s.detail?.configs[0];}
export function shell(s) {
  return `<aside class="sidebar"><a class="brand" href="/" aria-label="표지판 라이브러리 홈"><span class="brand-symbol">↗</span><span>표지판<br><strong>라이브러리</strong></span></a><div class="scope">고속도로 <span>프로토타입</span></div><nav aria-label="주 메뉴">${[['library','표지 라이브러리','▤'],['parts','규격 관리','◫'],['files','파일','▱'],['history','변경 이력','↺']].map(([id,label,icon])=>`<button class="nav-item ${s.page===id?'active':''}" data-action="nav" data-id="${id}"><span>${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-foot">판 · 지주 · 기초<br>규격과 파일을 관리합니다.</div></aside><main><header class="topbar"><span>라이브러리 관리</span><div class="toolbar"><span class="connection"><i></i> Google Sheets 연결</span><a href="${e(s.sheetUrl)}?gid=15#gid=15" target="_blank" rel="noopener noreferrer" class="text-link">관리 시트 ↗</a>${button('새로고침','reload','','quiet')}</div></header><div id="workspace"></div></main>`;
}
export function library(s) {
  return `<div class="workspace-heading"><div><h1>표지 라이브러리</h1><p>표지를 선택해 판·지주·파일·수량을 수정하세요.</p></div>${button('+ 표지 추가','add-sign','','primary')}</div><div class="library-layout ${s.mobileDetail?'show-detail':''}"><section class="sign-list" aria-label="표지 목록"><div class="search-box"><input type="search" id="search" placeholder="표지번호·이름 검색" aria-label="표지번호·이름 검색" value="${e(s.search)}"><select id="category" aria-label="표지 분류"><option value="">모든 분류</option>${Object.entries(categories).map(([v,l])=>`<option value="${v}" ${s.category===v?'selected':''}>${l}</option>`).join('')}</select></div><div id="list-items"></div><div class="list-foot">고속도로 표지 목록</div></section><section id="detail" class="sign-detail" aria-label="표지 상세"></section></div>`;
}
export function signList(s) {
  const priority=['425-4(B)','425-4(A)','420-1','110','110-2'];
  const rows=s.tables.signs.filter(r=>(`${r['표지번호']} ${r['명칭']}`.toLowerCase().includes(s.search.toLowerCase()))&&(!s.category||String(r['분류코드'])===s.category)).sort((a,b)=>{
    const ai=priority.indexOf(a['표지번호']),bi=priority.indexOf(b['표지번호']);
    return (ai<0?99:ai)-(bi<0?99:bi)||a['표지번호'].localeCompare(b['표지번호'],'ko',{numeric:true});
  });
  return `<div class="list-count">${rows.length}개 표지 <span>번호순</span></div>${rows.map(r=>`<button class="sign-row ${s.selected===r['표지ID']?'selected':''}" data-action="select" data-id="${e(r['표지ID'])}"><span class="thumb"><img loading="lazy" src="/api/signs/${e(r['표지ID'])}/image" alt=""></span><span class="sign-label"><strong>${e(r['표지번호'])}</strong><span>${e(r['명칭'])}</span></span><span class="row-arrow">›</span></button>`).join('')||empty('검색된 표지가 없습니다.')}`;
}
export function detail(s) {
  if (!s.detail) return empty(s.detailError||'표지를 선택하세요.');
  const d=s.detail, r=d.sign, c=currentConfig(s);
  return `<div class="detail-head">${button('‹ 목록','back','','mobile-back quiet')}<div class="detail-title"><div>${chip(categories[r['분류코드']]||'미분류')}<h2>${e(r['표지번호'])}</h2><p>${e(r['명칭'])}</p></div><div class="toolbar">${button('복사','copy-sign')}${button('기본정보 수정','edit-sign')}</div></div><div class="sign-hero"><img src="/api/signs/${e(r['표지ID'])}/image" alt="${e(r['표지번호'])} 원본 목록 이미지"><span>원본 목록 이미지</span></div><div class="detail-facts"><span>구성 <b>${d.configs.length}종</b></span><span>문자 입력 <b>${d.inputs.length}개</b></span><span>단위수량 <b>${d.quantities.some(q=>q['등록상태']==='등록')?'등록 항목 있음':'미등록'}</b></span></div></div><div class="tabs" role="tablist" aria-label="상세 정보">${[['config','1 판·지주 조합'],['cad','2 문자·이미지'],['files','3 서버 파일'],['quantities','4 단위수량'],['sources','원본 대조'],['history','이력']].map(([v,label])=>`<button role="tab" aria-selected="${s.tab===v}" class="${s.tab===v?'active':''}" data-action="tab" data-id="${v}">${label}</button>`).join('')}</div><div class="detail-body">${s.tab==='config'?config(s,c):s.tab==='cad'?cad(s):s.tab==='files'?files(s,d.files):s.tab==='quantities'?quantities(s):s.tab==='sources'?sources(s):history(s,r['표지번호'])}</div>`;
}
function config(s,c) {
  const d=s.detail;
  return `<div class="section-title"><h3>판과 지주 구성</h3>${button('+ 조건·조합 추가','compose-add','','quiet')}</div>${d.configs.length>1?`<label class="config-select">구성 선택<select id="config-select">${d.configs.map(r=>`<option value="${e(r['구성ID'])}" ${c['구성ID']===r['구성ID']?'selected':''}>${e(r['적용조건']||'조건 미등록')} · ${e(r.support['형식'])} · 판 ${r.slots.length}장 · ${e(r['원본모델명'])}</option>`).join('')}</select></label>`:''}${c?`<div class="composition-summary">${diagram(c)}<div><strong>${e(c['적용조건']||'적용 조건 미확인')}</strong><p>${e(c.support['형식'])} · ${e(supportSize(c.support))}</p><p class="hint">선택한 조합의 판·지주·좌표를 아래에서 확인합니다.</p></div></div><div class="section-title small"><span>${e(c['원본모델명'])} <span class="muted">/ 판 ${c.slots.length}장</span></span>${button('장수·배치 수정','compose-edit',c['구성ID'],'quiet')}</div><div class="panel-grid">${c.slots.map((slot,i)=>`<article class="panel-item"><div class="section-title small"><strong><span class="part-number">${i+1}</span>${e(slot['역할'])}</strong></div><p>${e(slot.panel['명칭'])}</p><strong class="dimension">${e(size(slot.panel))}</strong><div class="panel-actions">${button('판 바꾸기','change-panel',slot['자리ID'],'quiet')}</div></article>`).join('')}</div><div class="support-strip"><div><span class="muted">지주·기초 전체 1개소</span><h3>${e(c.support['형식'])} <small>${e(supportSize(c.support))}</small></h3><code>${e(c.support['회사모델코드'])}</code></div><div>${button('지주 바꾸기','assign-support',c['구성ID'])}</div></div><dl class="assembly"><div><dt>조립 위치 X / Y / Z (m)</dt><dd>${['조립X_m','조립Y_m','조립Z_m'].map(k=>e(c[k]===''?'미등록':c[k])).join(' / ')}</dd></div><div><dt>판 간격</dt><dd>${c['판간격_m']===''?'미등록':`${e(c['판간격_m'])} m`} <small>${e(c['간격적용범위'])}</small></dd></div></dl><details class="source"><summary>규격 근거</summary><p>${e(c['출처'])}</p><p>${e(c['검토사항'])}</p></details>`:empty('구성을 추가해 기존 판과 지주를 연결하세요.')}`;
}
function cad(s) {
  const inputs=s.cadInputs||s.detail.inputs.map(r=>({tag:r['CAD속성태그'],label:r['항목명'],value:r['미리보기예시값'],slot_id:r['자리ID']}));
  const slots=s.detail.configs.flatMap(c=>c.slots.filter(slot=>slot.own).map(slot=>({...slot,configName:c['원본모델명']})));
  return `<div class="section-title"><h3>문자 입력과 판별 이미지</h3>${button('CAD 항목 불러오기','load-cad','','quiet')}</div><p class="hint">예시 문자를 넣고 판별로 확인하세요. 글꼴과 배치는 연결된 CAD 블록을 따릅니다.</p><p class="muted">CAD 블록 ${e(s.detail.sign['CAD블록명']||'미등록')}</p><form id="cad-form"><div class="cad-inputs">${inputs.map((r,i)=>`<div class="cad-field" data-tag="${e(r.tag)}"><label>${e(r.label)}<input name="value${i}" maxlength="300" value="${e(r.value)}" data-label="${e(r.label)}"></label><label class="slot-label">들어갈 판<select name="slot${i}"><option value="">판 선택</option>${slots.map(slot=>`<option value="${e(slot['자리ID'])}" ${slot['자리ID']===r.slot_id?'selected':''}>${e(slot.configName)} · ${e(slot['역할'])}</option>`).join('')}</select></label></div>`).join('')||empty('CAD 항목을 불러오거나 기본정보에서 블록을 연결하세요.')}</div><div class="form-actions">${button('이미지 생성','preview','','primary')}${button('문자 저장','save-inputs')}</div></form><div id="cad-output">${s.preview?preview(s.preview):'<p class="hint">이미지 생성 후 전체 구성과 각 판을 나눠 확인할 수 있습니다.</p>'}</div>`;
}
export function preview(p) {
  return `<div class="preview-result"><div class="section-title"><h3>생성 이미지</h3>${chip('Way 적용 전 확인','amber')}</div>${p.warnings.map(w=>`<p class="warning">${e(w)}</p>`).join('')}<img class="cad-overall" src="${e(p.imageUrl)}" alt="CAD 전체 구성 미리보기"><div class="preview-panels">${p.panels.map((r,i)=>`<figure><img src="${e(r.imageUrl)}" alt="${e(r.label)}"><figcaption>${e(r.label)} ${button('PNG 저장','download-panel',String(i),'quiet')}</figcaption></figure>`).join('')}</div><p class="hint">${e(p.note)}</p></div>`;
}
export function files(s,links) {
  return `<div class="section-title"><h3>연결 파일</h3>${button('+ 파일 연결','add-file','','quiet')}</div><p class="hint">파일은 기존 서버에 업로드하고 주소를 연결합니다. 파일 교체 전 기록은 보존됩니다.</p>${links.length?`<div class="file-list">${links.map(link=>`<article class="file-row"><span class="file-ext">${e(link.file['파일명'].split('.').pop().toUpperCase())}</span><div><strong>${e(link.file['파일명'])}</strong><p>${e(link['연결역할'])} · ${e(nameOf(s.tables,link['대상종류'],link['대상ID']))}</p>${fileLink(link.file)}</div>${button('교체','replace-file',link['연결ID'],'quiet')}</article>`).join('')}</div>`:empty('서버에 업로드한 파일을 연결하세요.')}`;
}
function quantities(s) {
  const targets=new Map();
  for (const c of s.detail.configs) {
    targets.set(c.support['지주기초ID'],{kind:'지주기초',name:c.support['회사모델코드']});
    for (const slot of c.slots) targets.set(slot['판ID'],{kind:'판',name:slot.panel['명칭']});
  }
  return `<div class="section-title"><h3>개소당 단위수량</h3></div><p class="hint">판은 1장, 지주·기초는 전체 1개소 세트 기준입니다. 미등록 값은 0으로 계산하지 않습니다.</p>${[...targets].map(([id,t])=>{const rows=s.detail.quantities.filter(q=>q['대상ID']===id&&q['등록상태']==='등록');return `<section class="quantity-group"><div class="section-title small"><div><strong>${e(t.name)}</strong><p class="muted">${t.kind==='판'?'판 1장':'지주·기초 전체 1개소 세트'}</p></div>${button('+ 수량 등록','add-quantity',`${t.kind}|${id}`,'quiet')}</div>${rows.length?`<div class="table-scroll"><table><thead><tr><th>항목</th><th>재료 규격</th><th>단위수량</th><th>근거</th><th></th></tr></thead><tbody>${rows.map(q=>`<tr><td>${e(q['수량항목'])}</td><td>${e(q['재료규격'])}</td><td><strong>${e(q['값'])}</strong> ${e(q['단위'])}</td><td>${e(q['근거'])}</td><td>${button('수정','edit-quantity',q['수량ID'],'quiet')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="missing-quantity">미등록 <span>검토된 수량과 근거를 등록하세요.</span></div>'}</section>`;}).join('')||empty('먼저 판과 지주 구성을 연결하세요.')}`;
}
const actionNames={save_composition:'표지 조합 등록·수정',update:'정보 수정',add_sign:'표지 추가·복사',assign_support:'표지별 지주 변경',add_component:'규격 추가',add_config:'구성 추가',save_inputs:'CAD 입력 저장',save_quantity:'단위수량 등록',save_file:'파일 연결·교체'};
export function history(s,code='') {
  const records=[...s.tables.history].reverse().filter(r=>!code||r['영향표지'].split(', ').includes(code));
  return records.map(r=>`<article class="history-row"><div><strong>${e(actionNames[r['동작']]||r['동작'])}</strong><time>${e(new Date(r['변경일시']).toLocaleString('ko-KR'))}</time></div><p>영향 표지: ${e(r['영향표지']||'현재 연결 없음')}</p><details><summary>변경 내용</summary><div class="history-diff"><div><b>이전</b><pre>${e(JSON.stringify(JSON.parse(r['변경전']),null,2))}</pre></div><div><b>변경 후</b><pre>${e(JSON.stringify(JSON.parse(r['변경후']),null,2))}</pre></div></div></details></article>`).join('')||empty('관리 화면에서 저장한 변경 내역이 여기에 남습니다.');
}
export function otherPage(s) {
  if (s.page==='history') return `<div class="workspace-heading"><div><h1>변경 이력</h1><p>저장된 이전 값과 영향 표지를 확인합니다.</p></div></div><section class="page-body">${history(s)}</section>`;
  if (s.page==='files') return `<div class="workspace-heading"><div><h1>파일 저장소 연결</h1><p>서버 파일의 주소와 사용 관계를 관리합니다.</p></div></div><section class="page-body">${s.tables.files.map(f=>`<article class="file-row"><span class="file-ext">${e(f['파일명'].split('.').pop().toUpperCase())}</span><div><strong>${e(f['파일명'])}</strong><p>${e(f['역할'])} · 연결 ${s.tables.filelinks.filter(l=>l['파일ID']===f['파일ID']).length}곳</p>${fileLink(f)}</div>${button('주소 수정','edit-file',f['파일ID'],'quiet')}</article>`).join('')}</section>`;
  return `<div class="workspace-heading"><div><h1>규격 관리</h1><p>규격 자체를 수정합니다. 같은 규격을 쓰는 표지에 함께 적용되므로 저장 전에 대상 목록을 확인하세요.</p></div><div class="toolbar">${button('+ 판 등록','new-panel')}${button('+ 지주 등록','new-support','','primary')}</div></div><section class="page-body"><h2 class="subheading">판 규격 <small>${s.tables.panels.length}종</small></h2><div class="parts-grid">${s.tables.panels.map(p=>`<article class="part-card"><span class="part-type">${e(p['형태'])}</span><h3>${e(p['명칭'])}</h3><p class="dimension">${e(size(p))}</p>${button('규격 수정','edit-panel',p['판ID'],'quiet')}</article>`).join('')}</div><h2 class="subheading">지주·기초 <small>${s.tables.supports.length}종</small></h2><div class="parts-grid">${s.tables.supports.map(p=>`<article class="part-card"><span class="part-type">${e(p['형식'])}</span><h3>${e(supportSize(p))}</h3><p class="code-name">${e(p['회사모델코드'])}</p><p class="muted">${e(p['기초정보']||'기초 치수 미등록')} / 전체 1개소 세트</p>${button('규격 수정','edit-support',p['지주기초ID'],'quiet')}</article>`).join('')}</div></section>`;
}

function sources(s){const data=s.detail.sources||{};return `<h3>이 표지의 원본 값</h3><p class="hint">관리 항목과 대조할 수 있도록 원래 값을 보존합니다. 설치 이격과 조립 좌표, 풍속별 기존 규격을 구분하여 확인하세요.</p>${data.appendix?`<details open class="source"><summary>회사 별첨 · ${e(data.appendix.heading)}</summary><div class="table-scroll"><table><tbody>${data.appendix.rows.map(row=>`<tr>${row.map(value=>`<td>${e(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}${(data.records||[]).map(r=>`<details class="source"><summary>${e(r.sheet)} · ${r.row}행</summary><dl class="source-values">${Object.entries(r.cells).map(([key,value])=>`<div><dt>${e(key)}열</dt><dd>${e(value)}</dd></div>`).join('')}</dl></details>`).join('')||empty('이 번호와 정확히 일치하는 원본 행이 없습니다.')}`;}
