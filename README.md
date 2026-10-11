# PWA 專案總覽 V1.0.1

可部署於 GitHub Pages 的純前端 PWA，無需 Node.js、Google 登入或後端服務。程式介面使用繁體中文，預設深色，可切換淺色。

## V1.0.1 列表版

首頁改為每個專案一列，直接顯示名稱、程式位置、儲存庫版本、網站版本與開啟按鈕。電腦／平板另列狀態及查詢時間；手機使用緊湊三欄排列，無須橫向捲動。較長名稱與版號可按「詳情」查看完整內容、資料來源、網址、錯誤提示並編輯或設定常用。查詢進行時會保留已展開的詳情。

頂部標題、統計與搜尋工具也縮小，讓同一畫面可看更多專案。原有隱藏、排序、搜尋、備份及自動更新功能保留；部署到相同儲存庫路徑會沿用原有本機設定。

## 立即部署

1. 在 `lihe-source` 帳號建立一個 **Public** 儲存庫，建議名稱 `PWA-ProjectHub-GD`。
2. 解壓縮 ZIP，開啟 `PWA-ProjectHub-GD-V1_0_1` 資料夾。將**裡面的全部檔案**上傳到 GitHub 儲存庫的 `main` 根目錄。不要再把外層資料夾一起上傳，也不要只上傳 ZIP。手機檔案選擇器可能隱藏 `.nojekyll`；它是選用的，這個純靜態專案未包含需 Jekyll 忽略的底線目錄。
3. GitHub → 儲存庫 **Settings → Pages**。
4. **Source：Deploy from a branch**；**Branch：main**；**Folder：/(root)**；按 **Save**。
5. 等待 GitHub Pages 部署完成，在 Pages 設定頁開啟它顯示的網址。若使用上述帳號和儲存庫名稱，網址為 `https://lihe-source.github.io/PWA-ProjectHub-GD/`。
6. iPhone／iPad：Safari 開啟網址 → 分享 → 加入主畫面。Windows：Edge／Chrome 開啟網址後使用「安裝應用程式」。

本 ZIP 為待部署的完整程式，沒有自動寫入 GitHub 或啟用 Pages。不要直接雙擊 index.html：ES Modules、網路與 Service Worker 需要 HTTP／HTTPS。GitHub Pages 提供 HTTPS。

官方部署文件：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 專案清單

- 預設帳號為 `lihe-source`，附有製作時實際讀取的 13 個公開儲存庫；12 個有可辨識版本檔。首頁預設顯示 10 個專案，示範版與 UI 項目先隱藏，可在管理頁勾選。
- 「專案總覽」列出名稱、儲存庫版本、網站版本、GitHub 程式位置、PWA 開啟網址、資料來源與查詢時間。
- 「管理專案」可新增／編輯、顯示／隱藏、常用標記、上下排序、移除本機項目與同步 GitHub 清單。首頁「自訂順序」會先列出常用項目，再依管理頁順序排列。
- 「移除」只移除本機紀錄，**不刪除 GitHub 儲存庫**；重新同步仍會發現此專案。若希望一直不顯示，取消勾選「顯示」，同步時會保留此選擇。
- GitHub 清單同步不會刪除既有專案，也不覆蓋自訂名稱、網址、分支或隱藏狀態。
- 各裝置的顯示設定獨立保存；可從設定匯出／匯入 JSON 備份搬移。沒有跨裝置自動同步。
- 開啟程式時，距離上次同步清單超過 30 分鐘就自動讀取 GitHub 清單；仍保留隱藏與自訂設定。首次開啟自動查詢顯示項目的版本；之後開啟／回到前景時，距離上次查詢不足 5 分鐘會沿用結果。可設定每 15／30／60 分鐘自動查詢；手動按「更新版本」可立即查詢。隱藏專案不耗用版本查詢請求。

## 版本判讀規則

