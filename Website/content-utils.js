(function (root, factory) {
  "use strict";
  const utilities = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = utilities;
  if (root) root.BlogContentUtils = utilities;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && input[i + 1] === "\n") i += 1;
        row.push(field); field = "";
        if (row.some(function (cell) { return cell.trim() !== ""; })) rows.push(row);
        row = [];
      } else field += char;
    }
    if (field !== "" || row.length) { row.push(field); if (row.some(function (cell) { return cell.trim() !== ""; })) rows.push(row); }
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function dateValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return 0;
    if (/^\d{5}(?:\.\d+)?$/.test(raw)) {
      const serial = Number(raw);
      if (serial >= 20000 && serial <= 80000) return Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
    }
    const match = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime() || 0;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function dateLabel(value, language) {
    const time = dateValue(value);
    if (!time) return String(value || (language === "en" ? "Date pending" : "日期待补"));
    return new Intl.DateTimeFormat(language === "en" ? "en-MY" : "zh-MY", { year: "numeric", month: "long", day: "numeric" }).format(new Date(time));
  }

  function articleStats(markdown, language) {
    const readable = String(markdown || "")
      .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/(^|\n)\s*(?:#{1,3}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/g, "$1")
      .replace(/[*_`~]/g, "");
    const words = readable.match(/\p{Script=Han}|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
    const wordCount = words.length;
    return { wordCount, readingMinutes: Math.max(1, Math.ceil(wordCount / (language === "en" ? 200 : 300))) };
  }

  function parseCategories(value) {
    const categories = String(value || "").split(/[,，]/).map(function (category) { return category.trim(); }).filter(Boolean);
    return Array.from(new Set(categories.length ? categories : ["随手记"]));
  }

  function normalizeArticles(csv) {
    const rows = parseCsv(csv);
    if (rows.length < 2) return [];
    const headers = rows[0].map(normalizeHeader);
    const keys = {
      title: ["标题", "articletitle", "title"],
      slug: ["网址标识", "slug", "urlslug"],
      summary: ["摘要", "summary", "excerpt"],
      category: ["分类", "category"],
      date: ["发布日期", "publishdate", "date"],
      cover: ["封面图片url", "封面图片", "coverimageurl", "coverimage", "cover"],
      content: ["正文", "content", "body"],
      status: ["发布状态", "status"],
      titleEn: ["英文标题", "titleen", "englishtitle"],
      summaryEn: ["英文摘要", "summaryen", "englishsummary"],
      contentEn: ["英文正文", "contenten", "englishcontent"],
      categoryEn: ["英文分类", "categoryen", "englishcategory"]
    };
    const index = {};
    Object.keys(keys).forEach(function (key) {
      index[key] = headers.findIndex(function (header) { return keys[key].some(function (candidate) { return normalizeHeader(candidate) === header; }); });
    });
    if (index.title < 0 || index.slug < 0 || index.content < 0) throw new Error("表格缺少必需栏位：标题、网址标识或正文。");
    return rows.slice(1).map(function (cells) {
      const get = function (key) { return index[key] < 0 ? "" : String(cells[index[key]] || "").trim(); };
      const categories = parseCategories(get("category"));
      return { title: get("title"), slug: get("slug"), summary: get("summary"), category: categories[0], categories: categories, date: get("date"), cover: get("cover"), content: get("content"), status: get("status"), titleEn: get("titleEn"), summaryEn: get("summaryEn"), contentEn: get("contentEn"), categoryEn: get("categoryEn") };
    }).filter(function (item) {
      return item.title && item.slug && item.content && (!item.status || ["已发布", "published", "public"].includes(item.status.toLowerCase()));
    }).sort(function (a, b) { return dateValue(b.date) - dateValue(a.date); });
  }

  function filterArticles(articles, category, query) {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
    return articles.filter(function (item) {
      const categories = item.categories || parseCategories(item.category);
      const matchesCategory = category === "全部" || categories.includes(category);
      const haystack = [item.title, item.summary, categories.join(" "), item.content, item.titleEn, item.summaryEn, item.contentEn, item.categoryEn].join(" ").toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }

  function excludeHiddenArticles(articles, titles) {
    const hidden = new Set(Array.isArray(titles) ? titles : []);
    return articles.filter(function (item) { return !hidden.has(item.title); });
  }

  function safeImageUrl(value, baseUrl) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, baseUrl || "https://example.com/");
      if (!["https:", "http:"].includes(url.protocol)) return "";
      if (url.hostname === "drive.google.com") {
        const file = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
        const id = file ? file[1] : ["/open", "/uc"].includes(url.pathname) ? url.searchParams.get("id") : "";
        if (id && /^[A-Za-z0-9_-]+$/.test(id)) return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600";
      }
      return url.href;
    }
    catch (error) { return ""; }
  }

  function inlineMarkdown(text) {
    let value = escapeHtml(text);
    value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
    value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    value = value.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, label, url) { return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>"; });
    return value;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const html = [];
    let paragraph = [];
    let listType = "";
    function flushParagraph() { if (paragraph.length) { html.push("<p>" + paragraph.map(inlineMarkdown).join("<br />") + "</p>"); paragraph = []; } }
    function closeList() { if (listType) { html.push("</" + listType + ">"); listType = ""; } }
    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed) { flushParagraph(); closeList(); return; }
      const image = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
      if (image) {
        flushParagraph(); closeList();
        const url = safeImageUrl(image[2]);
        if (url) html.push('<figure class="article-image"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(image[1]) + '" loading="lazy" decoding="async" />' + (image[1] ? '<figcaption>' + escapeHtml(image[1]) + '</figcaption>' : '') + '</figure>');
        return;
      }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) { flushParagraph(); closeList(); const level = heading[1].length; html.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">"); return; }
      if (/^---+$/.test(trimmed)) { flushParagraph(); closeList(); html.push("<hr />"); return; }
      const quote = trimmed.match(/^>\s?(.*)$/);
      if (quote) { flushParagraph(); closeList(); html.push("<blockquote><p>" + inlineMarkdown(quote[1]) + "</p></blockquote>"); return; }
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ordered || unordered) {
        flushParagraph(); const nextType = ordered ? "ol" : "ul";
        if (listType !== nextType) { closeList(); html.push("<" + nextType + ">"); listType = nextType; }
        html.push("<li>" + inlineMarkdown((ordered || unordered)[1]) + "</li>"); return;
      }
      closeList(); paragraph.push(trimmed);
    });
    flushParagraph(); closeList();
    return html.join("");
  }

  return { escapeHtml, parseCsv, parseCategories, normalizeArticles, filterArticles, excludeHiddenArticles, dateValue, dateLabel, articleStats, safeImageUrl, renderMarkdown };
});
