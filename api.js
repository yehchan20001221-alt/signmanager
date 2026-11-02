/* 재시작으로 거부된 요청만 토큰을 갱신해 재전송한다. 입력과 DB 버전은 보존한다. */
export function createApi(state,request=fetch){
 let refreshing=null,assets=null;
 async function api(path,body,retry=true){
  if(path==='/api/guide-assets'&&!body){
   if(!assets||assets.revision!==state.revision||Date.now()-assets.time>30000){
    const entry={revision:state.revision,time:Date.now()};
    entry.promise=send(path,body,retry).catch(error=>{if(assets===entry)assets=null;throw error;});assets=entry;
   }
   return globalThis.structuredClone(await assets.promise);
  }
  const changed=body&&(path==='/api/mutate'||/^\/api\/(guide-assets\/(import|assemble|background)|guide-plate-upload)(\?|$)/.test(path)||(path==='/api/guide-assets/split'&&!body.model?.startsWith('assembly_')));
  if(changed)assets=null;
  try{return await send(path,body,retry);}finally{if(changed)assets=null;}
 }
 async function send(path,body,retry){
  let response;
  try{response=await request(path,body?{method:'POST',headers:{'Content-Type':body instanceof Blob?'application/octet-stream':'application/json','X-Library-Token':state.csrfToken},body:body instanceof Blob?body:JSON.stringify(body)}:{});}
  catch{throw new Error(path==='/api/mutate'?'저장 응답을 확인하지 못했습니다. 다시 저장하기 전에 새로고침하여 값을 확인하세요.':'서버에 연결하지 못했습니다. 다시 불러오세요.');}
  if(body&&retry&&response.status===403&&response.headers.get('X-Library-Session')==='expired'){
   refreshing??=api('/api/session').then(session=>{
    if(typeof session.csrfToken!=='string'||!session.csrfToken)throw new Error('연결을 갱신하지 못했습니다. 다시 불러오세요.');
    state.csrfToken=session.csrfToken;
   }).finally(()=>{refreshing=null;});
   await refreshing;
   return api(path,body,false);
  }
  let result;try{result=await response.json();}catch{throw new Error('서버 응답을 읽지 못했습니다. 새로고침하여 값을 확인하세요.');}
  if(!response.ok)throw new Error(result.detail||'요청을 처리하지 못했습니다.');
  return result;
 }
 return api;
}
