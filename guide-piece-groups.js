/* 같은 판 외곽을 목록에서만 묶는다. 선택된 원본 키와 저장된 조합은 보존한다. */
export function pieceGroups(assets,current=''){
 const groups=new Map();
 for(const a of assets.filter(a=>a.kind==='piece')){
  const key=a.outlineKey||a.key;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(a);
 }
 return [...groups.values()].map(rows=>{
  const selected=rows.find(a=>a.key===current)||rows[0],uses=new Map();
  for(const a of rows)for(const u of a.uses||[]){
   if(!uses.has(u.id))uses.set(u.id,{...u,warnings:new Set()});
   if(u.warning)uses.get(u.id).warnings.add(u.warning);
  }
  return {...selected,common:rows.some(a=>a.common),aliases:rows.map(a=>a.key),uses:[...uses.values()].map(({condition:_condition,warnings,...u})=>{
   return {...u,warning:[...warnings].join(' / ')};
  }).sort((a,b)=>(a.code||'').localeCompare(b.code||'','ko',{numeric:true}))};
 });
}
export const pieceLabel=a=>`${Number(Number(a.B).toFixed(1))} × ${Number(Number(a.H).toFixed(1))}${a.variant&&a.variant!=='사각형'?' · '+a.variant:''}`;
export const pieceFamily=a=>a.variant?.includes('화살표')?'arrows':'rectangles';