1. **儲存庫版本**：從選定分支的 `version.json` 讀取，優先顯示 `displayVersion`，其次 `version`、`appVersion`、`latestVersion`。版本值必須為字串；支援 V1_2_3、V1.2.3、1.2.3。
2. 版本檔不存在（404）時，才依序讀 GitHub 最新正式 Release、GitHub 第一筆 Tag。**Tag API 第一筆不保證是最高版號或最新發布**，介面會標示它的來源。版本檔網路錯誤或格式不正確時，不會用其他來源掩蓋錯誤。
3. 找不到上述任何版本時顯示「未查到」，不以 commit 日期推估版本。手動版本另行顯示，不會宣稱是即時最新版本。
4. **網站版本**：以 PWA 網址讀取網站內的版本檔。網站可能未部署最新版、未放版本檔或未允許 CORS；此時顯示「未確認」，不把 GitHub 版本冒充已部署版本。若網站有可讀版本，才比較兩者。
5. 「版本一致」代表兩個版本檔文字經正規化後一致，不代表已完整稽核該網站所有功能。
6. PWA 網址優先採 GitHub `homepage`；若有啟用 Pages 而沒填 homepage，依 GitHub Pages 的一般規則推定，清楚標示「依 Pages 規則推定」。自訂網域、/docs 目錄或特殊部署路徑，可在編輯頁改成實際網址。
7. 自訂版本檔路徑例：`version.json`、`docs/version.json`、`package.json`（包含 version 字串）。網站版本檔路徑相對於 PWA 網址的所在目錄，不是相對於 GitHub 儲存庫。

建議每個 PWA 都附上：

```json
{"version":"1.2.3","displayVersion":"V1.2.3","updatedAt":"2026-10-11"}
```

## 私人儲存庫與查詢額度

公開專案預設不用 Token。設定頁可選填具有目標儲存庫 Contents 讀取權限的 GitHub Token：只放在本次執行的記憶體，只送往 `api.github.com`，不寫入本機永久設定、備份或程式檔。關閉／重新載入後須重新填入。API 會依 Token 權限回傳可讀取的私人專案；公開版本檔使用 raw.githubusercontent.com，不占 REST API 主要額度。

未登入的 REST API 額度通常為每小時 60 次／來源 IP。共用網路其他使用者也可能耗用；遇限流會保留上次結果並等待重設，不會持續重試。Token 僅用於 GitHub，不會傳給 PWA 網站。

官方文件：https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## 本程式自動更新

- 右上角顯示目前版本；設定頁顯示目前／最新版本與「檢查更新」。
- 開啟、回到前景、恢復連線會取得本程式 `version.json` 並檢查 Service Worker 更新。
- 新版本的所有程式檔必須下載完成，並通過 version.json 的 SHA-256 完整性比對，才會切換版本；下載或部署不完整時保留舊版本。
- 有編輯／確認視窗或版本查詢正在執行時，會等完成後再自動套用並重新載入，保留已儲存的專案設定。
- 這項自動更新只更新**本專案總覽 PWA**；其他 PWA 的更新由各自程式負責，本總覽只顯示及比較版本。
- 日後改程式後，使用 Python 3 執行 `python UPDATE_BUILD.py --version 1.0.2`，它會同步 APP_VERSION、Service Worker build、頁面版號及各檔案雜湊；再完整上傳更新後的檔案。第一次部署此 ZIP **不用執行**。
- 程式不會清除同一網域其他 PWA 的快取；Service Worker、快取與本機設定均以本儲存庫路徑區隔。

## 離線與排錯

- 首次成功線上開啟並完成快取後，可離線開啟總覽，查看上次資料、修改現有專案與匯出備份。新增儲存庫需要連線驗證；離線可匯入有效備份。
- 404：確認 owner/repo、預設分支及版本檔路徑；私人專案確認 Token 權限。
- 「網站版未確認」：先開啟 PWA，確認版本檔存在；跨來源讀取失敗時，儲存庫版本仍可顯示。
- 網址不正確：編輯「PWA 開啟網址」，填 GitHub Pages 實際發佈網址。
- 版本更新未套用：確認完整檔案與 version.json / sw.js 來自同一版本，Pages 部署成功，並等編輯視窗關閉／查詢結束。
- 清除瀏覽器網站資料會清除專案設定；定期匯出備份可還原。

驗證狀態與限制請見 TEST_REPORT.md。
