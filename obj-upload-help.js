/* 지주 OBJ의 재질별 치수 추출과 외경 측정 범위를 안내한다. 편집 초안은 변경하지 않는다. */
const materials=`<svg viewBox="0 0 400 270" role="img" aria-label="지주와 가로재의 재질 이름은 Steel, 기초는 Concrete. 각 재질에 해당하는 모델에서 치수를 추출합니다.">
 <rect x="108" y="190" width="102" height="48" class="oh-concrete"/>
 <path d="M76 36H171V190H143V54H76Z" class="oh-steel"/>
 <path d="M143 190v28h28v-28" class="oh-hidden"/>
 <path d="M171 90h53M210 214h14" class="oh-line"/>
 <text x="236" y="85" class="oh-material">Steel</text><text x="236" y="107">지주·가로재</text>
 <text x="236" y="209" class="oh-material">Concrete</text><text x="236" y="231">기초</text>
 <path d="M47 36h21M47 190h53M53 36v154m-4-150 8-8m-8 162 8-8M108 243v15m102-15v15M108 252h102m-98-4-8 8m102-8 8 8" class="oh-measure"/>
 <text x="38" y="113" text-anchor="middle" transform="rotate(-90 38 113)" class="oh-dimension">지주 높이</text>
 <text x="159" y="269" text-anchor="middle" class="oh-dimension">기초 폭</text>
</svg>`;
const diameter=`<svg viewBox="0 0 400 270" role="img" aria-label="원형 단면의 바깥지름인 외경 Φ만 측정합니다. 내경과 관 두께는 추출하지 않습니다.">
 <circle cx="200" cy="142" r="76" class="oh-steel"/>
 <circle cx="200" cy="142" r="54" class="oh-inner"/>
 <path d="M108 142h184M200 50v184" class="oh-hidden"/>
 <path d="M124 136V35m152 101V35M124 41h152m-148-4-8 8m152-8 8 8" class="oh-measure"/>
 <text x="200" y="28" text-anchor="middle" class="oh-dimension">외경 Φ</text>
 <text x="200" y="252" text-anchor="middle">원형 단면</text>
</svg>`;
const content=`<div class="oh-diagrams">
 <section><h3>재질별 치수 추출</h3>${materials}<p>재질 이름 <strong>Steel</strong>과 <strong>Concrete</strong>를 기준으로<br>각 부위의 치수를 추출합니다.</p></section>
 <section><h3>외경만 추출</h3>${diameter}<p>원형 단면의 <strong>외경(Φ)만</strong> 추출합니다.<br>내경과 관 두께는 추출하지 않습니다.</p></section>
</div>`;
export function helpButton(){
 return '<button type="button" class="sl-obj-help" data-obj-help aria-label="지주 OBJ 치수 추출 도움말" aria-haspopup="dialog" title="지주 OBJ 업로드 안내">?</button>';
}
export function showUploadHelp(){
 const dialog=document.querySelector('#editor');
 dialog.classList.remove('workflow-dialog','quantity-dialog');dialog.classList.add('obj-help-dialog');
 dialog.oninput=null;dialog.onchange=null;dialog.onsubmit=null;dialog.oncancel=null;
 dialog.innerHTML=`<div class="oh-body"><header><h2 id="dialog-title">지주 OBJ 업로드 안내</h2><button type="button" data-obj-help-close>닫기</button></header>${content}</div>`;
 dialog.onclick=ev=>{if(ev.target.closest('[data-obj-help-close]'))dialog.close();};
 dialog.addEventListener('close',()=>dialog.classList.remove('obj-help-dialog'),{once:true});
 dialog.showModal();dialog.querySelector('[data-obj-help-close]').focus({preventScroll:true});
}
