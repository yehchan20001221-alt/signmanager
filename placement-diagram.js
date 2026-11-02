/* 알고리즘 치수 설명도와 계산된 판 배치. 그림은 OBJ 형상을 대신하지 않는다. */
import {e} from './views.js';

export function outline(name,x,y,w,h){
 if(name==='삼각형')return `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}"/>`;
 if(name==='역삼각형')return `<polygon points="${x},${y} ${x+w},${y} ${x+w/2},${y+h}"/>`;
 if(name==='원형')return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}"/>`;
 if(name==='팔각형')return `<polygon points="${[[.3,0],[.7,0],[1,.3],[1,.7],[.7,1],[.3,1],[0,.7],[0,.3]].map(([a,b])=>`${x+a*w},${y+b*h}`).join(' ')}"/>`;
 if(name==='오각형')return `<polygon points="${[[.5,0],[1,.7],[1,1],[0,1],[0,.7]].map(([a,b])=>`${x+a*w},${y+b*h}`).join(' ')}"/>`;
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
}
const line=(x1,y1,x2,y2,cls='sl-dimension-line')=>`<path class="${cls}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
const dot=(x,y)=>`<circle class="sl-reference-dot" cx="${x}" cy="${y}" r="4"/>`;
const label=(x,y,text)=>`<text x="${x}" y="${y}">${e(text)}</text>`;

export function illustration(direction='세로'){
 const horizontal=direction==='가로';
 let drawing;
 if(horizontal){
  drawing='<path class="sl-support-stroke" d="M100 120H430Q490 120 490 350M100 132H430Q478 132 478 350"/>';
  drawing+=`<g class="sl-panel-outline">${outline('원형',60,70,150,150)}${outline('원형',260,70,150,150)}${outline('보조',260,270,150,40)}</g>`;
  drawing+=dot(135,220)+line(100,45,135,45)+line(100,40,100,115)+line(135,40,135,65)+line(40,126,40,220)+line(35,126,96,126)+line(35,220,135,220);
  drawing+=line(210,50,260,50)+line(210,45,210,65)+line(260,45,260,65)+line(430,220,430,270)+line(415,220,440,220)+line(415,270,440,270);
  drawing+=label(103,30,'X')+label(12,185,'Z')+label(224,36,'①')+label(445,250,'②');
 }else{
  drawing='<path class="sl-support-stroke" d="M135 80V390M145 80V390M135 80H145"/>';
  drawing+=`<g class="sl-panel-outline">${outline('삼각형',70,30,140,140)}${outline('원형',70,210,140,140)}${outline('보조',70,375,140,35)}</g>`;
  drawing+=dot(140,170)+line(40,80,40,170)+line(35,80,130,80)+line(35,170,140,170);
  drawing+=line(235,170,235,210)+line(215,170,245,170)+line(215,210,245,210)+line(235,350,235,375)+line(215,350,245,350)+line(215,375,245,375);
  drawing+=label(12,132,'Z')+label(255,197,'①')+label(255,371,'②');
 }
 return `<div class="sl-dimension-figure"><svg viewBox="${horizontal?'0 0 510 370':'0 0 300 430'}" role="img" aria-label="${horizontal?'내민식':'단주식'} 표지판 설치 치수 설명도">${drawing}</svg></div>`;
}

export function coordinatePicture(result){
 const rows=result.panels;
 const left=Math.min(0,...rows.map(p=>p.x_mm-p.width/2)),right=Math.max(0,...rows.map(p=>p.x_mm+p.width/2));
 const top=Math.min(0,...rows.map(p=>-p.z_mm-p.height)),bottom=Math.max(0,...rows.map(p=>-p.z_mm));
 const scale=Math.min(460/Math.max(1,right-left),420/Math.max(1,bottom-top));
 const tx=x=>55+(x-left)*scale,ty=z=>42+(-z-top)*scale;
 const height=Math.max(230,(bottom-top)*scale+110),ox=tx(0),oy=ty(0);
 const horizontal=rows.some(p=>p.x_mm!==rows[0].x_mm)||rows[0].x_mm!==0;
 let svg=`<path class="sl-support-stroke" d="${horizontal?`M${ox} ${oy}H${tx(right)+24}V${height-22}`:`M${ox} ${oy}V${height-22}`}"/>`;
 svg+=`<g class="sl-panel-outline">${rows.map(p=>outline(p.name,tx(p.x_mm-p.width/2),ty(p.z_mm+p.height),p.width*scale,p.height*scale)).join('')}</g>`;
 svg+=rows.map(p=>{const x=tx(p.x_mm),y=ty(p.z_mm);return dot(x,y)+`<text class="sl-point-number" x="${x+7}" y="${y-7}">${p.order}</text>`;}).join('');
 svg+=`<rect class="sl-support-origin" x="${ox-3}" y="${oy-3}" width="6" height="6"/>${label(Math.max(5,ox-45),oy-12,'지주 끝')}`;
 return `<div class="sl-coordinate-picture"><svg viewBox="0 0 580 ${height}" role="img" aria-label="조합별 표지판 배치와 설치 기준점">${svg}</svg><div class="sl-coordinate-labels">${rows.map(p=>`<div><b>${p.order}</b><span>${e(p.name.replace('보조_사각형 ','보조사각 '))}<small>${p.width}×${p.height} mm</small></span><strong>X ${p.x_mm}<br>Z ${p.z_mm}</strong></div>`).join('')}</div></div><p class="sl-sub">빨간 점: 각 판의 설치 기준점 · X·Z 단위 mm · 지주 끝 기준</p>`;
}
