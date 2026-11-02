/* 지주 형식과 조합 설명도. 형식 번호는 회사 알고리즘 §1.2 고속도로 표를 따른다. */

const formNumbers={HW_SinglePost_TS1:1,HW_SinglePost_TS2:2,HW_SinglePost_TS3:3,HW_SinglePost_TS4:4,HW_CantileverPost_TS1:5,HW_CantileverPost_TS2:6,GR_SinglePost_TS1:1,GR_SinglePost_TS2:2,GR_SinglePost_TS3:3,GR_SinglePost_TS4:4,GR_SinglePost_TS5:5,GR_SinglePost_TS6:6};
const isAuxiliary=p=>p?.['형태']==='보조'&&!(p['폭_mm']>0&&p['폭_mm']===p['높이_mm']);
export const supportFormKey=p=>p['기준형식']||p['회사모델코드'];
export const supportRoad=p=>p.road||(supportFormKey(p)?.startsWith('GR_')?'일반도로':'고속도로');
export const supportNumber=p=>p.formNumber||(Object.hasOwn(formNumbers,supportFormKey(p))?formNumbers[supportFormKey(p)]:undefined);
export function supportLabel(support){
  const number=supportNumber(support);
  return number?`형식 ${number}`:/^(HW|GR)_Attached_TS$/.test(supportFormKey(support))?'부착식':'형식 미확인';
}
export function matchesSupportPattern(support,slots){
  const allowed=support.formPatterns?.map(pair=>pair.join(':'))||{1:['1:0'],2:['1:1'],3:['2:0'],4:['2:0','2:1'],5:['1:0','1:1'],6:['2:0','2:1','3:0']}[supportNumber(support)];
  if(!allowed)return true;
  if(slots.some(p=>!p.panel?.['형태']))return false;
  const auxiliary=slots.filter(p=>isAuxiliary(p.panel)).length;
  if(slots.length===1&&auxiliary===1&&slots[0].panel['폭_mm']>0&&slots[0].panel['폭_mm']===slots[0].panel['높이_mm'])return allowed.includes('1:0');
  // 장수만 대조한다. 원본 연결을 이동하거나 모델·치수의 적합성을 확정하지 않는다.
  return allowed.includes(`${slots.length-auxiliary}:${auxiliary}`);
}
function shapeSvg(shape,x,y,supplement=false){
  const w=supplement?46:32,h=supplement?13:30;
  if(shape==='삼각')return `<polygon points="${x},${y-h/2} ${x-w/2},${y+h/2} ${x+w/2},${y+h/2}"/>`;
  if(shape==='역삼각')return `<polygon points="${x-w/2},${y-h/2} ${x+w/2},${y-h/2} ${x},${y+h/2}"/>`;
  if(shape==='원형')return `<circle cx="${x}" cy="${y}" r="15"/>`;
  if(shape==='팔각')return `<polygon points="${x-7},${y-15} ${x+7},${y-15} ${x+15},${y-7} ${x+15},${y+7} ${x+7},${y+15} ${x-7},${y+15} ${x-15},${y+7} ${x-15},${y-7}"/>`;
  if(shape==='오각')return `<polygon points="${x},${y-16} ${x+16},${y+5} ${x+16},${y+14} ${x-16},${y+14} ${x-16},${y+5}"/>`;
  return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}"/>`;
}
export function combinationDiagram(c,form){
  const cantilever=form==='내민식';
  const attached=form==='부착식';
  const mainCount=c.slots.filter(p=>!isAuxiliary(p.panel)).length;
  let main=0;
  const shapes=c.slots.map((p,i)=>{
    const shape=p.panel?.['형태']||'',supplement=isAuxiliary(p.panel);
    if(!supplement)main++;
    const x=cantilever?mainCount===1?100:65+(Math.max(1,main)-1)*55:90;
    const y=cantilever?supplement?77:43:attached?37+i*31:23+i*31;
    return shapeSvg(shape,x,y,supplement);
  }).join('');
  // 내민식 가로대는 판 뒤를 통과한다(회사 알고리즘 §1.3). 부착식은 기존 구조물과 고정구를 구별한다.
  const end=mainCount===1?116:65+(mainCount-1)*55+16;
  const post=cantilever?`<path class="sl-post-line" d="M25 112V78Q25 43 63 43H${end}M12 113H198"/>`:
    attached?'<path class="sl-existing-post" d="M80 9V101M100 9V101"/><path class="sl-post-line" d="M73 24H107M73 50H107"/><text x="90" y="116" text-anchor="middle" class="sl-attachment-label">기존 구조물</text>':
      '<path class="sl-post-line" d="M90 10V112M12 113H198"/>';
  return `<svg viewBox="0 0 210 120" data-post-kind="${cantilever?'cantilever':attached?'attached':'single'}" aria-hidden="true">${post}<g class="sl-plate-shapes">${shapes}</g></svg>`;
}
