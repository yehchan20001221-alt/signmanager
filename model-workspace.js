/* 모델 치수 위의 임시 입력기. 확정한 값만 기존 폼으로 전달해 저장·검증을 재사용한다. */
const initialForms=new WeakMap();
function formValues(form){
 return JSON.stringify([...form.querySelectorAll('input,select,textarea')]
  .filter(el=>!el.matches('[readonly],[data-assembly-choice],.sl-position-calculator *,[name=placement_template]'))
  .map(el=>['checkbox','radio'].includes(el.type)?[el.value,el.checked]:el.type==='number'&&el.value!==''?Number(el.value):el.value));
}
export function rememberForm(form){initialForms.set(form,formValues(form));}
export function formChanged(form){return initialForms.has(form)&&initialForms.get(form)!==formValues(form);}

export function editDimension(root,target,input){
 if(!input||input.readOnly&&input.hasAttribute('data-support-dimension'))return;
 root.querySelector('.sl-dimension-entry')?.remove();
 const text=target.querySelector('text')||target,box=text.getBoundingClientRect(),editor=document.createElement('input');
 editor.className='sl-dimension-entry';editor.type='number';
 for(const key of ['min','max','step'])if(input[key])editor[key]=input[key];
 editor.required=true;editor.value=input.value;
 editor.setAttribute('aria-label',target.getAttribute('aria-label')||input.closest('label')?.textContent||'치수');
 editor.style.left=Math.max(8,Math.min(window.innerWidth-150,box.left+box.width/2-70))+'px';
 editor.style.top=Math.max(8,Math.min(window.innerHeight-50,box.top+box.height/2-20))+'px';
 const visibility=text.style?.visibility;
 if(text.style)text.style.visibility='hidden';
 let done=false;
 const finish=accept=>{
  if(done)return;
  if(accept&&!editor.reportValidity()){editor.focus();return;}
  done=true;
  if(text.style)text.style.visibility=visibility||'';
  if(accept&&editor.value!==input.value){
   input.value=editor.value;
   input.dispatchEvent(new window.Event('input',{bubbles:true}));
   input.dispatchEvent(new window.Event('change',{bubbles:true}));
  }
  editor.remove();
 };
 editor.addEventListener('keydown',ev=>{
  if(['Enter','Escape'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();finish(ev.key==='Enter');}
 });
 editor.addEventListener('blur',()=>finish(true));
 (root.querySelector('#sign-library-screen')||root).append(editor);editor.focus();editor.select();
}
export function reveal(input){
 const tool=input?.closest('.sl-canvas-tool');if(tool)tool.open=true;
}
export function tool(label,html,open=false){
 return `<details class="sl-canvas-tool" name="canvas-tool" ${open?'open':''}><summary>${label}</summary><div class="sl-canvas-popover"><button type="button" class="sl-tool-close" data-close-tool aria-label="${label} 닫기">×</button>${html}</div></details>`;
}
