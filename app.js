import {APP_VERSION,KEY,escapeHTML as esc,repoName,httpsURL,versionPath,createProject,mergeRepos,validateBackup,compareVersions} from './core.js';
import {GitHubClient} from './api.js';
import {SEED} from './seed.js';
import {startUpdates} from './update.js';
const $=id=>document.getElementById(id),client=new GitHubClient();
const STORAGE_KEY=KEY+':'+new URL('.',import.meta.url).pathname;
let state,editing=null,busy=false,intervalTimer,toastTimer,confirmResolve,installPrompt;
const expandedProjects=new Set();
try{const saved=localStorage.getItem(STORAGE_KEY);state=saved?JSON.parse(saved):structuredClone(SEED);const clean=validateBackup(state);state={...clean,cache:state.cache && typeof state.cache==='object'?state.cache:{},lastRefresh:state.lastRefresh||null,lastDiscovery:state.lastDiscovery||null};}
catch{state=structuredClone(SEED);setTimeout(()=>toast('本機資料無法讀取，已載入預設清單。請檢查備份。'),0);}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{toast('無法儲存設定，請匯出備份並檢查裝置空間。');return false;}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function date(value){if(!value)return '尚未查詢';const d=new Date(value);return Number.isNaN(d.getTime())?'日期未知':d.toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
function safeLink(value){try{return esc(httpsURL(value));}catch{return '#';}}
function badge(p,c){
  if(!navigator.onLine)return ['离線快取'.replace('离','離'),'warn'];
  if(c?.error || c?.deployedError)return [c?.error?'查詢需確認':'網站版未確認','warn'];
  if(c?.stale || c?.snapshot)return ['上次紀錄','warn'];
  if(c?.repo && c?.deployed){const cmp=compareVersions(c.repo.value,c.deployed.value);if(cmp===0)return ['版本一致','good'];if(cmp===1)return ['網站待更新','warn'];return ['版本有差異','warn'];}
  if(c?.repo)return ['儲存庫已查詢','good'];
  return [p.manualVersion?'手動記錄':'尚無版本',''];
}
function versionLine(p,c){
  const repo=c?.repo;
  let s=`<div class="versionrow mainversion"><span>儲存庫版本</span><strong>${esc(repo?.value || '未查到')}</strong></div>`;
  s+=`<p class="sourceline">${repo?`來源：<a href="${safeLink(repo.source)}" target="_blank" rel="noopener noreferrer">${esc(repo.kind)}</a> · ${esc(p.branch)}`:'可於編輯中指定版本檔路徑'}</p>`;
  s+=`<div class="versionrow"><span>網站版本</span><strong>${esc(c?.deployed?.value || (p.url?'未確認':'未設定網址'))}</strong></div>`;
  if(c?.deployed)s+=`<p class="sourceline">來源：<a href="${safeLink(c.deployed.source)}" target="_blank" rel="noopener noreferrer">網站版本檔</a></p>`;
  if(p.manualVersion)s+=`<div class="versionrow"><span>手動記錄</span><strong>${esc(p.manualVersion)}</strong></div>`;
  if(c?.error || c?.deployedError)s+=`<p class="small busyhint">${esc(c.error || c.deployedError)}</p>`;
  return s;
}
function renderHome(){
  const visible=state.projects.filter(p=>p.enabled), differences=visible.filter(p=>{const c=state.cache[p.id];return c?.repo&&c?.deployed&&compareVersions(c.repo.value,c.deployed.value)!==0;});
  $('stats').innerHTML=`<div class="stat"><strong>${visible.length.toString().padStart(2,'0')}</strong><span>顯示專案</span></div><div class="stat"><strong>${visible.filter(p=>p.favorite).length.toString().padStart(2,'0')}</strong><span>我的常用</span></div><div class="stat"><strong>${differences.length.toString().padStart(2,'0')}</strong><span>版本差異</span></div>`;
  const term=$('search').value.trim().toLowerCase(),filter=$('filter').value;
  let rows=visible.filter(p=>`${p.name} ${p.fullName}`.toLowerCase().includes(term));
  if(filter==='favorite')rows=rows.filter(p=>p.favorite);
  if(filter==='difference')rows=rows.filter(p=>differences.includes(p));
  if(filter==='error')rows=rows.filter(p=>{const c=state.cache[p.id];return !c?.repo||c?.error||c?.deployedError||c?.stale;});
  if($('sort').value==='name')rows.sort((a,b)=>a.name.localeCompare(b.name,'zh-TW'));
  else if($('sort').value==='checked')rows.sort((a,b)=>(Date.parse(state.cache[b.id]?.checkedAt)||0)-(Date.parse(state.cache[a.id]?.checkedAt)||0));
  else rows.sort((a,b)=>Number(b.favorite)-Number(a.favorite));
  $('visible-count').textContent=`${rows.length} 個`;
  $('cards').innerHTML=rows.length?rows.map(p=>{
    const c=state.cache[p.id],b=badge(p,c),repoURL=`https://github.com/${p.fullName}`;
    return `<article class="projectrow" role="listitem"><div class="list-summary"><div class="list-project"><h3 title="${esc(p.name)}">${p.favorite?'<span class="list-star" aria-label="常用">★</span> ':''}${esc(p.name)}</h3><a class="list-repo" href="${repoURL}" target="_blank" rel="noopener noreferrer" title="${repoURL}">${esc(p.fullName)}</a></div><div class="list-versions"><span class="list-label">儲存庫版本</span><strong title="${esc(c?.repo?.value || '未查到')}">${esc(c?.repo?.value || '未查到')}</strong><span class="list-deployed" title="網站版本：${esc(c?.deployed?.value || '未確認')}">網站 ${esc(c?.deployed?.value || '未確認')}</span></div><div class="list-status"><span class="badge ${b[1]}">${b[0]}</span><span class="list-checked">${date(c?.checkedAt)}</span></div><div class="list-open">${p.url?`<a class="openapp" href="${safeLink(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="開啟 ${esc(p.name)}">開啟 ↗</a>`:`<button data-action="edit" data-id="${p.id}" aria-label="設定 ${esc(p.name)} 的網址" ${busy?'disabled':''}>設定</button>`}</div></div><details class="project-details" data-project="${p.id}" ${expandedProjects.has(p.id)?'open':''}><summary aria-label="${esc(p.name)} 詳細資訊"><span>詳情</span></summary><div class="project-detail-content"><div class="detail-version"><h4>${esc(p.name)}</h4><span class="badge ${b[1]}">${b[0]}</span>${versionLine(p,c)}<p class="checked">${c?.stale || c?.snapshot?'上次成功':'查詢時間'}：${date(c?.checkedAt)}${c?.attemptedAt && c?.stale?` · 最近嘗試 ${date(c.attemptedAt)}`:''}</p></div><div class="detail-location"><div class="location"><span class="label">程式位置</span><a href="${repoURL}" target="_blank" rel="noopener noreferrer">${repoURL}</a></div><div class="location"><span class="label">PWA 網址 · ${esc(p.urlSource)}</span>${p.url?`<a href="${safeLink(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}</a>`:'尚未設定，請編輯專案'}</div><div class="detail-actions"><button data-action="favorite" data-id="${p.id}" class="${p.favorite?'favorite':''}" aria-pressed="${p.favorite}">${p.favorite?'★ 取消常用':'☆ 加入常用'}</button><button data-action="edit" data-id="${p.id}" ${busy?'disabled':''}>編輯專案</button></div></div></div></details></article>`;
  }).join(''):`<div class="empty"><h2>${visible.length?'找不到符合的專案':'尚未選擇顯示專案'}</h2><p>${visible.length?'請調整搜尋或篩選條件。':'到管理頁勾選想呈現的 PWA。'}</p><button data-action="manage">管理專案</button></div>`;
  if(!busy)$('refresh-status').textContent=state.lastRefresh?`最近查詢 ${date(state.lastRefresh)}`:'開啟後自動查詢';
}
function renderManage(){
  const q=$('manage-search').value.trim().toLowerCase();
  const rows=state.projects.filter(p=>`${p.name} ${p.fullName}`.toLowerCase().includes(q));
  $('manage-list').innerHTML=rows.length?rows.map(p=>{
    const i=state.projects.indexOf(p);
    return `<div class="manageitem ${p.enabled?'':'muteditem'}"><div class="manageinfo"><h3>${esc(p.name)}${p.favorite?' ★':''}</h3><p>${esc(p.fullName)}${p.private?' · 私人':''}</p></div><label class="switch"><input type="checkbox" data-action="toggle" data-id="${p.id}" ${p.enabled?'checked':''}><span>顯示</span></label><div class="manageactions"><button data-action="up" data-id="${p.id}" aria-label="上移 ${esc(p.name)}" ${i===0||busy?'disabled':''}>↑</button><button data-action="down" data-id="${p.id}" aria-label="下移 ${esc(p.name)}" ${i===state.projects.length-1||busy?'disabled':''}>↓</button><button data-action="edit" data-id="${p.id}" ${busy?'disabled':''}>編輯</button><button data-action="delete" data-id="${p.id}" ${busy?'disabled':''}>移除</button></div></div>`;
  }).join(''):'<div class="empty"><h2>沒有符合的專案</h2><p>可同步 GitHub 清單，或手動新增儲存庫。</p></div>';
}
function render(){renderHome();renderManage();$('quota').textContent=client.remaining===null?'查詢額度：尚未取得':`GitHub API 剩餘額度：${client.remaining}（版本檔使用公開 raw 位址時不耗用此額度）`;}
function setBusy(value){busy=value;for(const id of ['refresh','discover','add-project','import','show-all','hide-all','apply-token','clear-token'])$(id).disabled=value;$('refresh').textContent=value?'查詢中…':'↻ 更新版本';$('cards').setAttribute('aria-busy',String(value));render();}
async function refresh(force=true){
  if(busy)return;
  if(!navigator.onLine){toast('目前離線，顯示上次紀錄。');render();return;}
  if(!force&&(document.querySelector('dialog[open]') || (state.lastRefresh&&Date.now()-Date.parse(state.lastRefresh)<300000)))return;
  const rows=state.projects.filter(p=>p.enabled).map(p=>({...p}));
  if(!rows.length){toast('請先選擇要呈現的專案。');return;}
  setBusy(true);let cursor=0,done=0,fail=0;
  async function worker(){while(cursor<rows.length){const p=rows[cursor++],old=state.cache[p.id]||{},next={...old,snapshot:false,attemptedAt:new Date().toISOString(),error:'',deployedError:''};
    const [repo,deployed]=await Promise.allSettled([client.repositoryVersion(p),client.deployedVersion(p)]);
    if(repo.status==='fulfilled'){next.repo=repo.value;next.checkedAt=new Date().toISOString();next.stale=false;}
    else{next.stale=true;next.error=repo.reason.message;fail++;}
    if(deployed.status==='fulfilled'){next.deployed=deployed.value;if(!deployed.value&&p.url)next.deployedError='網站未提供可讀的版本檔。';}
    else{next.deployedError=deployed.reason.message;next.deployed=null;}
    state.cache[p.id]=next;done++;$('refresh-status').textContent=`查詢中 ${done}/${rows.length}`;render();persist();
  }}
  try{await Promise.all([worker(),worker(),worker()]);state.lastRefresh=new Date().toISOString();persist();toast(`已查詢 ${done} 個專案${fail?`，${fail} 個需確認`:''}。`);}finally{setBusy(false);}
}
async function discover(silent=false){
  if(busy)return;if(!navigator.onLine){toast('同步清單需要網路。');return;}
  setBusy(true);
  try{const rows=await client.repos(state.settings.account,state.settings.kind);const before=state.projects.length;const merged=mergeRepos(state.projects,rows);if(merged.length>500)throw new Error('合併後超過 500 個專案，請改用個別新增。');state.projects=merged;state.lastDiscovery=new Date().toISOString();persist();if(!silent)toast(`讀取 ${rows.length} 個儲存庫，新增 ${state.projects.length-before} 個專案。`);}catch(e){toast(e.message);}finally{setBusy(false);}
}
function fillSettings(){for(const k of ['account','kind','interval','theme'])$(k).value=state.settings[k];document.documentElement.dataset.theme=state.settings.theme;}
function schedule(){clearInterval(intervalTimer);if(state.settings.interval)intervalTimer=setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))refresh(false);},state.settings.interval*60000);}
function route(){const page=['home','manage','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'home';document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==page);document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('main').scrollTop=0;}
function openEditor(id=null){if(busy)return;editing=id;const p=state.projects.find(p=>p.id===id);$('editor-title').textContent=p?'編輯專案':'新增專案';$('editor-error').textContent='';$('edit-repo').value=p?.fullName||'';$('edit-repo').readOnly=!!p;$('edit-name').value=p?.name||'';$('edit-url').value=p?.url||'';$('edit-branch').value=p?.branch||'';$('edit-path').value=p?.path||'version.json';$('edit-deployed-path').value=p?.deployedPath||'version.json';$('edit-manual').value=p?.manualVersion||'';$('edit-enabled').checked=p?.enabled??true;$('edit-favorite').checked=p?.favorite??false;$('editor').showModal();}
async function saveEditor(event){
  event.preventDefault();$('editor-error').textContent='';$('save-project').disabled=true;
  try{
    const fullName=repoName($('edit-repo').value),id=fullName.toLowerCase();
    let p=editing?{...state.projects.find(p=>p.id===editing)}:null;
    if(!editing&&state.projects.length>=500)throw new Error('最多支援 500 個專案。');
    if(!editing&&state.projects.some(p=>p.id===id))throw new Error('此儲存庫已存在，可直接編輯現有專案。');
    const url=httpsURL($('edit-url').value.trim()),path=versionPath($('edit-path').value),deployedPath=versionPath($('edit-deployed-path').value);
    const branch=$('edit-branch').value.trim();
    if(branch && /[\x00-\x20~^:?*\[\\]/.test(branch))throw new Error('分支名稱包含無效字元。');
    if(!p){
      let r;try{r=await client.metadata(fullName);}catch(e){throw new Error('新增失敗：'+e.message+'；離線時可透過匯入備份還原。');}
      p=createProject(r);
    }
    const effectiveURL=url || (editing?'':p.url);
    const customURL=editing?(effectiveURL!==p.url||!!p.customURL):!!url&&url!==p.url;
    const name=$('edit-name').value.trim() || p.name;
    const next={...p,fullName,id,name,customName:name!==p.name||p.customName,url:effectiveURL,customURL,urlSource:effectiveURL!==p.url?'自訂':p.urlSource,path,deployedPath,manualVersion:$('edit-manual').value.trim(),branch:branch||p.branch,customBranch:!!branch&&(branch!==p.branch||!!p.customBranch),enabled:$('edit-enabled').checked,favorite:$('edit-favorite').checked};
    if(editing){const i=state.projects.findIndex(p=>p.id===editing);state.projects[i]=next; if(p.path!==next.path||p.branch!==next.branch||p.url!==next.url||p.deployedPath!==next.deployedPath)delete state.cache[id];}
    else state.projects.push(next);
    persist();$('editor').close();render();toast('專案已儲存。');
  }catch(e){$('editor-error').textContent=e.message;}finally{$('save-project').disabled=false;}
}
function confirm(title,message){$('confirm-title').textContent=title;$('confirm-text').textContent=message;$('confirm-dialog').showModal();return new Promise(resolve=>confirmResolve=resolve);}
function finishConfirm(value){const r=confirmResolve;confirmResolve=null;$('confirm-dialog').close();r?.(value);}
async function action(event){
  const b=event.target.closest('[data-action]');if(!b)return;
  const a=b.dataset.action,id=b.dataset.id,p=state.projects.find(p=>p.id===id);
  if(a==='manage'){location.hash='manage';return;}if(!p)return;
  if(a==='edit'){openEditor(id);return;}
  if(a==='favorite')p.favorite=!p.favorite;
  if(a==='toggle')p.enabled=b.checked;
  if(a==='up'||a==='down'){if(busy)return;const i=state.projects.indexOf(p),j=i+(a==='up'?-1:1);if(j>=0&&j<state.projects.length)[state.projects[i],state.projects[j]]=[state.projects[j],state.projects[i]];}
  if(a==='delete'){if(busy)return;if(!await confirm('移除專案',`移除「${p.name}」的本機設定？GitHub 儲存庫不會被刪除。只想不顯示時，可取消勾選「顯示」。`))return;state.projects=state.projects.filter(x=>x.id!==id);delete state.cache[id];}
  persist();render();
}
function downloadJSON(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('cards').addEventListener('click',action);
$('cards').addEventListener('toggle',e=>{const d=e.target;if(!d.matches?.('details[data-project]')||!d.isConnected)return;if(d.open)expandedProjects.add(d.dataset.project);else expandedProjects.delete(d.dataset.project);},true);
$('manage-list').addEventListener('click',e=>{if(e.target.closest('[data-action="toggle"]'))return;action(e);});$('manage-list').addEventListener('change',action);
$('search').addEventListener('input',renderHome);$('filter').addEventListener('change',renderHome);$('sort').addEventListener('change',renderHome);$('manage-search').addEventListener('input',renderManage);
$('refresh').addEventListener('click',()=>refresh());$('discover').addEventListener('click',()=>discover());$('add-project').addEventListener('click',()=>openEditor());$('editor-form').addEventListener('submit',saveEditor);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.close==='confirm-dialog')finishConfirm(false);else $(b.dataset.close).close();}));
$('confirm-yes').addEventListener('click',()=>finishConfirm(true));$('confirm-no').addEventListener('click',()=>finishConfirm(false));$('confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();finishConfirm(false);});
$('show-all').addEventListener('click',()=>{state.projects.forEach(p=>p.enabled=true);persist();render();});
$('hide-all').addEventListener('click',()=>{state.projects.forEach(p=>p.enabled=false);persist();render();});
$('settings-form').addEventListener('submit',e=>{e.preventDefault();if(busy){toast('請等待查詢完成。');return;}const account=$('account').value.trim();if(!/^[a-z\d-]{1,39}$/i.test(account)){toast('GitHub 帳號格式不正確。');return;}state.settings={...state.settings,account,kind:$('kind').value,interval:Number($('interval').value)};persist();schedule();toast('設定已儲存，可到管理頁同步清單。');});
$('theme').addEventListener('change',()=>{state.settings.theme=$('theme').value;document.documentElement.dataset.theme=state.settings.theme;persist();});
$('apply-token').addEventListener('click',()=>{client.token=$('token').value.trim();$('token').value='';client.blockedUntil=0;client.remaining=null;render();toast(client.token?'Token 已套用，僅本次開啟有效。':'尚未填入 Token。');});
$('clear-token').addEventListener('click',()=>{client.token='';$('token').value='';client.blockedUntil=0;toast('Token 已清除。');});
$('export').addEventListener('click',()=>downloadJSON({schemaVersion:1,exportedAt:new Date().toISOString(),settings:state.settings,projects:state.projects},`PWA-ProjectHub-backup-${new Date().toISOString().slice(0,10)}.json`));
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2_000_000)throw new Error('備份檔超過 2 MB。');const next=validateBackup(JSON.parse(await file.text()));if(!await confirm('匯入備份',`將以備份中的 ${next.projects.length} 個專案取代目前設定。確定匯入？`))return;state=next;persist();fillSettings();schedule();render();toast('備份已匯入，請更新版本取得最新資料。');}catch(e){toast('匯入失敗：'+e.message);}});
function online(){const isOnline=navigator.onLine;$('online').textContent=isOnline?'已連線':'離線';$('online').classList.toggle('offline',!isOnline);renderHome();}
window.addEventListener('online',()=>{online();refresh(false);});window.addEventListener('offline',online);window.addEventListener('hashchange',route);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});
fillSettings();route();render();online();schedule();
const updater=startUpdates({idle:()=>!busy&&!document.querySelector('dialog[open]'),onState:({message,latest})=>{$('latest-version').textContent=latest||'尚未取得';$('update-status').textContent=message;}});
$('check-update').addEventListener('click',()=>updater.check());
setTimeout(async()=>{if(navigator.onLine&&(!state.lastDiscovery||Date.now()-Date.parse(state.lastDiscovery)>1800000))await discover(true);await refresh(false);},250);
