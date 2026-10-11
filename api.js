import {readVersion,versionPath,httpsURL,repoName} from './core.js';
export class GitHubClient {
  constructor(){this.token='';this.remaining=null;this.reset=null;this.blockedUntil=0;}
  async request(url, {api=false, text=false, optional=false}={}) {
    if(api && this.blockedUntil>Date.now())throw new Error(`GitHub 暫時限制查詢，請於 ${new Date(this.blockedUntil).toLocaleTimeString('zh-TW')} 後重試。`);
    const u=new URL(url),headers={};
    if(api){if(u.origin!=='https://api.github.com')throw new Error('GitHub API 位址無效。');headers.Accept='application/vnd.github+json';headers['X-GitHub-Api-Version']='2026-03-10';if(this.token)headers.Authorization=`Bearer ${this.token}`;}
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
    try{
      const res=await fetch(u.href,{headers,signal:ctrl.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(api){const n=res.headers.get('x-ratelimit-remaining');if(n!==null)this.remaining=Number(n);this.reset=Number(res.headers.get('x-ratelimit-reset')||0)*1000;}
      if(res.status===404&&optional)return null;
      if(!res.ok){
        if(res.status===429 || (res.status===403&&this.remaining===0)){const retry=Number(res.headers.get('retry-after'));this.blockedUntil=retry?Date.now()+retry*1000:this.reset>Date.now()?this.reset:Date.now()+60000;throw new Error('GitHub 查詢額度用完，已保留上次結果，請稍後重試。');}
        if(res.status===401)throw new Error('GitHub Token 無效或已過期。');
        if(res.status===404)throw new Error('找不到儲存庫，或目前沒有讀取權限。');
        throw new Error(`查詢失敗（HTTP ${res.status}）`);
      }
      const body=await res.text();if(body.length>4_000_000)throw new Error('回應過大，無法讀取。');
      if(text)return body;
      try{return JSON.parse(body);}catch{throw new Error('回應不是有效的 JSON 版本資料。');}
    }catch(e){if(e.name==='AbortError')throw new Error('查詢逾時，已保留上次資料。');if(e instanceof TypeError)throw new Error('無法連線：請檢查網路，或網站是否允許跨來源讀取。');throw e;}finally{clearTimeout(timer);}
  }
  async repos(account,kind='user') {
    if(!/^[a-z\d-]{1,39}$/i.test(account))throw new Error('請填正確的 GitHub 帳號。');
    let endpoint=kind==='org'?`/orgs/${account}/repos`:`/users/${account}/repos`;
    if(this.token && kind==='user'){
      const me=await this.request('https://api.github.com/user',{api:true});
      if(me.login?.toLowerCase()===account.toLowerCase())endpoint='/user/repos';
    }
    const out=[];
    for(let page=1;page<=10;page++){
      const rows=await this.request(`https://api.github.com${endpoint}?per_page=100&page=${page}&sort=updated&type=all`,{api:true});
      if(!Array.isArray(rows))throw new Error('GitHub 回應格式不正確。');
      out.push(...rows.filter(r=>r.owner?.login?.toLowerCase()===account.toLowerCase()));
      if(rows.length<100)return out;
    }
    throw new Error('儲存庫超過 1,000 個，請以個別新增方式管理。');
  }
  async metadata(fullName){return this.request(`https://api.github.com/repos/${repoName(fullName)}`,{api:true});}
  async repositoryVersion(p){
    const path=versionPath(p.path),encoded=path.split('/').map(encodeURIComponent).join('/');
    let data,source;
    if(p.private){
      source=`https://github.com/${p.fullName}/blob/${encodeURIComponent(p.branch)}/${encoded}`;
      const d=await this.request(`https://api.github.com/repos/${p.fullName}/contents/${encoded}?ref=${encodeURIComponent(p.branch)}`,{api:true,optional:true});
      if(d?.encoding==='base64')data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(d.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
    }else{
      source=`https://raw.githubusercontent.com/${p.fullName}/${encodeURIComponent(p.branch)}/${encoded}`;
      data=await this.request(source,{optional:true});
    }
    if(data){const v=readVersion(data);if(!v)throw new Error('版本檔未包含 version / displayVersion / appVersion / latestVersion。');return {...v,source,kind:'版本檔'};}
    const release=await this.request(`https://api.github.com/repos/${p.fullName}/releases/latest`,{api:true,optional:true});
    if(release?.tag_name)return {value:release.tag_name,date:release.published_at || '',source:release.html_url,kind:'正式 Release'};
    const tags=await this.request(`https://api.github.com/repos/${p.fullName}/tags?per_page=1`,{api:true});
    if(tags?.[0])return {value:tags[0].name,date:'',source:`https://github.com/${p.fullName}/tree/${encodeURIComponent(tags[0].name)}`,kind:'GitHub 第一筆 Tag（非發布排序）'};
    return null;
  }
  async deployedVersion(p){
    if(!p.url)return null;
    const base=new URL(httpsURL(p.url));base.search='';base.hash='';
    // 相對於網站所在目錄；index.html 會自然解析成同一目錄。
    if(!base.pathname.endsWith('/')&&!/\.[a-z\d]+$/i.test(base.pathname.split('/').pop()))base.pathname+='/';
    const url=new URL(versionPath(p.deployedPath),base);
    const d=await this.request(url.href,{optional:true});
    if(!d)return null;
    const v=readVersion(d);if(!v)throw new Error('網站版本檔格式無法辨識。');
    return {...v,source:url.href,kind:'網站版本檔'};
  }
}
