# 拾页｜个人博客

一个无构建步骤的静态博客。网站托管在 Vercel，文章从 Google Sheets 的公开 CSV 页面读取；更新文章只需要编辑表格并标记为「已发布」，不需要重新部署网站。

文章库：[打开「拾页｜博客文章库」Google Sheet](https://docs.google.com/spreadsheets/d/12YW6WVjct_JcBxJjcZRI30Vyg6dkHxdpHYbrWa-Glh8/edit)

## 文章表格

文章库使用两个工作表：

- **Articles**：撰写和维护文章，`发布状态` 可填 `草稿` 或 `已发布`。
- **Public Feed**：只导出已发布文章。网站只连接此工作表，因此草稿不会出现在公开 CSV 中。

字段依序为：`标题`、`网址标识`、`摘要`、`分类`、`发布日期`（使用 `YYYY-MM-DD`）、`封面图片 URL`、`正文`、`发布状态`。

### 中英切换

网站右上角的 `EN / 中文` 按钮会切换界面语言，并在同一浏览器记住选择。英文文章使用同一网址标识；`Articles` 已有独立的 `英文标题`、`英文摘要`、`英文正文`、`英文分类` 列，`Public Feed` 会自动导出这些列。英文正文支持与中文正文相同的 Markdown 格式。至少填写 `英文标题` 与 `英文正文` 后，英文阅读页才显示译文；否则显示“English version coming soon”，并提供中文版入口。英文标签、摘要、字数和阅读时间均按英文列呈现；多分类的 `英文分类` 按中文分类的顺序以逗号分隔填写。未填写英文分类时，常见分类会由网站翻译。网站不会自动翻译文章。

Notion 模板的英文标题与简介可在 `site-config.js` 的模板条目中填写 `titleEn` 和 `descriptionEn`；缺少英文简介时会显示准备中的提示。

一篇文章可有多个分类：在同一个 `分类` 单元格填写 `心理学, AI 与效率`（中文逗号也可）。网站会分别显示每个分类，并可用任一分类筛选；重复分类会自动合并，留空则归为「随手记」。

正文支持基础 Markdown：空行分段、`## 小标题`、`### 小标题`、`- 清单`、`1. 有序清单`、`> 引言`、`**粗体**`、`*斜体*`、`` `代码` `` 和 `[链接文字](https://example.com)`。在想插图的段落之间，单独写一行 `![图片说明](https://example.com/photo.jpg)`，前后各留一个空行；图片说明会作为替代文字和图注，留空则不显示图注。封面栏和正文图片都可以填写 Google Drive 图片的「分享 → 复制链接」网址，例如 `https://drive.google.com/file/d/文件ID/view?usp=sharing`；请将该图片的「一般访问权限」设为「知道链接的任何人」并保持文件可访问。网站会把 Drive 分享页链接转换为图片请求。也可以使用可公开直接访问的 HTTP/HTTPS 图片网址。为保护网站，文章正文里的 HTML 不会执行；链接和图片只接受 HTTP/HTTPS。

### 连接 Google Sheets

1. 打开文章库，选择 **文件 → 分享 → 发布到网络**。
2. 只选择 **Public Feed** 工作表，格式选择 **逗号分隔值 (.csv)**，再按 **发布**。
3. 复制 Google 显示的 CSV 公开链接。
4. 在仓库的 `site-config.js` 中，将 `publishedCsvUrl` 替换为该链接。`spreadsheetUrl` 保持空白，避免在公开网站暴露文章库编辑网址。
5. 部署网站一次。之后只要在 `Articles` 维护内容，`Public Feed` 会筛出已发布行；网站每次加载会重新读取 CSV。

Google 说明，表格更改自动同步到公开版本有时需要几分钟；这段等待来自 Google 的发布缓存。详情见 [Google 的发布说明](https://support.google.com/docs/answer/183965?hl=zh-Hans)。

**隐私提示：**网站只能连接 `Public Feed`。发布前请确认 Google 的发布对话框只选中了该工作表，并且公开表格里只包含准备公开的文章。不要把私人资料放进公开工作表。

## Notion 模板页面

`notion-templates.html` 是公开模板目录，入口在顶部导航。要添加模板，在 `site-config.js` 的 `notionTemplates` 数组加入 `{ title, description, url }`；`url` 填可公开访问的 HTTPS Notion 模板链接。未填写有效模板时，页面会显示整理中的提示。请先在无登录状态下检查链接可打开且允许复制，再发布网站代码。修改配置后需要重新部署。

## 本机预览

首页头像使用 `avatar.webp`。社交平台链接写在 `site-config.js` 的 `socialProfiles` 中；只有填写了有效 HTTP/HTTPS 主页链接的平台才会显示。公开联系邮箱填写在 `contactEmail`，留空则隐藏 Gmail 卡片；填入后访客点击卡片会打开邮件应用。请只填写愿意公开的邮箱地址。

在项目文件夹运行：

```powershell
python -m http.server 4173
```

打开 `http://localhost:4173/`。要预览示范文章和阅读页面，打开 `http://localhost:4173/?preview=1`。示范文章只会在本机预览模式显示，不会作为生产网站的默认内容。

运行纯逻辑检查：

```powershell
node --test
```

## 邮件订阅（Google Sheet）

订阅邮箱存放在**另一份私人 Google Sheet**，不要发布到网络，也不要把它设为「知道链接的任何人都可查看」。公开的文章表仍只用于文章。访客提交有效邮箱后立即订阅成功，无需邮件确认；Apps Script 每小时检查 `Public Feed`，按订阅时选择的语言发送新文章正文（纯文字，保留 Markdown 原文）。英文邮件仅在英文标题和英文正文均已填写时发送；旧订阅者默认收到中文。邮件仍附文章链接和取消订阅链接。Google 的 CSV 发布缓存可能让通知延迟；Apps Script 定时触发器也不是精确到整点的发送服务。

1. 新建一份 Google Sheet，命名例如「伟政｜订阅名单」，保持私人访问。复制网址中 `/d/` 与 `/edit` 之间的 ID。
2. 在这份私人表打开 **扩展程序 → Apps Script**，将 `apps-script/Code.gs` 的全部内容贴进脚本编辑器。
3. 修改脚本顶部 `SCRIPT_CONFIG`：
   - `subscriberSpreadsheetId`：第 1 步的私人表 ID。
   - `publishedCsvUrl`：与 `site-config.js` 的 `publishedCsvUrl` 相同。
   - `siteUrl`：这个博客的正式 HTTPS 首页网址，结尾保留 `/`。
   - `replyTo`：你愿意用于接收读者回复的邮箱。
4. 在 Apps Script 编辑器选 `setup` 并运行一次，授权表格、读取公开 CSV、发送邮件和建立定时触发器。此步骤会建立 `Subscribers`、`SeenArticles`、`Deliveries` 三个工作表，并把**当前已有**的文章标记为已见，避免启用时给旧文章补发通知。如果出现错误，先检查 CSV 是否有 `标题`、`网址标识`、`正文`、`英文标题` 和 `英文正文` 表头，再重新运行 `setup`。
5. 选择 **部署 → 新建部署 → 网页应用**，执行身份选**我**，访问权限选**任何人**。复制部署后的 `/exec` 网址。脚本对外只接受订阅和取消订阅操作；不要把私人表网址公开。
6. 将 `/exec` 网址填到 `site-config.js` 的 `subscriptionEndpoint`，重新部署静态网站一次。地址留空时，页面会显示「邮件订阅即将开放」，不会假装提交成功。以后发文章不用重新部署网站。
7. 用自己的邮箱完成一次端到端检查：提交 → 检查私人表中状态为 `ACTIVE` → 发布一篇真实新文章 → 等待定时任务 → 核对邮件语言与正文 → 点取消订阅。测试文章若不想发给读者，请在正式收集订阅者前测试。Apps Script 的 **执行记录** 可查看触发器错误。

`Subscribers` 的 `Status` 使用 `ACTIVE` 和 `UNSUBSCRIBED`；旧版的 `PENDING` 记录在该邮箱再次提交时会变为 `ACTIVE`。重复提交已订阅邮箱不会重复建行，并会更新邮件语言；取消后再次提交可重新订阅。旧私人表会自动新增 `Language` 列；旧订阅记录未填语言时按中文发送。无需确认意味着任何人只要知道邮箱地址就能替其提交订阅；请留意滥用情况。自动邮件受运行该脚本的 Google 帐号的每日邮件配额限制；配额用完会留待下次触发器重试。请不要手动公开或导出订阅名单。修改 Apps Script 后要部署新版本；修改网站代码或 `site-config.js` 后要重新部署网站。

## 部署到 Vercel

1. 把项目推送到你自己的 GitHub 仓库。
2. 在 Vercel 选择 **Add New → Project**，导入该仓库。
3. 保留默认静态项目设置，不需要 Build Command；确认项目根目录就是此项目文件夹，再部署。
4. 用 Vercel 提供的网址检查首页、文章搜索和手机布局。

### 让 Google 发现网站

网站提供了 `robots.txt` 和 `sitemap.xml`，并为首页和每篇打开的文章设置标题、摘要与 canonical URL。部署后：

1. 在 [Google Search Console](https://search.google.com/search-console/) 添加网站属性。若使用 Vercel 子域名，可选择网址前缀属性；自定义域名建议用网域属性并按提示添加 DNS TXT 验证记录。
2. 验证完成后，在「站点地图」提交 `https://weizheng-notes.vercel.app/sitemap.xml`。
3. 用网址检查工具检查首页，并选择「请求编入索引」。
4. 网站重新部署后，检查 `https://weizheng-notes.vercel.app/robots.txt` 与 `https://weizheng-notes.vercel.app/sitemap.xml` 能否直接打开。

Google 是否收录及何时显示在搜索结果由 Google 决定，提交 sitemap 不保证收录。当前 sitemap 列出首页；文章从 Google Sheets 动态载入，Google 需要先抓取并执行页面 JavaScript 才能发现文章链接。若要稳定提交每篇文章并提供抓取器可直接读取的正文，需要后续把发布流程改为生成独立文章 HTML。

文章内容编辑在 Google Sheets 完成，不需要重建或重新部署。更改 HTML、CSS、JavaScript 或表格链接配置时，才需要重新部署网站。

目前 `site-config.js` 的 `hiddenArticleTitles` 会在网页加载后隐藏示例文章。正式撤下线上示例时，还需在 `Articles` 工作表把该行的 `发布状态` 改为 `草稿`；Google 的公开 CSV 可能要等几分钟才会更新。发布真实文章后，可删除该隐藏规则。

首页包含静态的分享标题、简介和图片。文章页会在浏览器加载后更新标题、简介和分享标签，但多数社交平台抓取器不会执行 JavaScript，因此文章链接的外部预览可能仍显示首页资料。要保证每篇文章都有独立的社交预览和搜索摘要，需要另外生成可供抓取器读取的文章 HTML；这也需要配合文章更新流程。

## 简单排错

- **文章表格还没有连接**：检查 `site-config.js` 是否填入 CSV 链接。
- **文章没有显示**：确认 `Public Feed` 已发布成 CSV，`发布状态` 是 `已发布`，并且标题、网址标识、正文都有内容。
- **页面读取失败**：重新复制 Google 发布对话框给的 CSV 链接，检查网络后刷新页面。
- **搜索引擎收录**：文章内容在浏览器中动态加载，静态预渲染效果有限；这是为了满足编辑表格后无需重新部署的选择。
