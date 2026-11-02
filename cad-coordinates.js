/* CAD 영역을 좌하단 원점·긴 변 1000px로 환산하고 출력 크기에서만 배율을 적용한다. */
export function pixelRegions(boxes,frame){
 const valid=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
 const scale=valid(frame)?1000/Math.max(frame[2],frame[3]):0;
 return boxes.map(b=>scale&&valid(b)?{x:(b[0]-frame[0])*scale,y:(b[1]-frame[1])*scale,width:b[2]*scale,height:b[3]*scale}:null);
}
export function coordinateMarkup(rows,outputSize=2000,selected=-1){
 if(!rows.length)return '';
 const side=outputSize.toLocaleString('en-US'),display=v=>Math.round(v*outputSize/1000*100)/100;
 return `<header><h4>도안 자르기 좌표</h4><span>${side} × ${side} px · 판의 좌하단 기준</span></header><table aria-label="판별 CAD 이미지 좌하단 좌표와 잘라낼 크기"><thead><tr><th scope="col">판</th><th scope="col">X (px)</th><th scope="col">Y (px)</th><th scope="col">폭 (px)</th><th scope="col">높이 (px)</th></tr></thead><tbody>${rows.map((row,i)=>`<tr${selected>=0?` data-gsp-coordinate="${i}" class="${i===selected?'is-selected':''}"`:''}><th scope="row">${selected>=0?`<button type="button" data-gsp-select="${i}" aria-pressed="${i===selected}" aria-label="${i+1}번 판 선택">${i+1}번 판</button>`:`${i+1}번 판`}</th>${['x','y','width','height'].map(key=>`<td>${row?display(row[key]):'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
