/* 규격별 설치값을 읽고 누락된 도로·지주·축을 검증한다. */

import {values} from './standard-installation.js';

export function read(row){
 return [...row.querySelectorAll('[data-standard-position]')].filter(item=>item.dataset.kind!=='부착식').flatMap(item=>values(item).map(value=>({
  ...value,kind:item.dataset.kind,label:[...item.querySelectorAll('[data-standard-member]')].find(row=>row.dataset.standardMember===value.key)?.getAttribute('aria-label')||item.getAttribute('aria-label').replace(/ 설치위치$/,'')
 })));
}
export function issue(items,size){
 for(const item of items)for(const axis of ['x','y','z']){
  if(axis==='y'&&!Object.hasOwn(item,axis))continue;
  if(item[axis]===''||item[axis]==null)return {key:item.key,axis,message:`${size} · ${item.label}의 ${axis.toUpperCase()}를 입력하세요.`};
  if(!Number.isFinite(Number(item[axis])))return {key:item.key,axis,message:`${size} · ${item.label}의 ${axis.toUpperCase()}를 숫자로 입력하세요.`};
 }
 return null;
}
