/* 공통 데이터의 재사용 판과 실제 연결 표지. 원본 파일은 내용 주소로 보존한다. */
import {e} from './views.js';
import {pieceGroups,pieceFamily} from './guide-piece-groups.js';
import {viewbar,signSection,caption} from './guide-panel-view.js';
import * as preview from './guide-piece-preview.js';
import * as positions from './guide-positions.js';
import * as panelCreate from './guide-panel-create.js';
import {loadArtworks} from './guide-piece-artworks.js';
import {mappingBadge} from './guide-mapping-warning.js';
let installed=false;
export const clear=()=>{preview.clear();positions.clear();panelCreate.clear();installed=false;};
export const drawModel=()=>installed?positions.drawModel():preview.drawModel();
// 한 장으로 직접 설치된 모델만 편집한다. 조합의 설치 좌표는 구성 판에 상속하지 않는다.
export function installationSpec(choice,assets,specs,id,preferred=''){
 const keys=choice?.aliases||[choice?.key];
 const models=new Set(assets.filter(a=>a.kind==='assembly'&&a.parts?.length===1&&keys.includes(a.parts[0].piece)).map(a=>a.key));
 const candidates=specs.flatMap(spec=>spec.sources||[spec]).filter(spec=>models.has(spec.model)&&spec.members.some(m=>m.sign['안내표지ID']===id));
 return candidates.find(spec=>spec.key===preferred||spec.sources?.some(p=>p.key===preferred))||candidates[0];
}
export function connectedCombinations(choice,assets,specs,signId){
 const keys=choice.aliases||[choice.key];
 const models=new Set(assets.filter(a=>a.kind==='assembly'&&a.parts?.some(p=>keys.includes(p.piece))).map(a=>a.key));
 return specs.filter(spec=>spec.form.parts.length>1&&(spec.sources||[spec]).some(row=>models.has(row.model)&&(!signId||row.members?.some(m=>m.sign['안내표지ID']===signId))));
}
const title=a=>`${Number(a.B).toLocaleString('ko-KR',{maximumFractionDigits:1})} × ${Number(a.H).toLocaleString('ko-KR',{maximumFractionDigits:1})} mm`;
export function usage(u,s,selected,_combinations=[],references=[u]){
 const registered=s.tables.guidesigns.some(g=>g['안내표지ID']===u.id);
 const src=u.artworkURL||(registered?`/api/guides/${encodeURIComponent(u.id)}/image`:u.image?`/static/images/guide-registration/${encodeURIComponent(u.image)}`:'');
 const connections='';
 const details=[...new Map(references.filter(r=>s.tables.guidesigns.some(g=>g['안내표지ID']===r.id)).map(r=>[r.id,r])).values()];
 const detailButton=(r,label)=>`<button type="button" data-common-sign-detail="${e(r.id)}">${e(label)}</button>`;
 const detailLinks=details.length===1?detailButton(details[0],'표지상세'):details.length>1?`<details class="gi-sign-combinations"><summary>표지상세</summary><div>${details.map(r=>detailButton(r,r.code+' '+r.name)).join('')}</div></details>`:'';
 return `<div class="gi-sign-card"><button type="button" data-ga-use="${e(u.id)}" ${u.partKey?`data-ga-artwork="${e(u.partKey)}"`:''} aria-pressed="${u.id===selected}" aria-label="${e(u.code+' '+u.name)}" ${u.mappingIssue?`title="${e(u.mappingIssue)}"`:''}>${src?`<img src="${src}" alt="" loading="lazy">`:''}${u.artworkURL?'':`<span>${e(u.code)}</span>`}${mappingBadge(u.mappingIssue)}</button><div class="gi-sign-actions">${detailLinks}${connections}</div></div>`;
}
export function detail(choice,s,cards){
 if(!choice)return '<section class="gi-workspace"><p class="sl-sub">검색 결과가 없습니다.</p><div class="ga-actions"><button type="button" class="sl-button" data-ga-import>기존 모델 불러오기</button><label class="sl-button">OBJ 추가<input type="file" data-ga-file accept=".obj" hidden></label></div></section>';
 const selected=choice.uses.find(u=>u.id===s.guideStandardsUI.assetUse)||choice.uses[0];
 s.guideStandardsUI.assetUse=selected?.id||'';
 return `<section class="gi-workspace ga-piece-workspace" aria-label="개별 판 정보"><header class="gi-heading"><strong>${e(title(choice).replace(' mm',''))} <small>mm</small></strong><span>1장</span></header><div class="gi-columns"><section class="gi-preview">${viewbar(s.guideStandardsUI.assetView||'front',choice.variant||'사각형','data-ga-view')}<div class="gi-occurrences" data-ga-occurrences hidden></div><div class="gi-model" data-ga-model><p class="sl-empty">모델을 불러오는 중…</p></div>${caption(selected)}<div class="gi-message" data-ga-preview-message role="status"></div></section><aside class="gi-details">${signSection(choice.uses.length,cards??choice.uses.map(u=>usage(u,s,selected?.id)).join(''))}<div class="ga-actions ga-asset-actions"><button type="button" class="sl-button" data-ga-import>기존 모델 불러오기</button><label class="sl-button">OBJ 추가<input type="file" data-ga-file accept=".obj" hidden></label></div></aside></div></section>`;
}
export const shell=()=>'<div data-guide-assets-library><p class="sl-sub">재사용 자료를 불러오는 중…</p></div>';
export async function mount(root,s,api,query='',context={}){
 const target=root.querySelector('[data-guide-assets-library]');if(!target)return;
 const state=s.guideStandardsUI;
 let assets=[],selected=state.assetSelection||'',family=state.assetFamily||'rectangles',issues=[],showUnused=false,drawToken=0;
 const draw=()=>{
  const token=++drawToken;
  const scrollTop=target.querySelector('.ga-catalog-scroll')?.scrollTop||0;
  const search=v=>v.toLowerCase().replace(/[\s,×x*]+/g,'');
  const rounded=n=>Math.round(Number(n||0)*10);
  const allRows=pieceGroups(assets,selected).filter(a=>showUnused||a.uses.length||a.common).filter(a=>search(`${title(a)} ${a.uses.map(u=>u.code+' '+u.name).join(' ')}`).includes(search(query))).sort((a,b)=>rounded(a.B)-rounded(b.B)||rounded(a.H)-rounded(b.H));
  const families=[['rectangles','사각형 판'],['arrows','화살표 판']].map(([key,label])=>({key,label,rows:allRows.filter(a=>pieceFamily(a)===key)}));
  const rows=families.find(f=>f.key===family).rows;
  const choice=rows.find(a=>a.key===selected)||rows[0];selected=choice?.key||'';
  state.assetFamily=family;state.assetSelection=selected;
  clear();
  const use=choice?.uses.find(u=>u.id===state.assetUse)||choice?.uses[0];
  const common=choice?(context.specs||[]).flatMap(p=>p.sources||[p]).find(p=>p.saved&&p.form?.model&&!p.ruleIds.length&&p.form.parts.length===1&&assets.some(a=>a.key===p.model&&a.parts?.some(part=>(choice.aliases||[choice.key]).includes(part.piece)))):null;
  const spec=(choice&&use?installationSpec(choice,assets,context.specs||[],use.id,state.assetSpec):null)||common;
  const cards=choice?.uses.length?'<p class="sl-sub">판 도안을 불러오는 중…</p>':'';
  let workspace;
  if(!spec){state.positionDraft=null;state.assetSpec='';}
  if(spec){
   state.assetUse=use?.id||'';state.assetSpec=spec.key;
   if((state.positionDraft?.displaySpec||state.positionDraft?.spec)!==spec.key)state.positionDraft=positions.draft(spec);
   if(use)positions.chooseSign(spec,state,use.id);
   const options={piece:choice,signSection:signSection(choice.uses.length,cards)};
   workspace={spec,options,html:positions.content(spec,state,context.posts,s.guidePostModels,options)};
  }
  target.innerHTML=`<div class="ga-library"><section class="ga-library-list"><header class="ga-list-heading"><strong>개별 판 <small>${allRows.length}개 규격 · mm</small></strong><label class="ga-unused"><input type="checkbox" data-ga-unused ${showUnused?'checked':''}>미사용 포함</label></header><nav class="ga-families" aria-label="개별 판 모양">${families.map(f=>`<button type="button" data-ga-family="${f.key}" aria-pressed="${f.key===family}">${f.label} <small>${f.rows.length}</small></button>`).join('')}</nav><p class="ga-message" role="status"></p><div class="ga-catalog-scroll" role="region" aria-label="판 규격 목록" tabindex="0"><div class="ga-cards">${rows.map(a=>`<button type="button" class="ga-card" data-ga-asset="${e(a.key)}" aria-pressed="${a.key===selected}">${e(title(a).replace(' mm',''))}<small>${a.variant&&a.variant!=='사각형'?e(a.variant)+' · ':''}${a.uses.length?a.uses.length+'개 표지':'미사용'}</small></button>`).join('')}</div></div></section><section class="ga-library-detail">${workspace?.html||detail(choice,s,cards)}</section></div>`;
  target.querySelector('.ga-catalog-scroll').scrollTop=scrollTop;
  if(issues.length)target.querySelector('.ga-message').innerHTML=`<details><summary>자동 분리하지 못한 원본 ${issues.length}개</summary>${issues.map(i=>`<p>${e(i.model)} · ${e(i.message)}</p>`).join('')}</details>`;
  if(workspace){installed=true;positions.mount(root,s,workspace.spec,context.posts,null,workspace.options);}
  else preview.mount(target.querySelector('.ga-library-detail'),s,api,choice,assets);
  if(choice?.uses.length)loadArtworks(choice,assets,s,api,()=>target.isConnected&&token===drawToken).then(result=>{
   if(!result||!target.isConnected||token!==drawToken)return;
   const section=target.querySelector('.gi-signs');if(!section)return;
   const selectedGroup=result.groups.find(g=>g.references.some(r=>r.use.id===state.assetUse&&(!state.assetPart||r.key===state.assetPart)))||result.groups[0];
   const buttons=result.groups.map(group=>{
    const current=group.references.find(r=>r.use.id===state.assetUse&&(!state.assetPart||r.key===state.assetPart))||group;
    const references=group.references.map(r=>r.use);
    const combinations=[...new Map(references.flatMap(u=>connectedCombinations(choice,assets,context.specs||[],u.id)).map(p=>[p.key,p])).values()];
    const mappingIssue=[...new Set(group.references.map(r=>r.mappingIssue).filter(Boolean))].join('\n');
    return usage({...current.use,artworkURL:group.image,partKey:current.key,mappingIssue},s,group===selectedGroup?current.use.id:'',combinations,references);
   }).join('');
   section.outerHTML=signSection(result.groups.length,buttons)+(result.missing.length?`<p class="sl-error">도안 연결 확인: ${e(result.missing.map(u=>u.code).join(', '))}</p>`:'');
  });
  if(common&&!state.panelCreation){
   const button=document.createElement('button');button.type='button';button.className='sl-button';button.textContent='규격 수정';
   target.querySelector('.gi-heading').append(button);
   button.addEventListener('click',()=>{
    if(target.querySelector('[data-layout-changed=true]')&&!window.confirm('적용하지 않은 변경을 취소할까요?'))return;
    const part=common.form.parts[0];state.panelCreation={...panelCreate.initial('piece'),id:common.key,shape:part.shape,B:part.B,H:part.H};draw();
   });
  }
  if(state.panelCreation){clear();target.querySelector('.ga-library-detail').innerHTML=panelCreate.content(state.panelCreation);panelCreate.mount(root,s,api);}
 };
 const refresh=async()=>{const result=await api('/api/guide-assets');assets=result.assets;issues=result.importReport?.issues||[];if(!assets.some(a=>a.kind==='piece'&&a.uses?.length))showUnused=true;if(target.isConnected)draw();};
 const run=async fn=>{target.setAttribute('aria-busy','true');try{await fn();}catch(err){if(target.isConnected){const p=target.querySelector('.ga-message');if(p)p.textContent=err.message;}}finally{target.removeAttribute('aria-busy');}};
 target.addEventListener('click',ev=>{
  const use=ev.target.closest('[data-ga-use]');
  if(use&&use.dataset.gaUse===state.assetUse&&(use.dataset.gaArtwork||'')===(state.assetPart||''))return;
  const category=ev.target.closest('[data-ga-family]'),asset=ev.target.closest('[data-ga-asset]');
  if((use||category||asset)&&(state.positionChanged||target.querySelector('[data-layout-changed=true]'))){
   if(!window.confirm('적용하지 않은 변경을 취소할까요?'))return;
   root.dispatchEvent(new window.CustomEvent('guide-edit-discard',{bubbles:true}));
  }
  if(use||category||asset)state.panelCreation=null;
  if(use){state.assetUse=use.dataset.gaUse;state.assetPart=use.dataset.gaArtwork||'';state.positionDraft=null;draw();return;}
  if(category){family=category.dataset.gaFamily;selected='';target.querySelector('.ga-catalog-scroll').scrollTop=0;draw();}
  if(asset){selected=asset.dataset.gaAsset;state.assetPart='';state.positionDraft=null;draw();}
  if(ev.target.closest('[data-ga-import]'))run(async()=>{target.querySelector('.ga-message').textContent='기존 OBJ에서 개별 판을 분리하고 중복을 확인합니다…';const result=await api('/api/guide-assets/import',{});await refresh();target.querySelector('.ga-message').textContent=`모델 ${result.imported}개 확인${result.issues.length?` · 자동 분리 불가 ${result.issues.length}개`:''}`;});
 });
 target.addEventListener('change',ev=>{if(ev.target.matches('[data-ga-unused]')){showUnused=ev.target.checked;draw();return;}run(async()=>{const file=ev.target.files?.[0];if(!file)return;const asset=await api('/api/guide-plate-upload?filename='+encodeURIComponent(file.name),file);await api('/api/guide-assets/split',{model:asset.key});showUnused=true;await refresh();});});
 try{await refresh();}catch(err){if(target.isConnected)target.innerHTML=`<p class="sl-error">${e(err.message)}</p>`;}
}
