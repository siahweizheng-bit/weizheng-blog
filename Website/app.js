(function () {
  "use strict";

  const { escapeHtml: esc, normalizeArticles, parseCategories, filterArticles, excludeHiddenArticles, dateValue, dateLabel, articleStats, safeImageUrl, renderMarkdown } = window.BlogContentUtils;
  const config = window.SITE_CONFIG || {};
  const language = window.SiteI18n.language;
  const en = language === "en";
  const t = window.SiteI18n.t;
  const siteName = en ? "Weizheng's Notes" : "伟政的线上笔记";
  const categoryNames = { "心理学": "Psychology", "AI 与效率": "AI & Productivity", "校园生活": "Campus Life", "个人成长": "Personal Growth", "随手记": "Notes" };
  function articleTitle(item) { return en ? item.titleEn || "English version coming soon" : item.title; }
  function articleSummary(item) { return en ? item.summaryEn || "English summary coming soon." : item.summary; }
  function hasEnglish(item) { return Boolean(item.titleEn && item.contentEn); }
  function articleContentText(item) { return en ? (hasEnglish(item) ? item.contentEn : "") : item.content; }
  function categoryName(value, item) {
    if (!en) return value;
    if (!item) item = articles.find(function (article) { return article.categoryEn && (article.categories || parseCategories(article.category)).includes(value); });
    if (item && item.categoryEn) {
      const original = item.categories || parseCategories(item.category);
      const translated = parseCategories(item.categoryEn);
      const index = original.indexOf(value);
      if (index >= 0 && translated[index]) return translated[index];
    }
    return categoryNames[value] || "Other";
  }
  function articleUrl(slug) { return "?post=" + encodeURIComponent(slug) + (en ? "&lang=en" : ""); }
  const homeView = document.getElementById("home-view");
  const articleView = document.getElementById("article-view");
  const articleContent = document.getElementById("article-content");
  const statePanel = document.getElementById("articles-state");
  const articleGrid = document.getElementById("article-grid");
  const categoryList = document.getElementById("category-list");
  const searchInput = document.getElementById("search-input");
  const resultsLabel = document.getElementById("results-label");
  const categorySet = new Set(["全部"]);
  let articles = [];
  let activeCategory = "全部";
  let feedError = false;
  const homeDescription = document.querySelector('meta[name="description"]').content;

  function setPageMetadata(title, description, image, isArticle) {
    const pageUrl = new URL(window.location.pathname, window.location.origin);
    const postSlug = new URLSearchParams(window.location.search).get("post");
    if (isArticle && postSlug) pageUrl.searchParams.set("post", postSlug);
    if (en) pageUrl.searchParams.set("lang", "en");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = pageUrl.href;
    document.title = title;
    document.querySelector('meta[name="description"]').content = description;
    document.querySelector('meta[property="og:title"]').content = title;
    document.querySelector('meta[property="og:description"]').content = description;
    document.querySelector('meta[property="og:image"]').content = image || new URL("avatar.webp", window.location.href).href;
    document.querySelector('meta[property="og:type"]').content = isArticle ? "article" : "website";
    document.querySelector('meta[property="og:url"]').content = pageUrl.href;
  }

  document.getElementById("current-year").textContent = new Date().getFullYear();

  const socialSection = document.querySelector(".social-section");
  const socialProfiles = config.socialProfiles || {};
  let visibleSocialProfiles = 0;
  const emailCard = socialSection.querySelector("[data-contact-email]");
  const contactEmail = String(config.contactEmail || "").trim();
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactEmail)) {
    emailCard.href = "mailto:" + contactEmail;
    emailCard.querySelector("[data-email-address]").textContent = contactEmail;
    emailCard.hidden = false;
    visibleSocialProfiles += 1;
  }
  socialSection.querySelectorAll("[data-social]").forEach(function (card) {
    const value = String(socialProfiles[card.dataset.social] || "").trim();
    if (!value) return;
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) return;
      card.href = url.href;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.hidden = false;
      visibleSocialProfiles += 1;
    } catch (_) { /* Ignore unfinished or invalid profile URLs. */ }
  });
  socialSection.hidden = visibleSocialProfiles === 0;

  const subscribeForm = document.getElementById("subscribe-form");
  const subscribeUnavailable = document.getElementById("subscribe-unavailable");
  const subscribeEmail = document.getElementById("subscribe-email");
  const subscribeStatus = document.getElementById("subscribe-status");
  const articleSubscribeForm = document.getElementById("article-subscribe-form");
  const articleSubscribeEmail = document.getElementById("article-subscribe-email");
  const articleSubscribeStatus = document.getElementById("article-subscribe-status");
  const subscribeDialog = document.getElementById("subscribe-dialog");
  const subscriptionEndpoint = String(config.subscriptionEndpoint || "").trim();
  let subscriptionUrl = "";
  try {
    const url = new URL(subscriptionEndpoint);
    if (url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.endsWith("/exec")) subscriptionUrl = url.href;
  } catch (_) { /* The subscription backend is not configured yet. */ }
  if (subscriptionUrl) {
    subscribeForm.hidden = false;
    subscribeUnavailable.hidden = true;
    articleSubscribeForm.hidden = false;
    document.getElementById("article-subscribe-unavailable").hidden = true;
  }

  function submitSubscription(event, sourceForm, emailInput, status) {
    event.preventDefault();
    if (!subscriptionUrl || !emailInput.checkValidity()) {
      status.textContent = en ? "Enter a valid email address." : "请输入有效的电子邮箱。";
      emailInput.focus();
      return;
    }
    const languageInput = sourceForm.querySelector('input[name="language"]:checked');
    if (!languageInput) {
      status.textContent = en ? "Choose an email language." : "请选择邮件语言。";
      sourceForm.querySelector('input[name="language"]').focus();
      return;
    }
    const button = sourceForm.querySelector('button[type="submit"]');
    const frame = document.createElement("iframe");
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, "0")).join("");
    const form = document.createElement("form");
    const frameName = "subscribe-frame-" + nonce;
    frame.name = frameName;
    frame.hidden = true;
    frame.setAttribute("title", en ? "Subscription result" : "订阅提交结果");
    document.body.appendChild(frame);
    form.method = "POST";
    form.action = subscriptionUrl;
    form.target = frameName;
    form.hidden = true;
    [["email", emailInput.value.trim()], ["language", languageInput.value], ["nonce", nonce], ["website", sourceForm.elements.website.value]].forEach(function (entry) {
      const input = document.createElement("input");
      input.name = entry[0];
      input.value = entry[1];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    button.disabled = true;
    emailInput.disabled = true;
    sourceForm.querySelectorAll('input[name="language"]').forEach(function (input) { input.disabled = true; });
    status.textContent = en ? "Submitting…" : "正在提交…";
    let finished = false;
    const timer = setTimeout(function () { finish("timeout"); }, 30000);
    function finish(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      form.remove();
      frame.remove();
      button.disabled = false;
      emailInput.disabled = false;
      sourceForm.querySelectorAll('input[name="language"]').forEach(function (input) { input.disabled = false; });
      if (result === "accepted") {
        status.textContent = en ? "Subscribed! New articles will be sent to your email in your chosen language." : "订阅成功！新文章会按你选择的语言寄到邮箱。";
        emailInput.value = "";
        languageInput.checked = false;
      } else if (result === "invalid") {
        status.textContent = en ? "Check your email address and language, then try again." : "请检查邮箱和邮件语言后重试。";
      } else {
        status.textContent = en ? "Could not subscribe right now. Please try again later." : "暂时无法提交，请稍后重试。";
      }
    }
    function onMessage(message) {
      const trustedOrigin = /^https:\/\/(?:script\.google\.com|[a-z0-9.-]+\.googleusercontent\.com)$/.test(message.origin);
      if (!trustedOrigin || !message.data || message.data.type !== "blog-subscription" || message.data.nonce !== nonce) return;
      finish(message.data.result);
    }
    window.addEventListener("message", onMessage);
    form.submit();
  }
  subscribeForm.addEventListener("submit", function (event) { submitSubscription(event, subscribeForm, subscribeEmail, subscribeStatus); });
  articleSubscribeForm.addEventListener("submit", function (event) { submitSubscription(event, articleSubscribeForm, articleSubscribeEmail, articleSubscribeStatus); });
  document.getElementById("subscribe-dialog-close").addEventListener("click", function () { subscribeDialog.close(); });
  subscribeDialog.addEventListener("click", function (event) { if (event.target === subscribeDialog) subscribeDialog.close(); });
  articleContent.addEventListener("click", function (event) {
    if (!event.target.closest("[data-open-subscribe]")) return;
    articleSubscribeStatus.textContent = "";
    subscribeDialog.showModal();
    if (subscriptionUrl) articleSubscribeEmail.focus();
  });

  function setState(kind, title, message, action) {
    statePanel.hidden = false;
    statePanel.className = "state-panel" + (kind === "error" ? " state-error" : "");
    const icon = kind === "loading" ? '<span class="loading-spinner" aria-hidden="true"></span>' : "";
    const actionHtml = action ? '<a class="state-action" href="' + esc(action.href) + '"' + (action.external ? ' target="_blank" rel="noreferrer"' : "") + ">" + esc(action.label) + " ↗</a>" : "";
    statePanel.innerHTML = icon + "<strong>" + esc(title) + "</strong>" + (message ? "<p>" + esc(message) + "</p>" : "") + actionHtml;
    articleGrid.innerHTML = "";
    categoryList.innerHTML = "";
    resultsLabel.textContent = "";
  }

  function coverMarkup(item, number) {
    const safeCover = safeImageUrl(item.cover);
    if (safeCover) return '<div class="card-cover" style="background-image:linear-gradient(0deg,#302b2725,#302b2700),url(&quot;' + esc(safeCover) + '&quot;);background-position:center;background-size:cover"><span class="cover-number">NOTE Nº ' + String(number).padStart(2, "0") + "</span></div>";
    const categories = item.categories || parseCategories(item.category);
    const word = en ? (categories.includes("心理学") ? "UNDERSTANDING SELF" : categories.includes("AI 与效率") ? "MAKE TIME" : categories.includes("校园生活") ? "CAMPUS DAYS" : "GROWING SLOWLY") : categories.includes("心理学") ? "理解自己" : categories.includes("AI 与效率") ? "留点时间" : categories.includes("校园生活") ? "校园日常" : "慢慢成长";
    return '<div class="card-cover"><div class="cover-inner"><div><p class="cover-kicker">A NOTE TO SELF</p><p class="cover-word">' + esc(word) + '</p></div></div><span class="cover-number">NOTE Nº ' + String(number).padStart(2, "0") + "</span></div>";
  }

  function articleMeta(item) {
    const content = articleContentText(item);
    const stats = articleStats(content, language);
    return '<div class="article-details"><time>' + (en ? "Published " : "发布于 ") + esc(dateLabel(item.date, language)) + '</time>' + (content ? '<span>' + (en ? "About " + stats.readingMinutes + " min read" : "阅读约 " + stats.readingMinutes + " 分钟") + '</span><span>' + stats.wordCount + (en ? " words" : " 字") + '</span>' : '') + '</div>';
  }

  function categoryMarkup(item) {
    return '<div class="card-meta"><span class="card-categories">' + (item.categories || parseCategories(item.category)).map(function (category) {
      return '<span class="card-category">' + esc(categoryName(category, item)) + '</span>';
    }).join("") + '</span></div>';
  }

  function renderCategories() {
    const categories = ["全部"].concat(Array.from(categorySet).filter(function (value) { return value !== "全部"; }).sort(function (a, b) { return a.localeCompare(b, "zh-Hans"); }));
    categoryList.innerHTML = categories.map(function (category) {
      return '<button class="category-chip" type="button" data-category="' + esc(category) + '" aria-pressed="' + (activeCategory === category) + '">' + esc(category === "全部" && en ? "All" : categoryName(category)) + "</button>";
    }).join("");
  }

  function visibleArticles() {
    return filterArticles(articles, activeCategory, searchInput.value);
  }

  function renderCards() {
    const matches = visibleArticles();
    resultsLabel.textContent = matches.length ? (en ? matches.length + " articles" : "共 " + matches.length + " 篇记录") : "";
    statePanel.hidden = true;
    if (!matches.length) {
      setState("empty", en ? (articles.length ? "No matching articles" : "The first note is on its way") : (articles.length ? "没有找到符合条件的文章" : "第一篇笔记正在准备中"), en ? (articles.length ? "Try another keyword or choose All." : "I'll write about psychology, AI tools, and campus life. You can learn more about me below.") : (articles.length ? "换个关键词，或选择“全部”分类再试试。" : "我会从心理学学习、AI 工具和校园生活写起。欢迎先到下方认识我。"), null);
      renderCategories();
      return;
    }
    articleGrid.innerHTML = matches.map(function (item) {
      const index = articles.indexOf(item) + 1;
      const summary = articleSummary(item);
      return '<article class="article-card"><a class="card-link" href="' + articleUrl(item.slug) + '" data-post-link="' + esc(item.slug) + '">' + coverMarkup(item, index) + categoryMarkup(item) + '<h3 class="card-title">' + esc(articleTitle(item)) + '</h3>' + articleMeta(item) + (summary ? '<p class="card-summary">' + esc(summary) + '</p>' : '') + (en && !hasEnglish(item) ? '<p class="card-summary">English version coming soon.</p>' : '') + '<span class="card-read">' + (en ? "Read more" : "继续阅读") + ' <span aria-hidden="true">→</span></span></a></article>';
    }).join("");
  }

  function renderArticle(slug) {
    const item = articles.find(function (article) { return article.slug === slug; });
    if (!item) {
      const feedUrl = String(config.publishedCsvUrl || "").trim();
      const headline = en ? (feedError ? "Article unavailable" : feedUrl ? "Article not found" : "Article feed not connected") : (feedError ? "文章暂时无法载入" : feedUrl ? "这篇文章暂时不在这里" : "文章还没有连接到网站");
      const description = en ? (feedError ? "Could not read Google Sheets. Check your connection and refresh." : feedUrl ? "This article may be unpublished or its URL may have changed." : "Set up the article feed, then refresh. See README.md.") : (feedError ? "无法读取 Google Sheets。检查表格链接和网络后，刷新页面再试一次。" : feedUrl ? "它可能还没有发布，或者网址标识已经更新。" : "先完成文章表格发布设置，再刷新这个页面。详细步骤在 README.md。");
      articleContent.innerHTML = '<div class="article-not-found"><p class="eyebrow">' + (en ? "READING" : feedError ? "加载遇到问题" : feedUrl ? "找不到这一页" : "还差一个设置") + '</p><h1 id="article-title">' + headline + '</h1><p>' + description + '</p><a class="button button-dark" href="#articles">' + (en ? "Back to articles" : "回到文章列表") + '</a></div>';
      setPageMetadata(headline + " — " + siteName, homeDescription);
      return;
    }
    const title = articleTitle(item);
    const summary = articleSummary(item);
    const content = articleContentText(item);
    setPageMetadata(title + " — " + siteName, summary || title, safeImageUrl(item.cover), true);
    const image = safeImageUrl(item.cover);
    articleContent.innerHTML = '<header class="article-hero">' + categoryMarkup(item) + '<h1 id="article-title">' + esc(title) + '</h1>' + articleMeta(item) + (summary ? '<p class="article-summary">' + esc(summary) + '</p>' : '') + '</header>' + (image ? '<img class="article-cover" src="' + esc(image) + '" alt="' + (en ? "Article cover" : "文章封面") + '" />' : '') + (content ? '<div class="article-body">' + renderMarkdown(content) + '</div><div class="article-end"><span>' + (en ? "End of note" : "写到这里") + '</span></div>' : '<div class="article-not-found"><p>English version coming soon.</p><a class="text-link" href="' + articleUrl(item.slug).replace("&lang=en", "&lang=zh") + '">阅读中文版 ↗</a></div>') + '<section class="article-subscribe" aria-label="' + (en ? "Email subscription" : "邮件订阅") + '"><h2>' + (en ? "Enjoyed this note?" : "喜欢这篇笔记？") + '</h2><p>' + (en ? "Subscribe to get new articles by email." : "订阅后，新文章会寄到你的邮箱。") + '</p><button type="button" data-open-subscribe>' + (en ? "Subscribe" : "订阅新文章") + ' <span aria-hidden="true">↗</span></button></section>';
  }

  function isArticleRoute() { return Boolean(new URLSearchParams(window.location.search).get("post")); }
  function showRoute() {
    const slug = new URLSearchParams(window.location.search).get("post");
    const isArticle = Boolean(slug);
    homeView.hidden = isArticle;
    articleView.hidden = !isArticle;
    document.querySelectorAll("[data-nav]").forEach(function (link) { link.classList.toggle("active", !isArticle && link.getAttribute("data-nav") === (window.location.hash.slice(1) || "home")); });
    if (isArticle) renderArticle(slug);
    else setPageMetadata(siteName, homeDescription);
  }

  async function loadArticles() {
    if (isArticleRoute()) {
      homeView.hidden = true;
      articleView.hidden = false;
      articleContent.innerHTML = '<div class="article-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><span>' + (en ? "Opening this article…" : "正在打开这篇文章…") + '</span></div>';
    }
    const csvUrl = String(config.publishedCsvUrl || "").trim();
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const useDemo = isLocal && new URLSearchParams(window.location.search).get("preview") === "1";
    if (useDemo) {
      articles = [
        { title: "读心理学之后，我开始练习慢一点下结论", slug: "practice-slowing-down", summary: "从大学课堂带回日常的一件小事：试着先理解，再回应。", category: "心理学", date: "2026-09-18", content: "## 先把问题放一放\n\n我们很容易替别人补完故事。一次迟到，可能就被理解成不在乎；一句简短的回复，也可能被看成冷淡。\n\n心理学课堂没有让我更快看透别人，反而提醒我：**我看到的，只是一个片段。**\n\n## 给自己多一点空间\n\n下次遇到不舒服的时刻，我想先问问自己：\n\n- 我实际观察到了什么？\n- 哪一部分是我自己的猜测？\n- 我还可以怎样理解这件事？\n\n多停一秒，不代表要替所有事情找借口。它只是让回应多一点选择。", titleEn: "Learning to Pause Before Judging", summaryEn: "A small lesson from psychology class: understand first, then respond.", categoryEn: "Psychology", contentEn: "## Pause before deciding\n\nIt's easy to fill in someone else's story. Being late might look like indifference; a short reply might feel cold.\n\nPsychology class reminds me that **I only see one part of the story.**\n\n## Leave room for another view\n\nWhen something feels uncomfortable, I can ask:\n\n- What did I actually observe?\n- Which part is my assumption?\n- What else could explain it?\n\nPausing does not mean excusing everything. It gives me more ways to respond." },
        { title: "我用 AI 整理课程笔记的一个简单流程", slug: "ai-study-notes", summary: "先自己读、再请工具归纳，最后回到课本核对。", category: "AI 与效率", date: "2026-09-11", content: "## 工具可以帮忙，理解还是要自己完成\n\n我会先读完一小节，再把自己的笔记交给 AI 整理成重点和问题清单。这样做能让我更快发现遗漏，但它不能替我确认课程概念。\n\n### 一个三步流程\n\n1. 先独立阅读并写下不懂的地方。\n2. 请 AI 整理结构、生成自测问题。\n3. 回到课本核对定义与例子。\n\n> 把 AI 当成复习伙伴，而不是课程资料的来源。" },
        { title: "大学里那些不太起眼的好日子", slug: "small-campus-days", summary: "一堂刚好听懂的课、一杯热饮，和没赶上的那班车。", category: "校园生活", date: "2026-09-03", content: "## 平常的日子，也值得被记住\n\n这周没有特别大的事情。赶作业、走去上课、和朋友聊了几句，然后回家。\n\n可是这些普通的片刻拼在一起，就是我正在过的生活。试着把注意力从“还没完成什么”挪回来，也能看到一些温柔的事情。" }
      ];
    } else if (!csvUrl) {
      const sheetLink = config.spreadsheetUrl ? { href: config.spreadsheetUrl, label: en ? "Open article Google Sheet" : "打开文章 Google Sheet", external: true } : null;
      setState("setup", en ? "Article feed not connected" : "文章表格还没有连接", en ? "Add the published Google Sheets CSV link to site-config.js. See README.md for setup." : "请先在 site-config.js 填入 Google Sheets“发布到网络”后得到的 CSV 链接。设置步骤和文章模板链接写在 README.md。", sheetLink);
      showRoute();
      return;
    } else {
      setState("loading", en ? "Opening a new page…" : "正在翻开新的一页…", en ? "Loading published articles." : "正在读取已发布的文章。", null);
      try {
        const url = new URL(csvUrl);
        url.searchParams.set("_refresh", String(Date.now()));
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const csv = await response.text();
        articles = excludeHiddenArticles(normalizeArticles(csv), config.hiddenArticleTitles);
      } catch (error) {
        feedError = true;
        setState("error", en ? "This page is unavailable" : "这页暂时打不开", en ? "Could not read Google Sheets. Check the CSV link, your connection, and whether Public Feed is published as CSV." : "无法读取 Google Sheets。请检查 CSV 发布链接、网络连接，以及 Public Feed 是否已发布为 CSV 格式。", { href: config.spreadsheetUrl || "#articles", label: en ? "Check article feed" : "检查文章表格", external: Boolean(config.spreadsheetUrl) });
        showRoute();
        return;
      }
    }
    articles.forEach(function (item) { (item.categories || parseCategories(item.category)).forEach(function (category) { categorySet.add(category); }); });
    renderCategories();
    showRoute();
    renderCards();
    if (isArticleRoute()) showRoute();
  }

  categoryList.addEventListener("click", function (event) {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    renderCategories();
    renderCards();
  });
  searchInput.addEventListener("input", renderCards);
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); searchInput.focus(); }
    if (event.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; searchInput.blur(); renderCards(); }
  });
  document.addEventListener("click", function (event) {
    const link = event.target.closest("[data-post-link]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(link.href);
    history.pushState({}, "", url.pathname + url.search + url.hash);
    showRoute();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("click", function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !isArticleRoute()) return;
    event.preventDefault();
    const hash = link.getAttribute("href");
    history.pushState({}, "", window.location.pathname + (en ? "?lang=en" : "") + hash);
    showRoute();
    window.requestAnimationFrame(function () {
      const target = document.querySelector(hash);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });
  window.addEventListener("popstate", function () { showRoute(); });
  window.addEventListener("hashchange", showRoute);
  loadArticles();
})();
