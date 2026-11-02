/* 별첨 명칭을 등록용 유형으로 묶는다. 원문 번호·A/B·규격은 개별 구성에 그대로 남긴다. */
export function typeName(sign){
 const name=sign['명칭'].replace(/\s+/g,'').replace(/\([^)]*\)/g,'');
 if(/^(?:\d지명|좌우)이정표지$/.test(name))return '이정표지';
 if(/^\d차출구예고표지$/.test(name))return '출구예고표지';
 if(/^(?:약식)?\d?(?:지명)?방향예고표지$/.test(name))return '방향예고표지';
 if(/^(?:약식)?\d?(?:지명)?방향표지$/.test(name))return '방향표지';
 if(/도로명예고표지$/.test(name))return '도로명예고표지';
 if(/도로명표지$/.test(name))return '도로명표지';
 if(/^(?:\d지명|광폭)?차로지정표지$/.test(name))return '차로지정표지';
 return name;
}
export function types(d,options){
 const groups=new Map();
 for(const sign of options.signs.filter(r=>r['도로구분']===d.road&&r['분류']===d.category)){
  const name=typeName(sign);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(sign);
 }
 return [...groups].map(([name,signs])=>({name,signs}));
}
export function configurationName(sign,siblings){
 const name=sign['명칭'];
 if(siblings.filter(s=>s['명칭']===name).length===1)return name;
 return `${name} · ${sign['표지번호']}`;
}
