export const APP_VERSION = '1.0.1';
export const KEY = 'projecthub-gd-v1';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function repoName(value) {
  let s = String(value || '').trim().replace(/\/$/, '');
  if (s.startsWith('https://github.com/')) s = s.slice(19).split('/').slice(0, 2).join('/');
  s = s.replace(/\.git$/, '');
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(s) || s.split('/')[1] === '..') throw new Error('請輸入 owner/repository 或 GitHub 儲存庫網址。');
  return s;
}
export function httpsURL(value) {
  if (!value) return '';
  const u = new URL(String(value));
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('網址須為 HTTPS，且不可包含帳號密碼。');
  return u.href;
}
export function versionPath(value) {
  const s = String(value || 'version.json').trim();
  if (s.length > 240 || /[?#\\]/.test(s) || s.startsWith('/') || s.split('/').some(x => !x || x === '.' || x === '..')) throw new Error('版本路徑請填相對路徑，例如 version.json 或 docs/version.json。');
  return s;
}
export function readVersion(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  for (const k of ['displayVersion', 'version', 'appVersion', 'latestVersion']) {
    const s = data[k];
    if (typeof s === 'string' && s.trim() && s.length <= 80) return {value:s.trim(),date:String(data.updatedAt || data.releasedAt || data.releaseDate || '')};
  }
  return null;
}
export function normalizedVersion(v) { return String(v || '').trim().replace(/^v/i, '').replace(/_/g, '.'); }
export function compareVersions(a, b) {
  const parse = x => normalizedVersion(x).match(/^(\d+(?:\.\d+)*)(?:-([\da-z.-]+))?(?:\+[\da-z.-]+)?$/i);
  const x = parse(a), y = parse(b);
  if (!x || !y) return normalizedVersion(a) === normalizedVersion(b) ? 0 : null;
  const aa=x[1].split('.').map(Number), bb=y[1].split('.').map(Number);
  for (let i=0;i<Math.max(aa.length,bb.length);i++) if ((aa[i]||0)!==(bb[i]||0)) return (aa[i]||0)>(bb[i]||0)?1:-1;
  if (!x[2] && !y[2]) return 0;
  if (!x[2]) return 1; if (!y[2]) return -1;
  const ap=x[2].split('.'), bp=y[2].split('.');
  for(let i=0;i<Math.max(ap.length,bp.length);i++) {
    if(ap[i]===bp[i]) continue;
    if(ap[i]===undefined) return -1; if(bp[i]===undefined) return 1;
    const an=/^\d+$/.test(ap[i]),bn=/^\d+$/.test(bp[i]);
    if(an&&bn) return Number(ap[i])>Number(bp[i])?1:-1;
    if(an!==bn) return an?-1:1;
    return ap[i]>bp[i]?1:-1;
  }
  return 0;
}
export function inferredPages(fullName) {
  const [owner, repo] = repoName(fullName).split('/');
  return `https://${owner.toLowerCase()}.github.io/${repo.toLowerCase()===`${owner.toLowerCase()}.github.io`?'':encodeURIComponent(repo)+'/'}`;
}
export function createProject(r) {
  const fullName=repoName(r.fullName || r.full_name);
  const homepage = (()=>{try{return httpsURL(r.homepage)}catch{return ''}})();
  const hasPages=!!(r.hasPages ?? r.has_pages);
  return {id:fullName.toLowerCase(),fullName,name:r.name || fullName.split('/')[1],description:r.description || '',branch:r.branch || r.default_branch || 'main',private:!!r.private,hasPages,enabled:hasPages || /pwa/i.test(fullName),favorite:false,url:homepage || (hasPages?inferredPages(fullName):''),urlSource:homepage?'GitHub homepage':hasPages?'依 Pages 規則推定':'未設定',path:'version.json',deployedPath:'version.json',manualVersion:'',customURL:false,customName:false};
}
export function mergeRepos(projects, repos) {
  const out=projects.map(p=>({...p}));
  for(const r of repos){
    const p=createProject(r), old=out.find(x=>x.id===p.id);
    if(!old){out.push(p);continue;}
    old.private=p.private;old.hasPages=p.hasPages;if(!old.customBranch)old.branch=p.branch;old.description=p.description;
    if(!old.customURL){old.url=p.url;old.urlSource=p.urlSource;}
    if(!old.customName)old.name=p.name;
  }
  return out;
}
export function validateBackup(data) {
  if(data?.schemaVersion!==1 || !Array.isArray(data.projects) || data.projects.length>500) throw new Error('備份格式不正確，最多支援 500 個專案。');
  const seen=new Set();
  const projects=data.projects.map(p=>{
    const fullName=repoName(p.fullName),id=fullName.toLowerCase();
    if(seen.has(id))throw new Error('備份含重複儲存庫。');seen.add(id);
    const q=createProject({fullName});
    return {...q,id,name:String(p.name || q.name).slice(0,100),branch:String(p.branch || 'main').slice(0,150),customBranch:!!p.customBranch,enabled:p.enabled!==false,favorite:!!p.favorite,url:httpsURL(p.url),urlSource:String(p.urlSource || '自訂').slice(0,60),path:versionPath(p.path),deployedPath:versionPath(p.deployedPath),manualVersion:String(p.manualVersion || '').slice(0,80),customURL:!!p.customURL,customName:!!p.customName,private:!!p.private,hasPages:!!p.hasPages};
  });
  const account=String(data.settings?.account || 'lihe-source');
  if(!/^[a-z\d-]{1,39}$/i.test(account))throw new Error('GitHub 帳號格式不正確。');
  return {schemaVersion:1,projects,settings:{account,kind:data.settings?.kind==='org'?'org':'user',theme:data.settings?.theme==='light'?'light':'dark',interval:[0,15,30,60].includes(Number(data.settings?.interval))?Number(data.settings.interval):30},cache:{},lastRefresh:null};
}
