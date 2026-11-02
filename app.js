/* 고속도로 표지 목록과 기존 저장 API 연결. 실패 시 편집값을 보존한다. */
import * as catalog from './catalog.js';
import {openHistory} from './sign-history.js';
import {edit} from './editors.js';
import {confirmDelete} from './delete-confirm.js';
import {showUploadHelp} from './obj-upload-help.js';
import {editWay} from './waydb-editor.js';
import * as wayDraft from './waydb-draft.js';
import {selectionFields,selectionEditor,selectionPayload,updateCategory} from './registration.js';
import * as posts from './support-manager.js';
import {supportRoad} from './catalog-supports.js';
import * as postDraft from './support-registration.js';
import * as placement from './placement.js';
import * as signFields from './sign-fields.js';
import * as master from './master.js';
import * as standardInstallation from './standard-installation.js';
import * as supportWorkbench from './support-workbench.js';
import * as installation from './installation-workbench.js';
import * as panelInstallation from './installation-panels.js';
import * as panelPages from './panel-pages.js';
import * as modelEditor from './support-model-editor.js';
import * as guideModel from './guide-model-preview.js';
import * as workspace from './model-workspace.js';
import * as plateShape from './plate-shape.js';
import * as autoQuantities from './quantity-auto.js';
import {editCell,finishCell} from './quantity-editor.js';
import * as camera from './model-camera.js';
import * as signPreview from './sign-preview.js';
import * as registrationPreview from './registration-preview.js';
import * as detailResize from './detail-resize.js';
import * as guides from './guides.js';
import * as guideRegistration from './guide-registration.js';
import * as guideStandards from './guide-standards.js';
import * as guidePosts from './guide-posts.js';
import {createApi} from './api.js';
import * as navigation from './navigation.js';

