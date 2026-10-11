import {APP_VERSION,compareVersions} from './core.js';
export function startUpdates({idle,onState}) {
  let registration=null,pending=false,checking=false,reloading=false,deferredReload=false,latest='',hadController=!!navigator.serviceWorker?.controller;
  const report=(message)=>onState({message,latest});
  function apply(){
    if(!registration?.waiting)return;
    if(!idle()){pending=true;report('新版本已備妥，關閉編輯視窗並完成查詢後會自動更新。');return;}
    pending=false;report('新版本下載完成，正在更新…');registration.waiting.postMessage({type:'APPLY_UPDATE'});
  }
  async function check(manual=false){
    if(checking)return;checking=true;
    try{
      if(!navigator.onLine)throw new Error('目前離線，連線後會再檢查。');
      const res=await fetch(new URL('version.json',import.meta.url),{cache:'no-store'});
      if(!res.ok)throw new Error(`更新資訊讀取失敗（${res.status}）。`);
      const data=await res.json();if(typeof data.version!=='string')throw new Error('更新版本資料格式錯誤。');
      latest=data.displayVersion || `V${data.version}`;
      if(!registration){report('已查到版本；此環境尚未啟用 Service Worker，請以 HTTPS 開啟。');return;}
      await registration.update();
      if(registration.waiting){apply();return;}
      if(registration.installing || compareVersions(data.version,APP_VERSION)!==0)report('正在下載或等待完整的新版本，完成後會自動更新。');
      else report(manual?'已是最新版本。':'自動檢查完成，已是最新版本。');
    }catch(e){report(e.message);}finally{checking=false;}
  }
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloading){if(idle()){reloading=true;location.reload();}else{deferredReload=true;report('更新已完成，關閉編輯視窗並完成查詢後會自動重新載入。');}}hadController=true;});
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
      registration=reg;
      if(reg.waiting)apply();
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&reg.waiting)apply();
        if(worker.state==='redundant')report('新版本下載或完整性驗證失敗，保留目前版本；稍後可重試。');
      });});
      check();
    }).catch(e=>report('離線功能啟用失敗：'+e.message));
  }else check();
  setInterval(()=>{if(deferredReload&&idle()&&!reloading){reloading=true;location.reload();}else if(pending)apply();},1500);
  window.addEventListener('online',()=>check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  return {check:()=>check(true),apply};
}
