/* 신규 표지의 Way 조건은 등록 전까지 화면에만 보관하고 기존 공통값을 수정하지 않는다. */
import {wayConditions} from './waydb-view.js';

const geometry=p=>[p['형태'],p['폭_mm'],p['높이_mm']].join('|');
export function context(s,values){
 const option=(s.registrationOptions||[]).find(o=>o.name===values.shape&&o.auxiliary===(String(values.category)==='3'));
 const panels=(option?.specs||[]).filter(p=>values.sizes.includes(p.name)).flatMap(p=>{
  const fields={형태:option.shape,폭_mm:p.width,높이_mm:p.height};
  const existing=s.tables.panels.filter(row=>geometry(row)===geometry(fields));
  return existing.length?existing:[{...fields,판ID:'draft-panel-'+geometry(fields)}];
 });
 const ids=new Set(panels.map(p=>p['판ID']));
 const wayrules=(s.tables.wayrules||[]).filter(r=>ids.has(r['판ID']));
 const ruleIds=new Set(wayrules.map(r=>r['조건ID']));
 return {...s,wayDraftMode:true,selected:'',tables:{...s.tables,panels,wayrules,
  waylinks:(s.tables.waylinks||[]).filter(l=>ruleIds.has(l['조건ID']))},
  detail:{sign:{표지번호:values.code||'신규 표지판'},wayRules:s.wayDraft||[]}};
}
export function view(s){
 return wayConditions(s,true)+'<p class="sl-sub">조건은 표지판을 등록할 때 함께 저장됩니다.</p>';
}
export function change(rows,s,operation,payload){
 const t=s.tables;
 if(operation==='unlink_way_rule')return rows.filter(r=>r['조건ID']!==payload.id);
 if(operation==='link_way_rules'){
  const result=[...rows];
  for(const id of payload.rule_ids){
   const r=t.wayrules.find(r=>r['조건ID']===id);
   if(!r)throw new Error('선택한 모양·크기에 맞는 조건을 선택하세요.');
   if(!result.some(row=>row['조건ID']===id))result.push({...r,panel:t.panels.find(p=>p['판ID']===r['판ID']),post:(t.wayposts||[]).find(p=>p['지주제원ID']===r['지주제원ID'])||null});
  }
  return result;
 }
 if(operation!=='save_way_rule')throw new Error('신규등록 중에는 공통 조건을 변경할 수 없습니다.');
 const p=t.panels.find(p=>p['판ID']===payload.fields['판ID']);
 if(!p)throw new Error('선택한 모양·크기에 맞는 표지판 크기를 선택하세요.');
 const raw=String(payload.fields['풍속_m_s']).trim(),wind=raw===''?'':Number(raw);
 if(wind!==''&&(!Number.isFinite(wind)||wind<0))throw new Error('풍속은 빈칸 또는 0 이상의 숫자여야 합니다.');
 const post=payload.post?{지주종류:payload.post['지주종류'],지주제원:payload.post['지주제원'].trim()}:(t.wayposts||[]).find(p=>p['지주제원ID']===payload.post_id)||null;
 if(payload.post&&!post['지주제원'])throw new Error('지주 제원을 입력하세요.');
 const row={조건ID:payload.id||'draft-'+globalThis.crypto.randomUUID(),차로수조건:payload.fields['차로수조건'].trim(),풍속_m_s:wind,
  판ID:p['판ID'],지주제원ID:post?.['지주제원ID']||'',panel:p,post,draft:true};
 return rows.some(r=>r['조건ID']===payload.id)?rows.map(r=>r['조건ID']===payload.id?row:r):[...rows,row];
}
export function payload(rows){
 return rows.map(r=>r.draft?{fields:{차로수조건:r['차로수조건'],풍속_m_s:r['풍속_m_s'],판ID:''},
  panel:{형태:r.panel['형태'],폭_mm:r.panel['폭_mm'],높이_mm:r.panel['높이_mm']},
  ...(r.post?.['지주제원ID']?{post_id:r.post['지주제원ID']}:r.post?{post:{지주종류:r.post['지주종류'],지주제원:r.post['지주제원']}}:{})}:{id:r['조건ID']});
}
