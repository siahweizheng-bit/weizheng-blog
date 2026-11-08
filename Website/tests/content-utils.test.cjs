const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv, parseCategories, normalizeArticles, filterArticles, excludeHiddenArticles, renderMarkdown, safeImageUrl, dateLabel, articleStats } = require("../content-utils.js");

test("comma separated categories are trimmed, deduplicated, and independently filterable", function () {
  assert.deepEqual(parseCategories(" 心理学, AI 与效率，心理学, "), ["心理学", "AI 与效率"]);
  const csv = '标题,网址标识,分类,正文\n文章,entry,"心理学, AI 与效率",正文';
  const articles = normalizeArticles(csv);
  assert.deepEqual(articles[0].categories, ["心理学", "AI 与效率"]);
  assert.deepEqual(filterArticles(articles, "AI 与效率", ""), articles);
  assert.deepEqual(filterArticles(articles, "心理学", ""), articles);
  assert.deepEqual(filterArticles(articles, "全部", "AI 与效率"), articles);
  assert.deepEqual(filterArticles(articles, "校园生活", ""), []);
});

test("Google Sheets serial dates display as calendar dates", function () {
  assert.equal(dateLabel("46301"), "2026年10月6日");
  assert.equal(dateLabel("46301", "en"), "6 October 2026");
});

test("optional English columns are read without changing Chinese article data", function () {
  const csv = '标题,网址标识,正文,英文标题,英文摘要,英文正文,英文分类\n中文标题,note,中文正文,English title,English summary,"First line\n\nSecond line",Psychology';
  const article = normalizeArticles(csv)[0];
  assert.equal(article.title, "中文标题");
  assert.equal(article.content, "中文正文");
  assert.equal(article.titleEn, "English title");
  assert.equal(article.summaryEn, "English summary");
  assert.equal(article.contentEn, "First line\n\nSecond line");
  assert.equal(article.categoryEn, "Psychology");
  assert.deepEqual(filterArticles([article], "全部", "English summary"), [article]);
});

test("article stats count visible Chinese characters and English words without Markdown syntax or URLs", function () {
  assert.deepEqual(articleStats("## 标题\n\n**你好** world! [参考资料](https://example.com/path)\n\n- AI tools"), { wordCount: 11, readingMinutes: 1 });
  assert.deepEqual(articleStats("中文".repeat(151)), { wordCount: 302, readingMinutes: 2 });
  assert.deepEqual(articleStats("word ".repeat(201), "en"), { wordCount: 201, readingMinutes: 2 });
});

test("CSV parser handles BOM, escaped quotes, commas, and newlines", function () {
  const input = '\uFEFF标题,正文\r\n"一篇,文章","第一行\n第二行，带有""引号"""\r\n';
  assert.deepEqual(parseCsv(input), [["标题", "正文"], ["一篇,文章", '第一行\n第二行，带有"引号"']]);
});

test("article normalization keeps published rows, drops drafts, and sorts newest first", function () {
  const csv = [
    "标题,网址标识,摘要,分类,发布日期,封面图片 URL,正文,发布状态",
    '旧文章,older,说明,校园生活,2026-08-01,,"旧文正文",已发布',
    '草稿,draft,说明,心理学,2026-10-01,,"草稿正文",草稿',
    '新文章,newer,"含有,逗号",心理学,2026-09-01,,"第一段\n\n第二段",已发布'
  ].join("\n");
  const articles = normalizeArticles(csv);
  assert.deepEqual(articles.map(function (article) { return article.slug; }), ["newer", "older"]);
  assert.equal(articles[0].summary, "含有,逗号");
  assert.equal(articles[0].content, "第一段\n\n第二段");
});

test("published feed without a status column accepts rows and supplies a default category", function () {
  const articles = normalizeArticles("标题,网址标识,摘要,分类,发布日期,封面图片 URL,正文\n文章,entry,简介,,2026-10-01,,正文");
  assert.equal(articles.length, 1);
  assert.equal(articles[0].category, "随手记");
});

test("normalization rejects a feed missing required headers", function () {
  assert.throws(function () { normalizeArticles("标题,摘要\n文章,简介"); }, /缺少必需栏位/);
});

test("empty feeds and unmatched searches return no articles", function () {
  const articles = normalizeArticles("标题,网址标识,摘要,分类,发布日期,封面图片 URL,正文");
  assert.deepEqual(articles, []);
  const sample = [{ title: "学习笔记", summary: "复习方法", category: "校园生活", content: "番茄钟" }];
  assert.deepEqual(filterArticles(sample, "心理学", ""), []);
  assert.deepEqual(filterArticles(sample, "全部", "不存在的词"), []);
  assert.deepEqual(filterArticles(sample, "校园生活", "番茄"), sample);
});

test("public placeholder is hidden while real articles remain visible", function () {
  const articles = [{ title: "示例：写下一篇新文章" }, { title: "真实文章" }];
  assert.deepEqual(excludeHiddenArticles(articles, ["示例：写下一篇新文章"]), [articles[1]]);
});

test("Markdown renderer escapes HTML while preserving supported text formatting", function () {
  const html = renderMarkdown('## 小标题\n\n**重点** 与 *斜体*，<script>alert("x")</script>\n\n- 清单\n- 第二项\n\n> 引用\n\n[参考](https://example.com/?a=1&b=2) [危险](javascript:alert(1))');
  assert.match(html, /<h2>小标题<\/h2>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<ul><li>清单<\/li><li>第二项<\/li><\/ul>/);
  assert.match(html, /<blockquote><p>引用<\/p><\/blockquote>/);
  assert.match(html, /href="https:\/\/example\.com/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("image URLs reject executable schemes", function () {
  assert.equal(safeImageUrl("javascript:alert(1)"), "");
  assert.equal(safeImageUrl("https://example.com/cover.jpg"), "https://example.com/cover.jpg");
});

test("Google Drive share links become image requests for covers and Markdown images", function () {
  const share = "https://drive.google.com/file/d/1c-clEANPBcag2f2IjeJrotAiFX5VY3QC/view?usp=sharing";
  const image = "https://drive.google.com/thumbnail?id=1c-clEANPBcag2f2IjeJrotAiFX5VY3QC&sz=w1600";
  assert.equal(safeImageUrl(share), image);
  assert.equal(safeImageUrl("https://drive.google.com/open?id=1c-clEANPBcag2f2IjeJrotAiFX5VY3QC"), image);
  assert.match(renderMarkdown("![课堂照片](" + share + ")"), /src="https:\/\/drive\.google\.com\/thumbnail\?id=1c-clEANPBcag2f2IjeJrotAiFX5VY3QC&amp;sz=w1600"/);
});

test("Markdown images render between paragraphs with safe URLs and escaped captions", function () {
  const html = renderMarkdown('第一段\n\n![课堂照片 <图>](https://example.com/photo.jpg?x=1&y=2)\n\n第二段');
  assert.match(html, /^<p>第一段<\/p><figure class="article-image"><img src="https:\/\/example\.com\/photo\.jpg\?x=1&amp;y=2" alt="课堂照片 &lt;图&gt;" loading="lazy" decoding="async" \/><figcaption>课堂照片 &lt;图&gt;<\/figcaption><\/figure><p>第二段<\/p>$/);
  assert.doesNotMatch(renderMarkdown('![危险](javascript:alert(1))'), /<img/);
});
