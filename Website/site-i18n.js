(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const requested = params.get("lang");
  let saved = "zh";
  try { saved = localStorage.getItem("site-language") || "zh"; } catch (_) {}
  const language = requested === "en" || requested === "zh" ? requested : saved === "en" ? "en" : "zh";
  if (requested === "en" || requested === "zh") {
    try { localStorage.setItem("site-language", requested); } catch (_) {}
  }
  const translations = {
    "填写邮箱并选择语言。新文章发布时，我会把文章正文寄给你；随时可在邮件中取消订阅。":"Enter your email and choose a language. I will send the full article when a new note is published. You can unsubscribe at any time.", "填写邮箱并选择语言。有新文章时，会把文章正文寄给你。":"Enter your email and choose a language. You will receive the full article when a new note is published.", "你想收到哪种语言的邮件？":"Which language would you like for email?", "跳到主要内容":"Skip to main content", "伟政的线上笔记":"Weizheng's Notes", "首页":"Home", "文章":"Articles", "Notion 模板":"Templates", "关于":"About", "慢慢写，慢慢长大":"Writing and growing, one step at a time", "你好，我是伟政 · 一名正在学习与记录的大学生":"Hi, I'm Weizheng · a student learning and documenting as I go", "把日常里的":"Writing down the", "小发现，":"small discoveries", "认真写下来。":"in everyday life.", "心理学本科生 ":"Psychology undergraduate ", "来自马来西亚":"From Malaysia", "我在 HELP University 读心理学，也在摸索怎样用 AI 工具和学习方法，把大学生活过得更有条理。这里记录我亲自读过、试过、想过的事；有新想法时，也会回来修正。":"I study psychology at HELP University and explore how AI tools and study methods can help me navigate university life. Here I write about what I have read, tried, and thought through, and revise my views as I learn.", "看看公开的笔记 ":"Read my notes ", "认识一下我 ":"About me ", "写给正在路上的我们":"For all of us still finding our way", "认识":"Meet", "伟政":"Weizheng", "01 / 个人笔记":"01 / PERSONAL NOTES", "从这里开始阅读":"START READING HERE", "公开的 ":"Public ", "笔记":"notes", "从课堂、工具和日常出发，":"From classes, tools, and daily life,", "写下具体的尝试与想法。":"I write about real attempts and ideas.", "搜索文章":"Search articles", "正在翻开新的一页…":"Opening a new page…", "02":"02", "关于这个角落":"ABOUT THIS SPACE", "在课本之外，":"Beyond textbooks,", "也练习理解生活。":"learning to understand life.", "我是来自马来西亚的 HELP University 心理学本科生，目前读 Year 1 · Semester 1。这个网站是我的公开笔记本。":"I'm a psychology undergraduate from Malaysia at HELP University, currently in Year 1, Semester 1. This site is my public notebook.", "我会写课堂上正在理解的心理学概念、自己实际用过的 AI 与学习方法，以及校园生活里的观察。每篇文章会尽量交代我做了什么、发现了什么，还有哪些问题仍没想清楚。":"I write about psychology concepts I'm learning, AI tools and study methods I've actually tried, and observations from campus life. I aim to explain what I did, what I found, and what remains unclear.", "心理学":"Psychology", "AI 与效率":"AI & Productivity", "校园生活":"Campus Life", "个人成长":"Personal Growth", "邮件订阅":"EMAIL UPDATES", "有新笔记时，":"When there's a new note,", "寄一封邮件给你。":"I'll send you an email.", "填写邮箱并点击订阅。以后每篇新文章发布时，我会寄给你文章链接；随时可在邮件中取消订阅。":"Enter your email to subscribe. I'll send you a link when I publish a new article. You can unsubscribe at any time.", "电子邮箱":"Email address", "订阅笔记 ":"Subscribe ", "仅用于发送新文章。不会公开你的邮箱。":"Only used to send new articles. Your email will not be public.", "邮件订阅即将开放。":"Email subscription is coming soon.", "找到我":"FIND ME", "也可以在这些地方":"You can also find me", "继续认识我。":"in these places.", "前往主页 ↗":"Visit profile ↗", "回到文章列表":"Back to articles", "伟政的线上笔记 · 阅读":"Weizheng's Notes · Reading", "订阅伟政的线上笔记":"Subscribe to Weizheng's Notes", "填写邮箱并点击订阅。有新文章时，会寄一封邮件给你。":"Enter your email to subscribe. You'll receive an email when a new article is published.", "仅用于发送新文章。不会公开你的邮箱；随时可在邮件中取消订阅。":"Only used for new articles. Your email will not be public; unsubscribe at any time.", "愿每一次记录，都让日子清晰一点。":"May each note make life a little clearer.", "由好奇心写成":"Written with curiosity", "回到顶部 ↑":"Back to top ↑", "可以带走的小工具":"TOOLS TO TAKE WITH YOU", "模板":"templates", "这里会放我愿意公开分享的 Notion 模板。打开链接后，可以在 Notion 中查看模板。":"Here are Notion templates I share publicly. Open a link to view a template in Notion.", "模板正在整理中":"Templates are being prepared", "整理好并确认可以公开分享后，我会把它们放在这里。":"I'll add them once they're ready to share publicly.", "先看看公开的笔记 ":"Read my notes first ", "搜一搜文章…":"Search articles…", "伟政分享的 Notion 模板。":"Notion templates shared by Weizheng.", "伟政的线上笔记：一位马来西亚 HELP University 心理学 Year 1 Semester 1 学生的学习与生活记录。":"Notes on learning and life by a Malaysian HELP University psychology student.", "主导航":"Main navigation", "按分类筛选":"Filter by category", "文章主题":"Article topics", "联系伟政":"Contact Weizheng", "关闭订阅窗口":"Close subscription dialog", "伟政在图书馆里":"Weizheng in a library", "伟政的线上笔记，回到首页":"Weizheng's Notes, back to home"
  };
  function t(value) { return language === "en" ? translations[value] || value : value; }
  window.SiteI18n = { language, t };
  document.documentElement.lang = language === "en" ? "en" : "zh-Hans";
  if (language === "en") {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest("script,style")) continue;
      const original = node.nodeValue;
      const trimmed = original.trim();
      if (translations[original]) node.nodeValue = translations[original];
      else if (translations[trimmed]) node.nodeValue = original.replace(trimmed, translations[trimmed]);
    }
    document.querySelectorAll("[placeholder],[aria-label]").forEach(function (element) {
      for (const name of ["placeholder", "aria-label"]) {
        const value = element.getAttribute(name);
        if (value && translations[value]) element.setAttribute(name, translations[value]);
      }
    });
    document.querySelector('meta[name="description"]').content = t(document.querySelector('meta[name="description"]').content);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.content = t(ogTitle.content);
    if (ogDescription) ogDescription.content = "Notes on learning and life by a Malaysian HELP University psychology student.";
    document.title = document.title.replace("伟政的线上笔记", "Weizheng's Notes").replace("Notion 模板", "Notion Templates");
  }
  const nav = document.querySelector(".site-nav");
  if (language === "en") {
    document.querySelectorAll('a[href="./"],a[href^="./#"],a[href="notion-templates.html"]').forEach(function (link) {
      const url = new URL(link.getAttribute("href"), location.href);
      url.searchParams.set("lang", "en");
      link.href = url.href;
    });
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "language-switch";
  button.textContent = language === "en" ? "中文" : "EN";
  button.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "Switch to English");
  button.addEventListener("click", function () {
    const next = language === "en" ? "zh" : "en";
    try { localStorage.setItem("site-language", next); } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    location.href = url.href;
  });
  nav.appendChild(button);
})();
