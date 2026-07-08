# P.A.W.S IG Public Site

這個資料夾是給主管或外部成員看的公開展示版。

## 內容

- `index.html`：入口頁，會自動前往 Dashboard
- `dashboard/`：可互動的 IG Dashboard
- `reports/`：完整文字報表

## 公開範圍

這包只放整理後的展示資料，不放原始 CSV、不放 `data/raw`、不放 `data/processed`。

## 更新方式

1. 先在私有專案更新官方 Meta 匯出資料
2. 重新產出 Dashboard / Report
3. 重新產出或覆蓋這個 `public_site`
4. 把 `public_site` 推到公開展示用 GitHub Pages repo

## 自動更新說明

GitHub Pages 會在公開 repo 收到新的 `public_site` 檔案後自動更新網站。

Meta 後台資料本身不會自動跑進網站；如果要做到全自動，需要另外建立官方資料更新流程，並把必要權限放在 GitHub Secrets 或其他安全憑證管理工具中。
