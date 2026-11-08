(function () {
  "use strict";
  document.getElementById("current-year").textContent = new Date().getFullYear();
  const list = document.getElementById("templates-list");
  const empty = document.getElementById("templates-empty");
  const templates = (window.SITE_CONFIG && window.SITE_CONFIG.notionTemplates) || [];
  const en = window.SiteI18n.language === "en";
  let count = 0;

  if (Array.isArray(templates)) templates.forEach(function (item) {
    if (!item || typeof item.title !== "string" || !item.title.trim()) return;
    let url;
    try {
      url = new URL(String(item.url || ""));
      if (url.protocol !== "https:") return;
    } catch (_) { return; }

    const card = document.createElement("article");
    card.className = "template-card";
    const label = document.createElement("span");
    label.className = "template-card-label";
    label.textContent = "NOTION TEMPLATE";
    const title = document.createElement("h2");
    title.textContent = en ? String(item.titleEn || item.title).trim() : item.title.trim();
    const description = document.createElement("p");
    description.textContent = en ? String(item.descriptionEn || "English description coming soon.").trim() : String(item.description || "").trim();
    const link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = en ? "View template ↗" : "查看模板 ↗";
    link.setAttribute("aria-label", en ? "View " + title.textContent + " template in a new tab" : "查看 " + item.title.trim() + " 模板，在新标签页打开");
    card.append(label, title, description, link);
    list.append(card);
    count += 1;
  });

  empty.hidden = count > 0;
})();
