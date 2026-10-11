"""修改程式後產生一致的版本與 SHA-256 清單；僅在開發者電腦執行。"""
import argparse, datetime, hashlib, json, pathlib, re, time

root = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description='重新產生 PWA 更新版本與檔案校驗資料')
parser.add_argument('--version', default='1.0.0', help='例如 1.0.1（不含 V）')
args = parser.parse_args()
if not re.fullmatch(r'\d+\.\d+\.\d+', args.version):
    parser.error('版本必須為三段數字，例如 1.0.1')
build = str(int(time.time() * 1000))
core = root / 'core.js'
core.write_text(re.sub(r"export const APP_VERSION = '[^']+';", f"export const APP_VERSION = '{args.version}';", core.read_text()), encoding='utf-8')
sw = root / 'sw.js'
code = re.sub(r"const BUILD='[^']+';", f"const BUILD='{build}';", sw.read_text())
code = re.sub(r"const APP_VERSION='[^']+';", f"const APP_VERSION='{args.version}';", code)
sw.write_text(code, encoding='utf-8')
index = root / 'index.html'
code = re.sub(r'(id="(?:header-version|current-version)">)V[^<]+', rf'\g<1>V{args.version}', index.read_text())
index.write_text(code, encoding='utf-8')
files = ['index.html','styles.css','app.js','core.js','api.js','seed.js','update.js','manifest.webmanifest','favicon.svg','icon-192.png','icon-512.png','apple-touch-icon.png']
payload = {'appId':'pwa-projecthub-gd','version':args.version,'displayVersion':'V'+args.version,'build':build,'schemaVersion':1,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in files}}
(root/'version.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('已產生 V'+args.version+'，build '+build+'，'+str(len(files))+' 個檔案雜湊。')