const app=document.querySelector('#app');
window.addEventListener('resize',()=>guideStandards.positionShapeMenu(app));
const s={section:'signs',postScope:'traffic',postRoad:'고속도로',postTab:'info',search:'',filter:'',quantityKind:'',quantityTarget:'',quantityView:'quantities',selected:'',detail:null,screen:'closed',copyId:''};
const api=createApi(s);
app.addEventListener('click',async ev=>{
 const quantities=ev.target.closest('[data-common-quantities-edit]');
 if(quantities&&!busy){const area=quantities.closest('.sl-support-quantities');area.dataset.quantityEditing='true';area.querySelectorAll('[data-quantity-edit]').forEach(b=>editCell(b,false));}
 if(ev.target.closest('[data-common-quantities-save]')&&!busy){ev.target.closest('form').requestSubmit();}
 if(ev.target.closest('[data-sign-history]')){
  if(busy||!leave())return;
  await openHistory(s,api,async(action,payload)=>{if(busy)throw Error('저장 중입니다.');lock(true);try{await commit(action,payload);}finally{lock(false);}},s.section==='guides'?s.guideSelected:s.selected);
 }
 const remove=ev.target.closest('[data-guide-post-remove]');
 if(remove&&!busy&&leave()&&confirm('이 표지의 지주 연결을 삭제할까요?')){
  lock(true);try{await commit('remove_guide_post_link',{id:s.guideSelected,rule:remove.dataset.guidePostRemove});}catch(err){error(err.message);}finally{lock(false);}
 }
});
app.addEventListener('post-quantities-save',async ev=>{
 const {payload,resolve,reject}=ev.detail;
 if(busy){reject(Error('저장 중입니다.'));return;}lock(true);
 try{await commit('save_quantities',payload);resolve();}catch(err){reject(err);}finally{lock(false);}
});
app.addEventListener('guide-model-replace',async ev=>{
 if(busy)return;lock(true);
 try{s.guideModelName='';await commit('update_guide',ev.detail);}catch(err){error(err.message);}finally{lock(false);}
});
app.addEventListener('guide-configuration-save',async ev=>{
 const {payload,resolve,reject}=ev.detail;
 if(busy){reject(new Error('저장 중입니다. 잠시 후 다시 시도하세요.'));return;}lock(true);
 try{s.guideModelName='';await commit('save_guide_configuration',payload);resolve();}catch(err){error(err.message);reject(err);}finally{lock(false);}
});
app.addEventListener('guide-position-save',async ev=>{
 const {payload,resolve,reject}=ev.detail;
 if(busy){reject(new Error('저장 중입니다.'));return;}lock(true);
 try{await commit('save_guide_sign_edits',payload);resolve();}catch(err){reject(err);}finally{lock(false);}
});
app.addEventListener('guide-configuration-cancel',()=>{
 if(busy)return;dirty=false;s.guideStandardsUI.positionDraft=null;s.guideStandardsUI.positionChanged=false;guideStandards.draw(app,s);
});
app.addEventListener('guide-post-add',async ev=>{
 const {payload,resolve,reject}=ev.detail;
 if(busy){reject(new Error('저장 중입니다. 잠시 후 다시 시도하세요.'));return;}lock(true);
 try{await commit('add_guide_post',payload);resolve();}catch(err){reject(err);}finally{lock(false);}
});
app.addEventListener('guide-edit-discard',()=>{dirty=false;s.guideStandardsUI.positionChanged=false;});
let busy=false,dirty=false,detailSequence=0,supportPreview=null,masterPreview=null;
const panel=()=>app.querySelector('.sl-workspace-controls,.sl-panel');
const directWorkspace=()=>['master','supports','installation'].includes(s.section);
const editing=()=>s.screen==='edit'||s.screen==='new'||!!panel()?.querySelector('.sl-inline-form');
const managingPosts=()=>['supports','installation','quantities'].includes(s.section);
const independent=()=>s.section==='quantities';
const managingMaster=()=>s.section==='master';
const inMaster=()=>managingMaster()||managingPosts()||guideStandards.active(s);
const views=()=>managingPosts()?posts:catalog;
const detailPath=id=>`/api/${managingPosts()?'supports':'signs'}/${encodeURIComponent(id)}`;
function invalidatePreview(){supportPreview=null;const area=panel()?.querySelector('.sl-post-preview');if(area){area.hidden=true;panel().querySelector('[type=submit]').hidden=false;}}
function renderShell(){
 guideStandards.clear();
 detailResize.clear(app.querySelector('.sl-work'));
 if(guideStandards.active(s)){app.innerHTML=guideStandards.shell(s);guideStandards.mount(app,s,api);return;}
 app.innerHTML=catalog.shell(s);
 app.querySelector('.sl-head').insertAdjacentHTML('afterend',`<nav class="sl-main-tabs" aria-label="관리 대상">${(inMaster()?[['master','표지판'],['supports','지주']]:[['signs','교통표지'],['guides','안내표지']]).map(([key,label])=>`<button type="button" data-section="${key}" aria-pressed="${s.section===key}">${label}</button>`).join('')}</nav>`);
 if(inMaster())app.querySelector('.sl-back').dataset.section=s.mainSection||'signs';
 if(s.section==='guides'){
  app.querySelector('[data-action=new]').remove();
  app.querySelector('.sl-toolbar').outerHTML=guides.toolbar(s);guides.mount(app,s,api);status('');return;
 }
 if(managingPosts()){app.querySelector('.sl-toolbar').outerHTML=posts.toolbar(s);app.querySelector('[data-action=new]').textContent='지주 형식 추가';}
 if(s.section==='installation'){
  s.installationMode='panels';
  const toolbar=app.querySelector('.sl-toolbar');
  if(panelInstallation.active(s))toolbar.innerHTML=panelInstallation.displayToggle(s);
  toolbar.insertAdjacentHTML('afterbegin',placement.modeChoices('data-installation-mode'));
 }
 if(managingMaster()){app.querySelector('.sl-filters').remove();const search=app.querySelector('.sl-search');search.placeholder='모양 · 크기 검색';search.setAttribute('aria-label','표지판 규격 검색');app.querySelector('[data-action=new]').textContent='표지판 신규등록';}
 app.querySelector('.sl-toolbar').append(app.querySelector('[data-action=new]'));
 if(managingMaster()||s.section==='supports'){
  const toolbar=app.querySelector('.sl-toolbar');
  app.querySelector('#sign-library-screen').classList.add('sl-compact-common');
  app.querySelector('.sl-main-tabs').append(...toolbar.children);toolbar.hidden=true;
 }
 app.querySelector('.sl-grid').classList.toggle('sl-master-grid',inMaster());
 app.querySelector('.sl-work').classList.toggle('sl-master-work',inMaster());
 app.querySelector('.sl-work').classList.toggle('sl-post-work',managingPosts());
 app.querySelector('.sl-work').classList.toggle('sl-installation-work',s.section==='installation');
 app.querySelector('.sl-work').classList.toggle('sl-quantities-work',s.section==='quantities');
 if(independent()||s.section==='installation')app.querySelector('[data-action=new]').hidden=true;
 app.querySelector('.sl-panel').setAttribute('aria-label',managingMaster()?'표지판 모양 정보':managingPosts()?'지주·기초 상세':'표지판 상세');
 app.querySelector('.sl-grid').setAttribute('aria-label',managingMaster()?'공통 규격 목록':managingPosts()?'지주 목록':'표지판 목록');
 if(directWorkspace()){app.querySelector('.sl-work').classList.add(s.section==='installation'?'sl-direct-work':'sl-common-work');app.querySelector('.sl-panel').className='sl-workspace-controls';}
 status('');
}
function status(message){const el=app.querySelector('.sl-status');if(el)el.textContent=message;}
function error(message){const el=app.querySelector('.gp-error')||panel()?.querySelector('.sl-error')||app.querySelector('.sl-guide-detail .sl-error')||app.querySelector('.startup-error p');if(el){el.textContent=message;el.hidden=false;}else status(message);}
function drawGrid(){
  if(guideStandards.active(s)){guideStandards.draw(app,s);return;}
  if(s.section==='guides'){if(app.querySelector('.sl-guide-list'))guides.drawList(app,s);return;}
  if(panelInstallation.active(s)){app.querySelector('.sl-installation-toggle').outerHTML=panelInstallation.displayToggle(s);app.querySelector('.sl-grid').innerHTML=panelInstallation.grid(s);panelInstallation.draw(app,s);return;}
  if(managingMaster()){
    const top=app.querySelector('.sl-master-list')?.scrollTop||0;
    app.querySelector('.sl-grid').innerHTML=master.grid(s);master.draw(app,s,panel()?.querySelector('.sl-master-form'));const list=app.querySelector('.sl-master-list');if(list)list.scrollTop=top;return;
  }
  if(managingPosts()){
    if(independent()&&s.screen==='closed'){app.querySelector('.sl-grid').innerHTML=posts.grid(s);return;}
    app.querySelector('.sl-grid').innerHTML=supportWorkbench.grid(s);supportWorkbench.draw(app,s,panel()?.querySelector('.sl-post-form'));autoQuantities.render(app,s);
    app.querySelectorAll('[data-post-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.postScope===s.postScope)));return;
  }
  const rows=catalog.matchingRecords(s);
  app.querySelector('.sl-grid').innerHTML=catalog.grid(s,rows);
  app.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===s.filter)));
}
function show(content,keepPreview=false){const preview=keepPreview?panel().querySelector('[data-sign-preview]'):null;panel().hidden=false;app.querySelector('.sl-work').classList.add('sl-open');panel().innerHTML=content;if(s.section==='signs'){detailResize.mount(app.querySelector('.sl-work'));if(preview)panel().querySelector('[data-sign-preview]')?.replaceWith(preview);else if(s.screen!=='new'&&s.detail)signPreview.load(app,s,api);}}
function syncWorkspaceEdits(reset=false){
 if(!directWorkspace())return;
 const forms=[...app.querySelectorAll('.sl-canvas-form,[data-panel-installation-form]')];
 if(reset)forms.forEach(workspace.rememberForm);
 const changed=!!s.supportUpload&&managingPosts()||managingMaster()&&master.allRows(panel()).some(row=>master.changed(row,s))||forms.some(workspace.formChanged),fresh=s.screen==='new'||forms.some(form=>form.dataset.mode==='size');
 dirty=changed||(fresh&&dirty);
 for(const footer of app.querySelectorAll('.sl-canvas-form>.sl-footer,.sl-panel-installation-footer')){
  const show=fresh||changed||!!footer.querySelector('.sl-error:not([hidden])');
  const save=footer.querySelector('[data-workspace-save]');if(save)save.hidden=!show;
  footer.hidden=!show&&!footer.querySelector('[data-action="master-delete"]');
 }
 app.querySelector('.sl-work')?.classList.toggle('sl-workspace-dirty',fresh||changed);
}
function beginMaster(name='',size='',mode=name?'edit':'shape'){
  if(!leave())return;++detailSequence;dirty=false;masterPreview=null;s.screen=name?'edit':'new';status('');
  s.standardUpload='';s.standardDraftModel=null;s.standardModel=null;s.standardPositionModel=null;
  s.plateView='front';
  if(name){s.masterName=name;s.masterSize=size;}
  show(master.form(s,name,size,mode));const form=panel().querySelector('form');master.update(form,s,'name');
  drawGrid();syncWorkspaceEdits(true);master.loadSupport(app,s,master.active(form),api);
  selectMasterRow(master.active(form));

}
function selectMasterRow(row){
 if(!row)return;master.activate(app,s,row);master.loadSupport(app,s,row,api);
 const form=master.outer(row),name=form.elements.name.value,size=row.elements.size.value,state=master.draft(row);
 const file=master.rows({...s,search:''}).find(r=>r.shape===name&&r.name===size)?.files.find(f=>f['확인상태']==='OBJ 업로드');
 if(!file||state.model||state.loading||state.upload)return;
 state.loading=true;
 api('/api/standard-model?'+new URLSearchParams({name,size})).then(model=>{state.model=model;if(row.isConnected&&master.active(form)===row)master.draw(app,s,row);}).catch(err=>{if(row.isConnected)error(err.message);}).finally(()=>state.loading=false);
}
function focusMasterAxis(axis,target){
 if(busy)return;
 const row=target?.closest('[data-master-row]')||master.active(panel());
 const input=row?.elements[axis];
 if(input&&input.dataset.derived!=='true'){selectMasterRow(row);workspace.editDimension(app,target||input,input);}
}
function focusStandardAxis(target){
 if(busy)return;
 focusStandardPosition(master.active(panel()),{axis:target.dataset.standardMeasure});
}
function focusStandardPosition(row,options){
 if(busy||!row)return;
 selectMasterRow(row);
 const key=options?.key||standardInstallation.selected(row)?.key;
 const target=[...row.querySelectorAll('[data-standard-position]')].find(item=>item.dataset.standardPosition===key||JSON.parse(item.dataset.members).some(m=>m.key===key));
 if(target){
  standardInstallation.update(row,target.dataset.standardPosition);
  const axes=[...target.querySelectorAll(`[data-standard-axis="${options?.axis||'z'}"]`)];
  (axes.find(input=>!input.dataset.standardMembers||JSON.parse(input.dataset.standardMembers).includes(key))||axes[0])?.focus();
 }
}
function invalidateMaster(){masterPreview=null;const form=panel()?.querySelector('.sl-master-form');if(form){form.querySelectorAll('.sl-master-preview').forEach(el=>el.hidden=true);form.querySelector('.sl-error').hidden=true;form.querySelector('[type=submit]').hidden=false;}}
let standardTimer=null,standardSequence=0;
async function refreshStandardConnections(form){
 if(form.dataset.mode==='edit')return;
 const values=master.values(form),geometry=master.rowGeometry(form,s);
 const request={geometry,size:values.size,width:values.width,height:values.height};
 const signature=JSON.stringify(request);if(form.dataset.connectionRequest===signature)return;
 form.dataset.connectionRequest=signature;form.dataset.connectionsPending='true';
 master.outer(form).querySelector('[type=submit]').disabled=true;
 if(!(Number(values.width)>0&&Number(values.height)>0)){form.dataset.connectionsPending='false';master.update(form,s);return;}
 try{
  const result=await api('/api/standard-template',request);
  if(!form.isConnected||form.dataset.connectionRequest!==signature)return;
  const option=s.registrationOptions.find(o=>o.name===(master.outer(form).dataset.copyName||result.name));
  const key=JSON.stringify([option?.name||geometry,values.size]);
  if(form.dataset.connectionTemplate!==key){
   form.dataset.connectionTemplate=key;
   form.querySelector('[data-standard-connections]').innerHTML=standardInstallation.view(s,option||{name:'',shape:`다각형${geometry.sides}`,manualPlacement:true},{name:values.size},true);
  }
  form.dataset.connectionsPending='false';master.update(form,s);if(master.active(panel())===form)master.loadSupport(app,s,form,api);
  refreshStandardImpact(form);
 }catch(err){if(form.isConnected&&form.dataset.connectionRequest===signature){delete form.dataset.connectionRequest;form.dataset.connectionsPending='false';master.update(form,s);error(err.message);}}
}
function refreshStandardImpact(form){
 refreshStandardConnections(form);
 clearTimeout(standardTimer);const sequence=++standardSequence;
 if(!master.started(form)||!dirty||form.dataset.connectionsPending==='true'||master.validation(master.outer(form),s,form))return;
 standardTimer=setTimeout(async()=>{
  try{
   const result=await api('/api/standard-preview',{revision:s.revision,payload:master.payload(form,s)});
   if(sequence!==standardSequence||!form.isConnected)return;
   const area=form.querySelector('.sl-master-preview');
   area.innerHTML=result.before?`<details class="sl-standard-impact"><summary>함께 변경되는 조합 ${result.config_count}개 · 표지판 ${result.affected.length}개</summary><div>${result.affected.map(r=>catalog.e(r.code+' '+r.name)).join(' · ')||'연결된 표지판 없음'}</div></details>`:'';
   area.hidden=!result.before;
  }catch(err){if(sequence===standardSequence&&form.isConnected)error(err.message);}
 },250);
}
let installationTimer=null,installationSequence=0;
let modelSequence=0;
function refreshInstallation(){
 clearTimeout(installationTimer);const sequence=++installationSequence;
 if(s.section!=='installation'||s.installationMode==='site')return;
 const body=installation.request(s,panel()?.querySelector('form'));if(!body)return;
 installationTimer=setTimeout(async()=>{
  try{const result=await api('/api/placement-preview',body);if(sequence!==installationSequence||s.section!=='installation')return;s.installationResult=result;drawModel();}
  catch(err){if(sequence===installationSequence&&s.section==='installation'){s.installationResult={complete:false,message:err.message};drawModel();}}
 },140);
}
let rotation=null,cameraFrame=0;
function drawModel(){if(s.section==='guides'){guideModel.draw(app,s);return;}if(guideStandards.active(s)){guideStandards.drawModel(app,s);return;}if(panelInstallation.active(s)){panelInstallation.draw(app,s);return;}if(s.section==='signs'){signPreview.draw(app,s);return;}if(managingPosts()){supportWorkbench.draw(app,s,panel()?.querySelector('.sl-post-form'));autoQuantities.render(app,s);}else master.draw(app,s,panel()?.querySelector('.sl-master-form'));}
const cameraKey=()=>s.section==='guides'?'guideSignCamera':guideStandards.active(s)?(['panels','pieces'].includes(s.guideStandardsUI.tab)?'guidePositionCamera':'guidePostCamera'):s.section==='signs'?'signCamera':managingPosts()?'postCamera':'plateCamera';
const redrawCamera=()=>{if(!cameraFrame)cameraFrame=requestAnimationFrame(()=>{cameraFrame=0;drawModel();});};
function cameraAction(action){const key=cameraKey(),current=s[key]||camera.initial();s[key]=['orbit','pan'].includes(action)?{...current,mode:action}:action==='fit'?camera.initial():camera.zoom(current,action==='in'?1.25:.8);redrawCamera();}
app.addEventListener('pointerdown',ev=>{
 if(busy)return;
 const canvas=ev.target.closest('.sl-solid-canvas');if(!canvas||![0,1,2].includes(ev.button))return;
 const key=cameraKey(),box=canvas.getBoundingClientRect();
 rotation={key,x:ev.clientX,y:ev.clientY,camera:s[key]||camera.initial(),scale:camera.position(box,ev.clientX,ev.clientY).scale,pan:ev.button!==0||ev.shiftKey||s[key]?.mode==='pan'};
 ev.preventDefault();app.setPointerCapture(ev.pointerId);
});
app.addEventListener('pointermove',ev=>{
 if(!rotation)return;
 const dx=ev.clientX-rotation.x,dy=ev.clientY-rotation.y;
 if(rotation.key==='guideSignCamera'&&!rotation.pan&&Math.hypot(dx,dy)>4&&s.guideViewer)s.guideViewer.view='3d';
 s[rotation.key]=rotation.pan?camera.pan(rotation.camera,dx/rotation.scale,dy/rotation.scale):camera.orbit(rotation.camera,dx,dy);
 redrawCamera();
});
app.addEventListener('pointerup',ev=>{if(s.section==='guides')guideModel.pick(app,s,ev,rotation);rotation=null;});
app.addEventListener('pointercancel',()=>{rotation=null;});
document.addEventListener('wheel',ev=>{
 if(ev.target.matches('input[type=number]')){ev.preventDefault();return;}
 const canvas=ev.target.closest('.sl-solid-canvas');if(!canvas||busy)return;
 ev.preventDefault();const key=cameraKey(),point=camera.position(canvas.getBoundingClientRect(),ev.clientX,ev.clientY).point;
 const delta=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?380:1);
 s[key]=camera.zoom(s[key]||camera.initial(),Math.exp(-Math.max(-300,Math.min(300,delta))*.002),point);redrawCamera();
},{passive:false});
app.addEventListener('contextmenu',ev=>{if(ev.target.closest('.sl-solid-canvas'))ev.preventDefault();});
app.addEventListener('keydown',ev=>{
 if(!ev.target.matches('.sl-solid-canvas')||busy)return;
 if(['+','=','-','0','Home'].includes(ev.key)){ev.preventDefault();cameraAction(['0','Home'].includes(ev.key)?'fit':ev.key==='-'?'out':'in');}
});
app.addEventListener('invalid',ev=>{panelPages.reveal(ev.target);workspace.reveal(ev.target);},true);
function inlineEdit(target){
  if(busy||managingPosts()||!s.detail||!target||!leave())return;
  cancelInline();
  const button=panel().querySelector(`[data-sign-field="${target.dataset.signField}"]`);
  button.parentElement.innerHTML=target.dataset.signField==='registration'?selectionEditor(s):signFields.editor(s.detail.sign,target.dataset.signField);
  const input=panel().querySelector('.sl-inline-form [name=value],.sl-inline-form [name=registration_shape]:checked,.sl-inline-form [name=registration_shape]');input?.focus();input?.select?.();
}
function cancelInline(){
 const form=panel()?.querySelector('.sl-inline-form');dirty=false;if(!form)return;
 const key=form.dataset.field;
 if(key==='registration'){show(catalog.view(s),true);return;}
 form.outerHTML=signFields.fieldValue(s.detail.sign,key);
 panel().querySelector(`[data-sign-field="${key}"]`)?.focus({preventScroll:true});
}
function leave(){return !(dirty||app.querySelector('[data-layout-changed=true],[data-guide-asset-editor][data-changed=true]'))||confirm('저장하지 않은 내용을 버릴까요?');}
async function openPanelInstallation(){
 const sequence=++detailSequence;dirty=false;s.screen='view';s.detail=null;s.panelInstallations=[];s.panelInstallationError='';
 panel().hidden=true;panel().innerHTML='';app.querySelector('.sl-work').classList.remove('sl-open');drawGrid();
 try{
  const items=await Promise.all(panelInstallation.sources(s).map(async post=>{
   const id=post['지주기초ID'],[detail,model]=await Promise.all([api('/api/supports/'+encodeURIComponent(id)+'/placement'),api('/api/supports/'+encodeURIComponent(id)+'/model').catch(err=>({available:false,message:err.message}))]);
   return {key:post['기준형식']||post['회사모델코드'],detail,model};
  }));
  if(sequence!==detailSequence)return;
  for(const item of items)if(item.key==='HW_SinglePost_TS1')item.detail.placement.results=panelInstallation.commonCombinations(s);
  s.panelInstallations=items;drawGrid();syncWorkspaceEdits(true);
 }catch(err){if(sequence!==detailSequence)return;s.panelInstallationError=err.message;drawGrid();}
}
async function openWorkspace(){
 if(panelInstallation.active(s)){await openPanelInstallation();return;}
 const first=posts.records(s)[0];if(first)await open(first['지주기초ID']);
}
async function refreshPanelInstallation(form){
 const item=s.panelInstallations.find(p=>p.key===form.dataset.panelInstallationForm);if(!item)return;
 const {row}=installation.selection({...s,detail:item.detail,installationChoice:item.choice||{}});if(!row)return;
 const sequence=item.previewSequence=(item.previewSequence||0)+1;
 try{
  const result=await api('/api/placement-preview',{rule:placement.payload(form),choice:{size:row.size,pattern:row.pattern,names:(row.sourcePanels||row.panels).map(p=>p.name)}});
  if(sequence!==item.previewSequence||!form.isConnected)return;item.preview=result;panelInstallation.draw(app,s);
 }catch(err){if(sequence!==item.previewSequence||!form.isConnected)return;item.preview={complete:false,message:err.message};panelInstallation.draw(app,s);}
}
function close(){++detailSequence;s.screen='closed';dirty=false;supportPreview=null;panel().hidden=true;panel().innerHTML='';app.querySelector('.sl-work').classList.remove('sl-open');drawGrid();app.querySelector(`[${managingPosts()?'data-master-post':'data-sign'}="${s.selected}"]`)?.focus({preventScroll:true});}
async function open(id){
  if(s.section==='supports'){const post=s.tables.supports.find(p=>p['지주기초ID']===id);if(post)s.postRoad=supportRoad(post);}
  s.signPreviewChoice=null;s.signModelKey='';s.signCamera={...camera.initial(),yaw:-.18,pitch:-.08};
  s.supportDraftModel=null;s.supportUpload='';s.modelSource='';++modelSequence;
  const seq=++detailSequence;s.selected=id;s.screen='view';s.detail=null;s.supportModel=null;s.quantityKind='';s.quantityTarget='';s.quantityView='quantities';s.postTab='info';s.installationChoice={};s.installationResult=null;if(s.section!=='installation')s.installationMode='panels';++installationSequence;dirty=false;supportPreview=null;
  show(s.section==='supports'?'':'<p class="sl-empty">정보를 불러오는 중입니다…</p>');drawGrid();
  try{const [detail,model]=await Promise.all([api(detailPath(id)),managingPosts()?api('/api/supports/'+encodeURIComponent(id)+'/model').catch(err=>({available:false,message:err.message})):null]);if(seq!==detailSequence)return;s.detail=detail;s.supportModel=model;if(managingPosts()&&s.section!=='quantities')begin();else show(views().view(s));panel().querySelector('[data-action=edit]')?.focus({preventScroll:true});}
  catch(err){if(seq!==detailSequence)return;show(`<div class="sl-body"><p class="sl-error">${catalog.e(err.message)}</p><button class="sl-button" data-action="close">닫기</button></div>`);}
}
async function load(){
  const result=await api('/api/library');Object.assign(s,result);s.screen='closed';s.detail=null;dirty=false;supportPreview=null;++detailSequence;renderShell();drawGrid();
  if(managingPosts()&&directWorkspace())await openWorkspace();
  else await openFirstSign();
}
async function openFirstSign(){
 if(managingMaster()){
  const selected=master.selection(s);if(selected.option)beginMaster(selected.option.name,selected.spec.name);
 }else if(s.section==='signs'){
  const first=catalog.matchingRecords(s)[0];if(first)await open(first['표지ID']);
 }else if(s.section==='guides'&&!s.guideSelected&&!s.guideNew){
  const first=guides.records(s)[0];if(first)openGuide(first['안내표지ID']);
 }
}
async function commit(action,payload,preserveForm=false){
  const metadataOnly=action==='save_catalog_sign'&&payload.id===s.selected&&!payload.registration&&Object.keys(payload.fields||{}).every(key=>['명칭','레이어변수'].includes(key));
  const result=await api('/api/mutate',{revision:s.revision,action,payload});
  Object.assign(s,result);
  if(action==='restore_sign_change'){
   dirty=false;s.guideModelName='';s.signModelKey='';
   if(s.section==='guides'){
    if(!s.tables.guidesigns.some(r=>r['안내표지ID']===s.guideSelected))s.guideSelected='';
    guides.drawList(app,s);guides.drawDetail(app,s,api);
   }else if(s.tables.signs.some(r=>r['표지ID']===s.selected)){await open(s.selected);}
   else{s.selected='';s.detail=null;close();drawGrid();}
   status('변경 전 값으로 복원하고 재조회했습니다.');return;
  }
  if(action==='remove_guide_post_link'){dirty=false;s.guideModelName='';s.guideModelRule='';guides.drawDetail(app,s,api);status('지주 연결을 삭제했습니다.');return;}
  if(['save_guide_sign_position','save_guide_sign_edits'].includes(action)){dirty=false;s.guideModelName='';s.guideModelRule=result.result.rule_id;guides.drawList(app,s);guides.drawDetail(app,s,api);status('선택한 표지의 설치위치를 저장했습니다.');return;}
  if(action==='add_guide_post'){dirty=false;s.guideModelName='';s.guideModelRule=result.result.rule_id;guides.drawDetail(app,s,api);status('같은 적용 조건에 지주를 추가했습니다.');return;}
  if(action==='create_common_guide_panel'){
   dirty=false;const ui=s.guideStandardsUI;ui.panelCreation=null;ui.query='';ui.positionDraft=null;ui.positionSelected='';ui.drawingKey=null;
   if(result.result.piece){ui.tab='pieces';ui.piecePosition=false;ui.assetSelection=result.result.piece;ui.assetFamily=payload.shape==='rectangle'?'rectangles':'arrows';}
   else{ui.tab='panels';ui.spec=result.result.selected_id;}
   guideStandards.draw(app,s);status(result.unchanged?'같은 규격이 있어 기존 판을 선택했습니다.':payload.id?'변경한 판을 적용했습니다.':'판을 등록했습니다.');return;
  }
  if(action==='save_guide_configuration'){dirty=false;s.guideModelName='';s.guideModelRule=result.result.rule_id;if(guideStandards.active(s)){if(s.guideStandardsUI.tab==='pieces'&&!s.guideStandardsUI.piecePosition)s.guideStandardsUI.assetSpec=result.result.spec_id;else guideStandards.change(s,'spec-link',result.result.spec_id);Object.assign(s.guideStandardsUI,{spec:result.result.spec_id,positionSelected:result.result.position_id,positionDraft:null,positionChanged:false});guideStandards.draw(app,s);}else guides.drawDetail(app,s,api);status('변경한 판·설치위치를 적용했습니다.');return;}
  if(['save_guide_position','delete_guide_position'].includes(action)){dirty=false;s.guideStandardsUI.spec=result.result.selected_id;s.guideStandardsUI.positionDraft=null;s.guideStandardsUI.positionSelected=result.result.position_id;s.guideStandardsUI.positionChanged=false;guideStandards.draw(app,s);status('공용 설치 위치와 연결 표지를 저장했습니다.');return;}
  if(action==='save_quantities'&&guideStandards.active(s)){dirty=false;guideStandards.draw(app,s);status('지주 수량을 저장했습니다.');return;}
  if(action==='create_guide'){dirty=false;s.guideRegistrationDraft=null;s.guideRoad=payload.road;s.search='';s.guideFilter='';s.guideNew=false;s.guideSelected=result.result.selected_id;s.guideModelName='';s.guideHidePost=false;renderShell();status('안내표지 등록·재조회를 확인했습니다.');return;}
  if(['save_guide_post','save_guide_post_y','delete_guide_post'].includes(action)){dirty=false;s.guideStandardsUI.postEditor=null;s.guideStandardsUI.postTool='';s.guideStandardsUI.query='';s.guideStandardsUI.selected=result.result.selected_id;guideStandards.draw(app,s);status(action==='delete_guide_post'?'지주를 삭제했습니다.':'지주 저장·재조회를 확인했습니다.');return;}
  if(['save_guide_panel','delete_guide_panel'].includes(action)){dirty=false;s.guideStandardsUI.editor=null;s.guideStandardsUI.axis='';s.guideStandardsUI.shapeMenu=false;s.guideStandardsUI.query='';s.guideStandardsUI.spec=result.result.selected_id;guideStandards.draw(app,s);app.querySelector('.gs-spec-row[aria-pressed=true],.gc-family-row[aria-pressed=true]')?.scrollIntoView({block:'nearest'});status(result.unchanged?'변경된 값이 없습니다.':action==='delete_guide_panel'?'규격을 삭제했습니다.':'공용 규격과 연결 표지의 저장·재조회를 확인했습니다.');return;}
  if(!metadataOnly)s.signModelKey='';
  if(action==='update_guide'){dirty=false;if(['도로구분','연결지주','판OBJ'].includes(payload.field)){s.guideModelName='';s.guideHidePost=false;}if(guideStandards.active(s))guideStandards.draw(app,s);else{if(payload.field==='도로구분'){s.guideRoad=payload.value;s.guideFilter='';renderShell();}else{guides.drawList(app,s);guides.drawDetail(app,s,api);}}status(result.unchanged?'변경된 값이 없습니다.':s.mode==='test'?'복사 데이터 저장·재조회 확인':'구글시트 저장·재조회 확인');return;}
  if(action==='delete_standard'){dirty=false;masterPreview=null;s.masterName='';s.masterSize='';close();status('선택한 판을 삭제했습니다.');return;}
  if(managingMaster()){dirty=false;masterPreview=null;s.masterName=payload.name;s.masterSize=payload.size;close();beginMaster(payload.name,payload.size);status(s.mode==='test'?'복사 데이터 저장·재조회 확인':'구글시트 저장·재조회 확인');return;}
  if(action==='delete_catalog_sign'){s.selected='';s.detail=null;close();}
  else{
    const id=(managingPosts()?result.result?.selected_support_id:result.result?.selected_id)||s.selected;
    s.selected=id;
    try{
      if(metadataOnly)s.detail={...s.detail,sign:s.tables.signs.find(row=>row['표지ID']===id)};
      else{
        const [detail,model]=await Promise.all([api(detailPath(id)),managingPosts()?api('/api/supports/'+encodeURIComponent(id)+'/model').catch(err=>({available:false,message:err.message})):null]);
        s.detail=detail;if(managingPosts())s.supportModel=model;
      }
    }
    catch{
      if(preserveForm){error('변경 사항은 저장됐습니다. 상세 재조회에 실패하여 입력 중인 기본정보는 그대로 두었습니다.');}
      else{dirty=false;s.screen='view';show('<div class="sl-body"><p class="sl-error">저장은 확인됐지만 상세 화면을 다시 불러오지 못했습니다.</p><button class="sl-button" data-action="reload">새로고침</button></div>');}
      status('저장은 확인됐습니다. 새로고침하여 상세를 다시 확인하세요.');return;
    }
    invalidatePreview();
    if(preserveForm){const target=panel().querySelector('.sl-related');if(target)target.innerHTML=views().related(s,editing());const specs=panel().querySelector('.sl-current-specs');if(specs)specs.innerHTML=catalog.dimensions(s.detail);}
    else{if(s.screen==='new'){s.copyId='';s.modelSource='';s.filter='';s.search='';if(managingPosts()&&!posts.traffic(s.detail.support))s.postScope='all';if(app.querySelector('.sl-search'))app.querySelector('.sl-search').value='';}dirty=false;s.screen='view';if(managingPosts()&&s.section!=='quantities')begin();else show(views().view(s),metadataOnly);}
    if(!managingPosts()||s.section==='quantities'||preserveForm)drawGrid();
  }
  status(result.unchanged?'변경된 값이 없습니다.':s.mode==='test'?'복사 데이터 저장·재조회 확인':'구글시트 저장·재조회 확인');
}
function begin(isNew=false,copy=false){
  if(managingPosts()&&!isNew)s.postRoad=supportRoad(s.detail.support);
  ++detailSequence;s.screen=isNew?'new':'edit';s.copyId=copy?s.selected:'';dirty=false;supportPreview=null;if(isNew)s.postTab='info';
  if(managingPosts()&&isNew){s.modelSource=copy?s.selected:'';s.postView='front';s.postSite='fill';if(!copy)s.supportModel=null;}
  s.wayDraft=[];s.signDraft=null;signPreview.clear();s.signModelKey='';s.signPreviewChoice=null;
  show(views().form(s,isNew,copy));panel().querySelector(managingPosts()?'[name=형식]:not([type=hidden])':'[name=code]')?.focus({preventScroll:true});
  const modelArea=panel().querySelector('[data-common-model]');if(modelArea)modelArea.innerHTML=supportWorkbench.viewport(s);
  if(managingPosts()){const number=panel().querySelector('[name=form_number]')?.closest('label');if(isNew&&directWorkspace()&&number)panel().querySelector('.sl-support-identity').append(number);s.supportDraftModel=null;s.supportUpload='';++modelSequence;modelEditor.fields(panel().querySelector('form'),s.supportModel);if(directWorkspace())panel().querySelectorAll('.sl-canvas-tool').forEach(tool=>{if(!isNew||copy)tool.open=false;});postDraft.update(panel().querySelector('form'),s);if(s.section==='installation')placement.setMode(panel().querySelector('form'));drawGrid();if(s.section==='installation')refreshInstallation();}
  else{const form=panel().querySelector('form');updateCategory(form,s.registrationOptions);registrationPreview.refresh(app,s,api);}
  syncWorkspaceEdits(true);
}
function lock(value){busy=value;app.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=value||el.hasAttribute('data-gsi-auto'));const inline=panel()?.querySelector('.sl-inline-field');if(inline){inline.setAttribute('aria-busy',String(value));inline.querySelector('.sl-inline-saving').hidden=!value;inline.querySelectorAll('button').forEach(b=>b.hidden=value);}if(!value&&panelInstallation.active(s))panelInstallation.validate(app);if(!value&&managingPosts()&&editing())postDraft.update(panel().querySelector('form'),s);const form=panel()?.querySelector('.sl-master-form');if(!value&&form)master.update(form,s);if(!value&&guideStandards.active(s))guideStandards.syncControls(app,s);if(!value){guideRegistration.syncControls(app,s);registrationPreview.syncFile(panel()?.querySelector('[data-cad-upload]'));syncWorkspaceEdits();}}
app.addEventListener('input',ev=>{
 if(ev.target.closest('.gp-editor')){dirty=true;return;}
 if(ev.target.closest('.gc-axis-form')){dirty=true;guideStandards.previewEdit(app,s,ev.target.closest('form'));return;}
 const form=ev.target.closest('[data-panel-installation-form]');if(!form||ev.target.matches('[data-assembly-choice]'))return;
 dirty=true;panelInstallation.draw(app,s);if(s.installationDisplay==='assembly')refreshPanelInstallation(form);
});
function editMaster(target){
 const parent=target.closest('.sl-master-form');if(!parent||target.type==='file')return;
 const row=target.closest('[data-master-row]');if(row){standardInstallation.sync(target,row);if(target.matches('[data-standard-axis]'))s.plateView=target.dataset.standardAxis==='y'?'top':'front';selectMasterRow(row);}
 invalidateMaster();dirty=master.update(parent,s);
 for(const item of row?[row]:master.allRows(parent))if(item.dataset.enabled!=='false')refreshStandardImpact(item);
}
app.addEventListener('input',ev=>editMaster(ev.target));
app.addEventListener('focusin',ev=>{
 if(!busy&&supportWorkbench.selectRoad(app,s,ev.target))return;
 const row=ev.target.closest('[data-master-row]');if(busy||!row||row.dataset.enabled==='false')return;
 const coordinate=ev.target.matches('[data-standard-axis]');
 if(coordinate){standardInstallation.sync(ev.target,row);s.plateView=ev.target.dataset.standardAxis==='y'?'top':'front';}
 if(coordinate||master.active(panel())!==row)selectMasterRow(row);
});
app.addEventListener('invalid',ev=>{
 const row=ev.target.closest('[data-master-row]');if(!row)return;
 if(ev.target.matches('[data-standard-axis]'))standardInstallation.update(row,ev.target.closest('[data-standard-position]').dataset.standardPosition);
 s.plateView='front';selectMasterRow(row);
},true);
app.addEventListener('input',ev=>{if(ev.target.closest('.sl-position-calculator')||ev.target.matches('[data-assembly-choice]'))return;if(ev.target.matches('.sl-search')){s.search=ev.target.value;drawGrid();}if(ev.target.closest('.sl-inline-form'))dirty=true;if(ev.target.closest('.sl-form')){dirty=true;invalidatePreview();if(managingPosts()){postDraft.update(ev.target.closest('form'),s);drawModel();if(s.section==='installation')refreshInstallation();}else{const form=ev.target.closest('form');if(ev.target.name==='code')updateCategory(form,s.registrationOptions);else signFields.updateCAD(form);registrationPreview.refresh(app,s,api);}}});
app.addEventListener('change',async ev=>{
 if(ev.target.matches('[data-common-road]')){
  s.postRoad=ev.target.value;const form=ev.target.closest('form');form.elements.form_road.value=s.postRoad;
  form.elements.form_number.value=Math.max(0,...s.supportForms.filter(f=>f.road===s.postRoad).map(f=>f.number||0))+1;
  form.querySelector('.sl-pattern-options').dataset.kind='';
  form.elements['형식'].dispatchEvent(new window.Event('change',{bubbles:true}));return;
 }
 if(ev.target.matches('[data-standard-upload]')){
  const file=ev.target.files[0],form=ev.target.closest('[data-master-row]');if(!file||busy)return;
  selectMasterRow(form);let uploaded=false;
  lock(true);try{
   const result=await api('/api/standard-upload?filename='+encodeURIComponent(file.name),file);
   Object.assign(master.draft(form),{upload:result.key,filename:result.filename,draftModel:result.model});
   for(const key of ['width','height','thickness'])form.elements[key].value=result[key];
   if(plateShape.applyDetected(master.outer(form),result.geometry,s.registrationOptions.flatMap(o=>[o.name,o.displayName].filter(Boolean)))&&!result.geometry)status('모양을 자동으로 읽지 못했습니다. 모양 종류와 꼭짓점을 선택하세요.');
   dirty=master.update(form,s);uploaded=true;
  }catch(err){error(err.message);}finally{ev.target.value='';lock(false);}
  // FormData는 잠긴 입력값을 제외하므로 잠금 해제 후 지주 목록을 조회한다.
  if(uploaded)for(const row of master.allRows(master.outer(form)))if(row.dataset.enabled!=='false')refreshStandardImpact(row);return;
 }
 if(ev.target.matches('[data-registration-cad-file]')){if(ev.target.closest('[data-guide-cad]'))return;registrationPreview.chooseFile(ev.target.closest('[data-cad-upload]'));if(ev.target.closest('.sl-registration'))dirty=true;return;}
 if(ev.target.closest('[data-shape-only]')&&ev.target.name==='registration_shape'){ev.target.form.requestSubmit();return;}
 if(ev.target.matches('[data-support-upload]')){
  const file=ev.target.files[0],form=ev.target.closest('form');if(!file||busy)return;
  lock(true);try{await modelEditor.upload(s,form,file,api);dirty=true;invalidatePreview();postDraft.update(form,s);drawModel();}catch(err){error(err.message);}finally{ev.target.value='';syncWorkspaceEdits();lock(false);}return;
 }

 if(ev.target.closest('.gp-editor')){
  if(busy)return;
  const form=ev.target.closest('form');
  if(ev.target.matches('[data-gp-upload]')){
   const file=ev.target.files[0],index=Number(ev.target.dataset.gpUpload);if(!file)return;
   guidePosts.read(s,form);
   lock(true);try{await guidePosts.upload(s,index,file);dirty=true;guideStandards.draw(app,s);}catch(err){error(err.message);}finally{lock(false);}return;
  }
  guidePosts.read(s,form);if(['models','kind','road'].includes(ev.target.name))guideStandards.draw(app,s);return;
 }
 if(guideStandards.active(s)&&ev.target.matches('select[data-gs-key]')){if(busy||!leave()){ev.target.value=s.guideStandardsUI[ev.target.dataset.gsKey];return;}dirty=false;guideStandards.change(s,ev.target.dataset.gsKey,ev.target.value);guideStandards.draw(app,s);return;}
 if(ev.target.matches('[data-guide-road]')){if(busy||!leave()){ev.target.value=s.guideRoad||'';return;}s.guideRoad=ev.target.value;s.guideFilter='';s.guideSelected='';s.guideNew=false;dirty=false;renderShell();return;}
 const panelForm=ev.target.closest('[data-panel-installation-form]');
 if(panelForm){
  if(ev.target.matches('[data-assembly-choice]')){
   const item=s.panelInstallations.find(p=>p.key===panelForm.dataset.panelInstallationForm);
   item.choice=Object.fromEntries([...panelForm.querySelectorAll('[data-assembly-choice]')].map(el=>[el.name==='assembly_group'?'group':el.name.slice(9),el.value]));
   item.preview=null;panelInstallation.draw(app,s);refreshPanelInstallation(panelForm);
  }
  return;
 }
 if(ev.target.matches('[data-post-road]')&&!busy){if(!leave()){ev.target.value=s.postRoad;return;}s.postRoad=ev.target.value;s.selected='';s.detail=null;s.screen='closed';s.search='';dirty=false;renderShell();drawGrid();const first=posts.records(s)[0];if(first)await open(first['지주기초ID']);return;}
 if(ev.target.closest('[data-new-quantities],[data-common-quantity-editor]'))postDraft.changeMaterial(ev.target);
 if(ev.target.name==='model_source'&&s.screen==='new'){const id=ev.target.value,sequence=++modelSequence;s.modelSource=id;s.supportDraftModel=null;s.supportUpload='';s.supportModel=null;modelEditor.fields(panel().querySelector('form'),null);lock(true);try{const model=id?await api('/api/supports/'+encodeURIComponent(id)+'/model'):null;if(sequence!==modelSequence)return;s.supportModel=model;const form=panel().querySelector('form'),source=s.tables.supports.find(p=>p['지주기초ID']===id);if(source)form.elements['단면규격'].value=source['단면규격'];modelEditor.fields(form,model);postDraft.refreshQuantities(form,s);postDraft.update(form,s);drawModel();dirty=true;}catch(err){error(err.message);}finally{lock(false);}return;}
 if(ev.target.name==='형식'&&s.screen==='new'){const source=panel().querySelector('[name=model_source]');source.innerHTML='<option value="">선택</option>'+posts.records({...s,postScope:'all',search:''}).filter(p=>supportRoad(p)===s.postRoad&&p['형식']===ev.target.value).map(p=>`<option value="${catalog.e(p['지주기초ID'])}">${catalog.e(supportWorkbench.title(p))} · ${catalog.e(p['단면규격'])}</option>`).join('');s.modelSource='';s.supportModel=null;s.supportDraftModel=null;s.supportUpload='';modelEditor.fields(panel().querySelector('form'),null);++modelSequence;}

 if(ev.target.matches('[data-assembly-choice]')){const area=app.querySelector('[data-installation-controls]');s.installationChoice=Object.fromEntries([...area.querySelectorAll('select')].map(el=>[el.name==='assembly_group'?'group':el.name.slice(9),el.value]));s.installationResult=null;drawModel();refreshInstallation();return;}
  const masterForm=ev.target.closest('.sl-master-form');if(masterForm){editMaster(ev.target);return;}
  const calculator=ev.target.closest('.sl-position-calculator');
  if(calculator){placement.changeCalculator(ev.target,calculator.dataset.positionContext==='preview'?s.placementPreview:s.detail?.placement);return;}
  if(ev.target.closest('.sl-form')){dirty=true;invalidatePreview();}
  if(ev.target.closest('.sl-inline-form'))dirty=true;
  if(managingPosts()&&ev.target.name==='기준형식'){const selected=s.supportForms.find(f=>f.key===ev.target.value);if(selected)panel().querySelector('[name=형식]').value=selected.kind;panel().querySelector('.sl-existing-form-summary').innerHTML=postDraft.formSummary(s,ev.target.value);}
  if(managingPosts()&&ev.target.closest('.sl-form')){postDraft.update(ev.target.closest('form'),s);drawModel();if(s.section==='installation')refreshInstallation();}
  const form=ev.target.closest('.sl-registration');
  if(form)signFields.updateCAD(form);
  if(!form||!['category','registration_shape'].includes(ev.target.name))return;
  const values=new FormData(form),shape=values.get('registration_shape')||'';
  const option=s.registrationOptions.find(o=>o.name===shape);
  const sizes=ev.target.name==='registration_shape'?(option?.specs||[]).map(p=>p.name):values.getAll('registration_sizes');
  form.querySelector('.sl-registration-selection').innerHTML=selectionFields(s.registrationOptions,values.get('category'),shape,sizes,form.classList.contains('sl-registration-flat'));
  panelPages.select(form,form.dataset.page||'shape');
  if(ev.target.name==='registration_shape')form.querySelector('[name=registration_shape]:checked')?.focus({preventScroll:true});
  registrationPreview.refresh(app,s,api);
});
app.addEventListener('submit',async ev=>{
  if(ev.target.matches('.gi-form')){ev.preventDefault();if(busy)return;lock(true);try{await commit('save_guide_position',s.guideStandardsUI.positionDraft);}catch(err){error(err.message);}finally{lock(false);}return;}
  if(ev.target.matches('.sl-guide-registration')){
   ev.preventDefault();if(busy)return;lock(true);
   try{await commit('create_guide',guideRegistration.payload(s.guideRegistrationDraft));}catch(err){error(err.message);}finally{lock(false);}return;
  }
  if(ev.target.matches('.gp-editor')){ev.preventDefault();app.querySelector('[data-gp-action="save"]')?.click();return;}
  if(ev.target.matches('.gc-axis-form')){ev.preventDefault();s.guideStandardsUI.axis='';guideStandards.draw(app,s);return;}
  if(ev.target.matches('.sl-guide-editor')){
    ev.preventDefault();if(busy)return;const payload=guides.payload(ev.target,s);lock(true);
    try{if(payload.field==='조건')await commit('save_guide_configuration',{id:payload.id,rules:payload.rules,model:payload.model,condition:payload.value});else await commit('update_guide',payload);}catch(err){error(err.message);}finally{lock(false);}return;
  }
  if(ev.target.matches('.sl-canvas-form,[data-panel-installation-form]')&&s.screen!=='new'&&!dirty){ev.preventDefault();return;}
  if(ev.target.matches('[data-panel-installation-form]')){ev.preventDefault();app.querySelector('[data-panel-installation-save]')?.click();return;}
  if(ev.target.matches('.sl-master-form')){
    ev.preventDefault();if(busy)return;
    const problem=master.validation(ev.target,s);
    if(problem){if(problem.row)selectMasterRow(problem.row);error(problem.message);if(problem.position)focusStandardPosition(problem.row,problem.position);else problem.field?.focus();return;}
    const entries=master.entries(ev.target,s);if(!entries.length)return;const payload={name:entries[0].name,size:master.active(ev.target).elements.size.value,entries};lock(true);
    try{await commit('save_standard_sizes',payload);}
    catch(err){error(err.message);}finally{lock(false);}return;
  }
  if(ev.target.matches('.sl-inline-form')){
    ev.preventDefault();if(busy)return;
    const values=new FormData(ev.target),selection=ev.target.dataset.field==='registration';
    if(selection&&values.get('registration_shape')===ev.target.dataset.initial){cancelInline();return;}
    try{
     const payload=selection?{fields:{명칭:s.detail.sign['명칭']},registration:selectionPayload(ev.target,s.registrationOptions)}:{fields:signFields.changes(s.detail.sign,ev.target.dataset.field,values.get('value'))};
     if(!selection&&Object.entries(payload.fields).every(([key,value])=>s.detail.sign[key]===value)){cancelInline();return;}
     lock(true);await commit('save_catalog_sign',{id:s.selected,...payload});
    }catch(err){error(err.message);}finally{lock(false);}return;
  }
  if(!ev.target.matches('.sl-form'))return;ev.preventDefault();if(busy)return;
  if(managingPosts()){
    if(!placement.validateForm(ev.target)){error('표시된 빈 항목을 입력하세요.');ev.target.querySelector('[aria-invalid=true]')?.focus();return;}
    if(s.section==='installation'&&s.installationMode==='site'){
      const site=placement.payload(ev.target).site;lock(true);
      try{await commit('save_site_placement',{id:s.selected,site});}catch(err){error(err.message);}finally{lock(false);}return;
    }
    const fields=posts.formFields(Object.fromEntries(new FormData(ev.target)));
    ++modelSequence;
    try{const payload={fields,...postDraft.payload(ev.target),...(s.supportUpload?{uploaded_model:s.supportUpload}:{}),...(s.screen==='new'?{copy_id:s.copyId,model_source:s.modelSource}:{id:s.selected})};if(s.screen!=='new'&&payload.quantity_edits?.length&&!confirm('변경한 단위수량을 저장할까요?'))return;lock(true);await commit('save_support',payload);}
    catch(err){error(err.message);}finally{lock(false);}return;
  }
  const values=Object.fromEntries(new FormData(ev.target)),fields=catalog.formFields(values);
  const modern=ev.target.classList.contains('sl-registration');
  if(modern)delete fields['형태코드'];
  try{
   const payload={fields,...(s.screen==='new'?{copy_id:s.copyId,way_rules:wayDraft.payload(s.wayDraft)}:{id:s.selected}),...(modern?{registration:selectionPayload(ev.target,s.registrationOptions)}:{})};
   lock(true);await commit('save_catalog_sign',payload);
  }catch(err){error(err.message);}finally{lock(false);}
});
function editGuideDimension(axis){
 if(busy)return;
 guideStandards.beginAxis(s,axis);guideStandards.draw(app,s);
 const input=app.querySelector('.gc-axis-form input');input?.focus();input?.select();
}
function openCommonSign(target){
 const id=target?.dataset.commonSignDetail||target?.dataset.gaUse||target?.dataset.giSign;
 if(!id||busy||!s.tables.guidesigns.some(g=>g['안내표지ID']===id)||!leave())return;
 dirty=false;s.section='guides';s.search='';s.guideFilter='';s.guidePart=-1;s.guideNew=false;s.guideSelected=id;renderShell();
}
app.addEventListener('dblclick',ev=>{if(guideStandards.active(s))openCommonSign(ev.target.closest('[data-ga-use],[data-gi-sign]'));});
app.addEventListener('click',ev=>{if(guideStandards.active(s))openCommonSign(ev.target.closest('[data-common-sign-detail]'));});
app.addEventListener('guide-common-panel-save',async ev=>{
 if(busy){ev.detail.reject(new Error('저장 중입니다. 잠시 후 다시 시도하세요.'));return;}lock(true);
 try{await commit('create_common_guide_panel',ev.detail.payload);ev.detail.resolve();}catch(err){ev.detail.reject(err);}finally{lock(false);}
});
app.addEventListener('guide-panel-create-cancel',()=>{s.guideStandardsUI.panelCreation=null;dirty=false;guideStandards.draw(app,s);});
app.addEventListener('keydown',ev=>{if(guideStandards.active(s)&&ev.key==='Enter'&&ev.target.matches('[data-ga-use],[data-gi-sign]')){ev.preventDefault();openCommonSign(ev.target);}});
app.addEventListener('dblclick',ev=>{
 const standardMeasure=ev.target.closest('[data-standard-measure]');if(standardMeasure){focusStandardAxis(standardMeasure);return;}
 if(!busy&&editCell(ev.target))return;
 const gsAxis=ev.target.closest('[data-gs-axis]');if(gsAxis){editGuideDimension(gsAxis.dataset.gsAxis);return;}
 const family=ev.target.closest('[data-gs-family]');if(family){if(!busy&&leave()){dirty=false;guideStandards.selectFamily(s,family.dataset.gsFamily,true);guideStandards.draw(app,s);}return;}
if(ev.target.matches('[data-master-edit]')){focusMasterAxis(ev.target.name,ev.target);return;}const field=ev.target.closest('[data-sign-field]');if(field){inlineEdit(field);return;}const tile=ev.target.closest('[data-sign],[data-post]');if(tile&&!editing()&&!busy){const id=tile.dataset.post||tile.dataset.sign;if(s.screen!=='view'||s.selected!==id)open(id);}});
app.addEventListener('keydown',ev=>{if(ev.target.closest('[data-quantity-input]')&&['Enter','Escape'].includes(ev.key)){ev.preventDefault();finishCell(ev.target,ev.key==='Escape');return;}if(ev.key==='Enter'&&ev.target.closest('[data-quantity-edit]')){ev.preventDefault();editCell(ev.target);return;}const axis=ev.target.closest('[data-gs-axis]');if(axis&&['Enter',' '].includes(ev.key)){ev.preventDefault();editGuideDimension(axis.dataset.gsAxis);return;}const family=ev.target.closest('[data-gs-family]');if(family&&['Enter',' '].includes(ev.key)){ev.preventDefault();if(!busy&&leave()){dirty=false;guideStandards.selectFamily(s,family.dataset.gsFamily,true);guideStandards.draw(app,s);}return;}const gp=ev.target.closest('[data-gs-part]');if(gp&&['Enter',' '].includes(ev.key)){ev.preventDefault();if(!busy){guideStandards.selectPart(s,Number(gp.dataset.gsPart));guideStandards.draw(app,s);app.querySelector(s.guideStandardsUI.editor?'[data-gs-shape][aria-pressed=true]':`[data-gs-part="${gp.dataset.gsPart}"]`)?.focus();}return;}const dimension=ev.target.closest('[data-placement-axis],[data-placement-field]');if(dimension&&!busy&&['Enter',' '].includes(ev.key)){ev.preventDefault();workspace.editDimension(app,dimension,installation.inputFor(app,dimension));}});
app.addEventListener('focusout',ev=>{finishCell(ev.target);if(ev.target.matches('[data-master-edit]'))ev.target.readOnly=true;});
app.addEventListener('keydown',ev=>{const measure=ev.target.closest('[data-standard-measure]');if(measure&&['Enter',' '].includes(ev.key)){ev.preventDefault();focusStandardAxis(measure);return;}if(ev.key==='Enter'&&ev.target.matches('[data-master-edit]')&&ev.target.readOnly){ev.preventDefault();focusMasterAxis(ev.target.name,ev.target);return;}const axis=ev.target.closest('[data-master-axis]');if(['Enter',' '].includes(ev.key)&&axis){ev.preventDefault();focusMasterAxis(axis.dataset.masterAxis,axis);return;}const field=ev.target.closest('[data-sign-field]');if(ev.key==='Enter'&&field){ev.preventDefault();inlineEdit(field);return;}if(ev.key==='Escape'&&ev.target.closest('.sl-inline-form')&&!busy){cancelInline();return;}const tile=ev.target.closest('[data-sign],[data-post]');if(ev.key==='Enter'&&tile&&!editing()&&!busy){ev.preventDefault();open(tile.dataset.post||tile.dataset.sign);}});
app.addEventListener('click',async ev=>{
 if(ev.target.closest('[data-gs-create]')){if(!busy&&leave()){dirty=false;guideStandards.beginCreate(s);guideStandards.draw(app,s);}return;}
 const objHelp=ev.target.closest('[data-obj-help]');if(objHelp){if(!busy)showUploadHelp();return;}
 const supportChoice=ev.target.closest('[data-standard-position-choice]');
 if(supportChoice&&!busy){const form=supportChoice.closest('[data-master-row]')||master.active(panel());selectMasterRow(form);standardInstallation.sync(supportChoice,form);s.plateView='front';master.loadSupport(app,s,form,api);master.draw(app,s,form);return;}
 const measure=ev.target.closest('[data-standard-measure]');
 if(measure){focusStandardAxis(measure);return;}
 if(ev.target.closest('[data-registration-cad-view]')){if(ev.target.closest('a'))return;const info=ev.target.closest('[data-cad-upload]').querySelector('[data-registration-cad-info]');info.hidden=!info.hidden;return;}
 if(ev.target.closest('[data-gi-cancel]')){if(busy)return;app.querySelector('.sl-dimension-entry')?.remove();guideStandards.cancelPosition(s);dirty=false;guideStandards.draw(app,s);status('설치 위치 수정을 취소했습니다.');return;}
 if(ev.target.closest('[data-gi-select],[data-gi-new],[data-gi-edit],[data-gi-sign]')){if(!s.guideStandardsUI.positionChanged)dirty=false;return;}
 if(ev.target.closest('[data-gi-delete]')){if(busy||!confirm('이 설치 위치를 삭제하시겠습니까?'))return;lock(true);try{await commit('delete_guide_position',s.guideStandardsUI.positionDraft);}catch(err){error(err.message);}finally{lock(false);}return;}
  if(guideStandards.active(s)){
   const gp=ev.target.closest('[data-gp-action],[data-gp-view],[data-gp-foundation],[data-gp-component],[data-gp-remove-model]');
   if(gp){
    if(busy)return;
    const state=s.guideStandardsUI,action=gp.dataset.gpAction,form=app.querySelector('.gp-editor');
    if(form)guidePosts.read(s,form);
    try{
     if(action==='traffic'){
      if(!leave())return;
      const key=state.postCurrent.key;dirty=false;s.mainSection='guides';s.section='supports';s.postRoad=state.postCurrent.road;s.postScope='traffic';s.search='';s.screen='closed';s.detail=null;
      renderShell();drawGrid();
      const target=posts.records(s).find(p=>(p['기준형식']||p['회사모델코드'])===key);
      if(target)await open(target['지주기초ID']);else await openWorkspace();return;
     }
     if(action==='save-y'){const input=app.querySelector('[data-gp-y]');if(!input.reportValidity())return;lock(true);await commit('save_guide_post_y',{id:state.postCurrent.key,Y:String(Number(input.value)/1000)});return;}
     if(action==='save'){
      if(form&&!form.reportValidity())return;
      lock(true);await commit('save_guide_post',state.postEditor);return;
     }
     if(action==='delete'){
      if(guideStandards.uses(s,state.postCurrent).length)throw new Error('표지에서 사용 중인 지주는 삭제할 수 없습니다.');
      if(!confirm('선택한 지주를 삭제할까요?'))return;
      lock(true);await commit('delete_guide_post',{id:state.postCurrent.key});return;
     }
     if(['new','copy','edit'].includes(action)){if(!leave())return;dirty=false;guidePosts.begin(s,state.postCurrent,action);}
     else if(action==='cancel'){state.postEditor=null;state.postTool='';dirty=false;}
     else if(['info','links','quantities'].includes(action))state.postTool=state.postTool===action?'':action;
     else if(action==='close-tool')state.postTool='';
     else if(action==='add-model'){state.postEditor.models.push('');dirty=true;}
     else if(gp.hasAttribute('data-gp-remove-model')){state.postEditor.models.splice(Number(gp.dataset.gpRemoveModel),1);dirty=true;}
     else if(gp.dataset.gpView)state.postView=gp.dataset.gpView;
     else if(gp.hasAttribute('data-gp-foundation'))state.postFoundation=!state.postFoundation;
     else if(gp.dataset.gpComponent)state.postComponent=gp.dataset.gpComponent;
     guideStandards.draw(app,s);
    }catch(err){error(err.message);}finally{lock(false);}return;
   }
   const family=ev.target.closest('[data-gs-family]');
   if(family){if(busy||!leave())return;dirty=false;guideStandards.selectFamily(s,family.dataset.gsFamily);guideStandards.draw(app,s,false,true);return;}
   if(ev.target.closest('[data-gs-shape-menu]')){if(!busy){s.guideStandardsUI.shapeMenu=!s.guideStandardsUI.shapeMenu;s.guideStandardsUI.axis='';guideStandards.draw(app,s);}return;}
   const part=ev.target.closest('[data-gs-part]'),partAction=ev.target.closest('[data-gs-part-action]'),shape=ev.target.closest('[data-gs-shape]');
   if(part||partAction||shape){
    if(busy)return;
    try{
     if(part)guideStandards.selectPart(s,Number(part.dataset.gsPart));
     else{guideStandards.changePart(s,partAction?.dataset.gsPartAction,shape?.dataset.gsShape);dirty=true;}
     guideStandards.draw(app,s);
    }catch(err){error(err.message);}return;
   }
   const action=ev.target.closest('[data-gs-action]')?.dataset.gsAction;
   if(action){
    if(busy)return;
    if(action==='save'){
     const fields=app.querySelector('.gc-axis-form');if(fields&&!fields.reportValidity())return;
     lock(true);try{await commit('save_guide_panel',guideStandards.editPayload(s));}catch(err){error(err.message);}finally{lock(false);}return;
    }
    if(action!=='cancel'&&!leave())return;
    status('');
    try{
     if(action==='delete'){
      const row=guideStandards.currentSpec(s);if(!row)throw new Error('삭제할 규격을 선택하세요.');
      if(row.members.length)throw new Error('표지에서 사용 중인 규격은 삭제할 수 없습니다.');
      if(!confirm('선택한 규격을 삭제할까요?'))return;
      lock(true);await commit('delete_guide_panel',{id:row.key});
     }else{dirty=false;if(action==='cancel')s.guideStandardsUI.editor=null;else guideStandards.beginEdit(s,['new','copy'].includes(action),action==='copy');guideStandards.draw(app,s);}
    }catch(err){error(err.message);}finally{lock(false);}return;
   }
   const choice=ev.target.closest('button[data-gs-key]');
   if(choice){if(busy||!leave())return;dirty=false;s.guideStandardsUI.pieceLinkFamily=choice.dataset.pieceFamily;guideStandards.change(s,choice.dataset.gsKey,choice.dataset.gsValue);guideStandards.draw(app,s);return;}
   if(ev.target.closest('[data-gs-retry]')){guideStandards.mount(app,s,api);return;}
   const guideLink=ev.target.closest('[data-gs-open]');
   if(guideLink){if(busy||!leave())return;dirty=false;s.section='guides';s.search='';s.guideFilter='';s.guidePart=-1;s.guideNew=false;s.guideSelected=guideLink.dataset.gsOpen;renderShell();return;}
   if(ev.target.closest('[data-guide-cancel]')){if(busy)return;dirty=false;guideStandards.draw(app,s);return;}
  }
  const previewChoice=ev.target.closest('[data-sign-preview-size],[data-sign-preview-config]');
  if(previewChoice&&!busy){
   if(previewChoice.getAttribute('aria-pressed')==='true')return;
   const attribute=previewChoice.hasAttribute('data-sign-preview-size')?'data-sign-preview-size':'data-sign-preview-config';
   s.signPreviewChoice=attribute==='data-sign-preview-size'?{panelId:previewChoice.value}:{...s.signPreviewChoice,configId:previewChoice.value};
   signPreview.load(app,s,api);app.querySelector(`[${attribute}][aria-pressed=true]`)?.focus({preventScroll:true});return;
  }
  const guideModelChoice=ev.target.closest('[data-guide-model-choice]');
  if(guideModelChoice){guideModel.choose(app,s,api,guideModelChoice.value);return;}
  const guidePositionLink=ev.target.closest('[data-guide-position-open]');
  if(guidePositionLink&&!busy){
   const ids=JSON.parse(guidePositionLink.dataset.guidePositionOpen);
   const row=[...app.querySelectorAll('[data-gsp-rule]')].find(r=>ids.includes(r.dataset.gspRule));row?.querySelector('[data-gsi-axis]')?.focus();return;
  }
  if(ev.target.closest('[data-guide-new]')&&!busy){if(!leave())return;dirty=false;s.guideNew=true;s.guideSelected='';guides.drawList(app,s);guides.drawDetail(app,s,api);return;}
  if(ev.target.closest('[data-guide-close]')&&!busy){if(!leave())return;dirty=false;if(s.guideNew)guideRegistration.discard(s);s.guideNew=false;s.guideSelected='';guides.drawList(app,s);guides.drawDetail(app,s,api);return;}
  const guide=ev.target.closest('[data-guide],[data-guide-part],[data-guide-filter],[data-guide-cancel]');
  if(guide&&!busy){
    if(guide.hasAttribute('data-guide')){
      if(s.guideSelected)openGuide(guide.dataset.guide);
      else app.querySelectorAll('[data-guide]').forEach(button=>button.setAttribute('aria-pressed',String(button===guide)));
      return;
    }
    if(guide.hasAttribute('data-guide-cancel')){dirty=false;guides.drawDetail(app,s,api);return;}
    if(!leave())return;dirty=false;
    if(guide.hasAttribute('data-guide-filter')){s.guideFilter=guide.dataset.guideFilter;app.querySelectorAll('[data-guide-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideFilter===s.guideFilter)));guides.drawList(app,s);guides.drawDetail(app,s,api);return;}
    s.guidePart=Number(guide.dataset.guidePart);
    guides.drawDetail(app,s,api);return;
  }
  const installationKind=ev.target.closest('[data-panel-installation-kind]');
  if(installationKind&&!busy){if(!leave())return;s.panelInstallationKind=installationKind.dataset.panelInstallationKind;await openPanelInstallation();return;}
  if(ev.target.closest('[data-panel-installation-reset]')&&!busy){if(leave())await openPanelInstallation();return;}
  if(ev.target.closest('[data-panel-installation-save]')&&!busy&&dirty){
   if(!panelInstallation.validate(app))return;
   const entries=panelInstallation.entries(app);lock(true);
   try{
    const result=await api('/api/mutate',{revision:s.revision,action:'save_panel_placements',payload:{entries}});
    Object.assign(s,result);dirty=false;await openPanelInstallation();status(s.panelInstallationError?'저장은 확인됐지만 화면 재조회에 실패했습니다.':result.unchanged?'변경된 값이 없습니다.':s.mode==='test'?'복사 데이터 저장·재조회 확인':'구글시트 저장·재조회 확인');
   }catch(err){const error=app.querySelector('.sl-panel-installation-footer .sl-error');if(error){error.textContent=err.message;error.hidden=false;}}
   finally{lock(false);}return;
  }
  const cameraButton=ev.target.closest('[data-camera]');if(cameraButton&&!busy){cameraAction(cameraButton.dataset.camera);return;}
  const closeTool=ev.target.closest('[data-close-tool]');if(closeTool){if(closeTool.closest('.sl-master-form[data-mode="size"]')){if(busy)return;dirty=false;beginMaster(s.masterName,s.masterSize);}else closeTool.closest('details').open=false;return;}
 
  const pageChoice=ev.target.closest('[data-panel-page-choice]');if(pageChoice){panelPages.select(pageChoice.closest('form'),pageChoice.dataset.panelPageChoice);return;}
  if(!busy&&ev.target.closest('[data-road-site]')){supportWorkbench.selectRoad(app,s,ev.target);return;}
  const placementMode=ev.target.closest('[data-placement-mode-choice]');if(placementMode){placement.setMode(placementMode.closest('form'));return;}
  if(ev.target.closest('[data-post-foundation]')&&!busy){s.postFoundation=!s.postFoundation;drawGrid();return;}
  if(ev.target.closest('[data-assembly-zoom]')&&!busy){s.installationFull=!s.installationFull;drawModel();return;}
  const display=ev.target.closest('[data-installation-display]');if(display&&!busy){s.installationDisplay=display.dataset.installationDisplay;app.querySelectorAll('[data-installation-display]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.installationDisplay===s.installationDisplay)));drawModel();if(panelInstallation.active(s)&&s.installationDisplay==='assembly')app.querySelectorAll('[data-panel-installation-form]').forEach(refreshPanelInstallation);return;}
  const mode=ev.target.closest('[data-installation-mode]');if(mode&&!busy){if(!leave())return;s.installationMode=mode.dataset.installationMode;s.selected='';s.detail=null;s.screen='closed';s.search='';dirty=false;renderShell();drawGrid();await openWorkspace();return;}
  const positionValue=ev.target.closest('[data-placement-axis],[data-placement-field]');if(positionValue&&!busy){workspace.editDimension(app,positionValue,installation.inputFor(app,positionValue));return;}
  const enableSize=ev.target.closest('[data-master-enable]');if(enableSize&&!busy){const row=enableSize.closest('[data-master-row]');master.enable(row,s);selectMasterRow(row);row.elements.width.focus();return;}
  const masterSize=ev.target.closest('[data-master-size-choice]');if(masterSize&&!busy){selectMasterRow(masterSize.closest('[data-master-row]'));return;}
  const post=ev.target.closest(independent()?'[data-master-post],[data-post]':'[data-master-post]');if(post&&!busy){if(leave())await open(post.dataset.masterPost||post.dataset.post);return;}
  if(ev.target.closest('[data-support-size]')&&!busy){if(!editing())begin();const input=panel().querySelector('[name=단면규격]');input?.focus();input?.select();return;}
  const view=ev.target.closest('[data-plate-view]');if(view&&!busy){s.plateView=view.dataset.plateView;drawGrid();return;}
  const postView=ev.target.closest('[data-post-view]');if(postView&&!busy){s.postView=postView.dataset.postView;drawGrid();return;}
  const choice=ev.target.closest('[data-master-select]');if(choice&&!busy){beginMaster(choice.dataset.masterSelect,choice.dataset.masterSize);return;}
  const axis=ev.target.closest('[data-master-axis]');if(axis){focusMasterAxis(axis.dataset.masterAxis,axis);return;}
  if(managingPosts()&&editing()&&!busy&&postDraft.click(s,panel().querySelector('form'),ev.target)){dirty=true;invalidatePreview();postDraft.update(panel().querySelector('form'),s);syncWorkspaceEdits();return;}
  const section=ev.target.closest('[data-section]');if(section&&!busy){if(!leave())return;if(!inMaster())s.mainSection=s.section;++detailSequence;dirty=false;supportPreview=null;s.section=section.dataset.section;s.screen='closed';s.detail=null;s.selected='';s.search='';if(guideStandards.active(s)&&s.guideStandardsUI?.privatePosition)guideStandards.change(s,'group','plates');renderShell();drawGrid();if(managingPosts()&&directWorkspace())await openWorkspace();else await openFirstSign();app.querySelector(`[data-section="${s.section}"]`)?.focus({preventScroll:true});return;}
  const scope=ev.target.closest('[data-post-scope]');if(scope&&!busy){s.postScope=scope.dataset.postScope;drawGrid();return;}
  const postTab=ev.target.closest('[data-post-tab]');if(postTab&&!busy){s.postTab=postTab.dataset.postTab;panel().querySelectorAll('[data-post-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.postTab===s.postTab)));panel().querySelectorAll('[data-post-section]').forEach(el=>el.hidden=el.dataset.postSection!==s.postTab);return;}
  const quantityTab=ev.target.closest('[data-quantity-kind],[data-quantity-target],[data-quantity-view],[data-quantity-condition]');
  if(quantityTab&&!busy){
    if('quantityKind' in quantityTab.dataset){s.quantityKind=quantityTab.dataset.quantityKind;s.quantityTarget='';}
    else if('quantityTarget' in quantityTab.dataset)s.quantityTarget=quantityTab.dataset.quantityTarget;
    else if('quantityCondition' in quantityTab.dataset)s.quantityCondition=quantityTab.dataset.quantityCondition;
    else s.quantityView=quantityTab.dataset.quantityView;
    panel().querySelector('.sl-quantity-content').innerHTML=catalog.quantityView(s,managingPosts()||editing());
    const attribute='quantityKind' in quantityTab.dataset?'data-quantity-kind':'quantityTarget' in quantityTab.dataset?'data-quantity-target':'quantityCondition' in quantityTab.dataset?'data-quantity-condition':'data-quantity-view';
    panel().querySelector(`[${attribute}][aria-pressed=true]`)?.focus({preventScroll:true});
    return;
  }
  const filter=ev.target.closest('[data-filter]');if(filter&&!busy){s.filter=filter.dataset.filter;drawGrid();return;}
  const tile=ev.target.closest('[data-sign],[data-post]');
  if(tile&&!busy){
   if(s.section==='signs'&&s.screen==='view'){if(tile.dataset.sign!==s.selected&&leave())await open(tile.dataset.sign);return;}
   if(!editing())app.querySelectorAll('[data-sign],[data-post]').forEach(b=>b.setAttribute('aria-pressed',String(b===tile)));
   return;
  }
  const b=ev.target.closest('[data-action]');if(!b||busy)return;
  const {action,id}=b.dataset;
  try{
    if(action==='master-delete'){
      const {option,spec}=master.selection(s),payload={name:option.name,size:spec.name};
      confirmDelete(`${option.displayName||option.name} · ${spec.name} (${spec.width} × ${spec.height} mm)`,option.specs.length===1?'마지막 크기이므로 모양도 목록에서 삭제됩니다.':'선택한 크기만 삭제됩니다.',async()=>{lock(true);try{await commit('delete_standard',payload);}finally{lock(false);}});return;
    }
    if(action==='master-copy'){const {option,spec}=master.selection(s);if(!leave())return;dirty=false;beginMaster();const form=panel().querySelector('form'),row=master.allRows(form).find(row=>row.elements.size.value===spec.name)||master.active(form);form.dataset.copyName=option.name;form.dataset.copyGeometry=JSON.stringify(plateShape.geometry(option));if(option.outline)form.dataset.copyOutline=JSON.stringify(option.outline);form.elements.new_name.value=(option.displayName||option.name)+' 복사';const geometry=plateShape.geometry(option);form.querySelector(`[name=geometry_kind][value="${geometry.kind}"]`).checked=true;form.elements.geometry_sides.value=geometry.sides||3;form.elements.geometry_inverted.checked=!!geometry.inverted;for(const key of ['width','height'])row.elements[key].value=spec[key];row.elements.thickness.value=option.thickness||3;selectMasterRow(row);dirty=master.update(form,s);refreshStandardImpact(row);syncWorkspaceEdits();return;}
    if(action==='new'&&managingMaster()){beginMaster();return;}
    if(action==='master-add-size'){beginMaster(s.masterName,s.masterSize,'size');return;}
    if(action==='master-size-cancel'){dirty=false;beginMaster(s.masterName,s.masterSize);return;}
    if(['new','copy','cancel','close','reload','master-cancel'].includes(action)&&!leave())return;
    if(action==='new'){begin(true);return;}
    if(action==='master-cancel'){close();return;}
    if(action==='master-save'){if(!masterPreview)return;lock(true);await commit('save_standard',masterPreview);return;}
    if(action==='inline-cancel'){cancelInline();return;}
    if(action==='all-sizes'){panel().querySelectorAll('[name=registration_sizes]').forEach(input=>input.checked=true);dirty=true;return;}
    if(action==='copy'){begin(true,true);return;}
    if(action==='edit'){begin();return;}
    if(action==='support-revise'){invalidatePreview();panel().querySelector('[name=형식]').focus();return;}
    if(action==='support-save'){if(!supportPreview)return;lock(true);await commit('save_support',supportPreview);return;}
    if(action==='close'){close();return;}
    if(action==='cancel'){dirty=false;supportPreview=null;if(managingPosts()&&directWorkspace()){if(s.selected)await open(s.selected);else close();return;}if(s.screen==='new'||independent())close();else{s.screen='view';show(views().view(s));}return;}
    if(action==='delete'){
      const sign=s.detail.sign,payload={id:s.selected};
      confirmDelete(`${sign['표지번호']} ${sign['명칭']}`,'이 표지판의 연결만 제거하며 공용 판·지주는 유지합니다.',async()=>{lock(true);try{await commit('delete_catalog_sign',payload);}finally{lock(false);}});return;
    }
    if(action==='reload'){lock(true);await load();status('최신 자료를 불러왔습니다.');return;}
    if(action.startsWith('way-')){
      if(s.screen==='new'){
        const form=panel().querySelector('form'),values=new FormData(form);
        const context=wayDraft.context(s,{code:values.get('code'),category:values.get('category'),...selectionPayload(form,s.registrationOptions)});
        if(!context.tables.panels.length&&action!=='way-unlink')throw new Error('먼저 표지판 모양과 크기를 선택하세요.');
        await editWay(context,action,id,api,async(operation,payload)=>{
          s.wayDraft=wayDraft.change(s.wayDraft,context,operation,payload);dirty=true;
          panel().querySelector('.sl-way-draft').innerHTML=wayDraft.view({...context,detail:{...context.detail,wayRules:s.wayDraft}});
        });
      }else await editWay(s,action,id,api,(operation,payload)=>commit(operation,payload,true));
      return;
    }
    if(['add-file','replace-file','add-model-file','replace-model-file','add-quantity','edit-quantity','edit-quantities'].includes(action)){
      const context=action==='add-file'?{...s,detail:{...s.detail,configs:[]}}:s;
      await edit(context,action,id,api,(operation,payload)=>commit(operation,payload,true));
    }
  }catch(err){error(err.message);}finally{lock(false);}
});
for(const event of ['input','change'])app.addEventListener(event,ev=>{if(ev.target.closest('.sl-canvas-form,[data-panel-installation-form]'))syncWorkspaceEdits();if(ev.target.closest('.sl-guide-editor,.gi-form')||ev.target.closest('.sl-guide-registration')&&ev.target.name!=='query')dirty=true;if(ev.target.closest('.gi-form'))s.guideStandardsUI.positionChanged=true;});
function openGuide(id){
 if(busy||s.guideSelected===id||!leave())return;
 dirty=false;s.guideNew=false;s.guideSelected=id;s.guidePart=-1;s.guideSignCamera=null;s.guideHidePost=false;s.guideModelName='';
 guides.drawList(app,s);guides.drawDetail(app,s,api);
}
function editGuide(target){
 if(busy||!leave())return;dirty=false;const metadata=target.dataset.guideEdit,payload=JSON.parse(metadata);
 const postRule=target.closest('[data-gsp-rule]')?.dataset.gspRule,workView=postRule?app.querySelector('[data-gsp-workspace]')?.dataset.gspWorkspace:null;
 if(postRule)s.guideModelRule=postRule;
 const shared=['B','H','지주형식','X','Y','Z'].includes(payload.field)&&(s.guidePanelSpecs||[]).find(p=>p.ruleIds.some(id=>payload.rules?.includes(id)));
 if(shared){s.section='guide-standards';s.guideStandardsUI={...guideStandards.initial(),road:shared.road,selected:shared.kind,spec:shared.key};renderShell();return;}
 if(guideStandards.active(s))guideStandards.draw(app,s);else guides.drawDetail(app,s,api);
 const button=payload.field==='CAD블록명'?app.querySelector('[data-guide-cad-block]'):[...app.querySelectorAll('[data-guide-edit]')].find(b=>b.dataset.guideEdit===metadata);
 if(button){button.dataset.guideEdit=metadata;guides.edit(button,app,s);if(['3d','installation','plan'].includes(workView))app.querySelector(`[data-gsp-mode="${workView}"]`)?.click();}
}
app.addEventListener('dblclick',ev=>{const tile=ev.target.closest('[data-guide]');if(tile){openGuide(tile.dataset.guide);return;}const target=ev.target.closest('[data-guide-edit]');if(target)editGuide(target);});
app.addEventListener('keydown',ev=>{const tile=ev.target.closest('[data-guide]');if(tile&&ev.key==='Enter'){ev.preventDefault();openGuide(tile.dataset.guide);return;}const target=ev.target.closest('[data-guide-edit]');if(target&&ev.key==='Enter'){ev.preventDefault();editGuide(target);}else if(ev.key==='Escape'&&ev.target.closest('.sl-guide-editor')&&!busy){dirty=false;if(guideStandards.active(s))guideStandards.draw(app,s);else guides.drawDetail(app,s,api);}});
app.addEventListener('input',ev=>{if(ev.target.matches('[data-gs-search]')){if(busy||!leave()){ev.target.value=s.guideStandardsUI.query;return;}dirty=false;guideStandards.change(s,'query',ev.target.value);guideStandards.draw(app,s,true);}});
window.addEventListener('beforeunload',ev=>{if(dirty||busy||app.querySelector('[data-layout-changed=true],[data-guide-asset-editor][data-changed=true]')||document.querySelector('#editor').open){ev.preventDefault();ev.returnValue='';}});
async function restoreNavigation(route){
 ++detailSequence;dirty=false;supportPreview=null;masterPreview=null;
 const {common,...values}=route;Object.assign(s,values,{screen:'closed',detail:null,guideNew:false,guideModelName:'',guideRegistrationDraft:null});
 s.guideStandardsUI={...guideStandards.initial(),...common};s.guidePositionCamera=null;
 renderShell();drawGrid();
 if(guideStandards.active(s)||s.section==='guides')return;
 if(managingMaster()){beginMaster(s.masterName,s.masterSize);return;}
 if(s.selected&&s.tables[managingPosts()?'supports':'signs'].some(r=>r[managingPosts()?'지주기초ID':'표지ID']===s.selected))await open(s.selected);
 else if(managingPosts()&&directWorkspace())await openWorkspace();else await openFirstSign();
}
load().then(()=>{
 const sync=navigation.historyController(window,()=>navigation.route(s),restoreNavigation,()=>!busy&&leave(),err=>error(err.message));
 navigation.observe(app,sync);navigation.bindKeyboard(app,()=>busy||!!document.querySelector('dialog[open]'));
}).catch(err=>{app.innerHTML=`<div class="startup-error"><h1>자료를 불러오지 못했습니다.</h1><p>${catalog.e(err.message)}</p><button data-action="reload">다시 불러오기</button></div>`;});

