/* 판·지주 공용 정투영 카메라. 이동량은 SVG 좌표, 배율은 모델 중심 기준이다. */
export const initial=()=>({yaw:-.55,pitch:-.2,zoom:1,x:0,y:0,mode:'orbit'});
export function orbit(camera,dx,dy){
 return {...camera,yaw:camera.yaw-dx*.008,pitch:Math.max(-Math.PI/2,Math.min(Math.PI/2,camera.pitch-dy*.008))};
}
export function pan(camera,dx,dy){return {...camera,x:camera.x+dx,y:camera.y+dy};}
export function zoom(camera,factor,point=[360,190]){
 const value=Math.max(.15,Math.min(12,camera.zoom*factor)),ratio=value/camera.zoom;
 return {...camera,zoom:value,x:(point[0]-360)*(1-ratio)+camera.x*ratio,y:(point[1]-190)*(1-ratio)+camera.y*ratio};
}
export function position(box,x,y){
 const scale=Math.min(box.width/720,box.height/380);
 return {scale,point:[(x-box.left-box.width/2)/scale+360,(y-box.top-box.height/2)/scale+190]};
}
export function viewport(box){
 if(!(box?.width>0&&box?.height>0))return [0,0,720,380];
 const scale=Math.min(box.width/720,box.height/380),width=box.width/scale,height=box.height/scale;
 return [(720-width)/2,(380-height)/2,width,height];
}
