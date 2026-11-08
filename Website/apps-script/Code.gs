/**
 * Private subscription backend for the static blog.
 * Deploy as a Web App: execute as Me, access Anyone.
 * Run setup() once before deployment and after setting SCRIPT_CONFIG below.
 */
const SCRIPT_CONFIG = {
  subscriberSpreadsheetId: 'PASTE_PRIVATE_SUBSCRIBER_SHEET_ID',
  publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ25o3at7XPwYYuPrWDlcs03b65y8kx-DwBliM2lhxMK4aiXOAW1CjM92Ka3Wq98am97h3LGsl_18Dg/pub?gid=324209152&single=true&output=csv',
  siteUrl: 'https://weizheng-notes.vercel.app/',
  siteName: '伟政的线上笔记',
  replyTo: 'siahweizheng@gmail.com'
};

const SUBSCRIBER_HEADERS = ['Email', 'Status', 'Token', 'CreatedAt', 'ConfirmedAt', 'LastConfirmationAt', 'Language'];
const SEEN_HEADERS = ['Slug', 'SeenAt'];
const DELIVERY_HEADERS = ['Slug', 'Email', 'SentAt'];

function spreadsheet_() {
  const id = SCRIPT_CONFIG.subscriberSpreadsheetId;
  if (!id || id.startsWith('PASTE_')) throw new Error('Set subscriberSpreadsheetId first.');
  return SpreadsheetApp.openById(id);
}

function sheet_(name, headers) {
  const book = spreadsheet_();
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (name === 'Subscribers' && sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, headers.length).setValue('Language');
  }
  return sheet;
}

function rows_(sheet) {
  const last = sheet.getLastRow();
  return last < 2 ? [] : sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
}

function email_(value) {
  const email = String(value || '').trim().toLowerCase();
  // Leading =, +, -, and @ can become formulas when written to Sheets.
  return email.length <= 254 && /^[a-z0-9][a-z0-9._%+\-]*@[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}$/i.test(email) ? email : '';
}

function csvArticles_() {
  const url = SCRIPT_CONFIG.publishedCsvUrl;
  if (!url || url.startsWith('PASTE_')) throw new Error('Set publishedCsvUrl first.');
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Public Feed fetch failed: ' + response.getResponseCode());
  const csv = Utilities.parseCsv(response.getContentText('UTF-8'));
  if (!csv.length) return [];
  const headers = csv[0].map(value => String(value).replace(/^\uFEFF/, '').trim());
  const slugColumn = headers.indexOf('网址标识');
  const titleColumn = headers.indexOf('标题');
  const contentColumn = headers.indexOf('正文');
  const titleEnColumn = headers.indexOf('英文标题');
  const contentEnColumn = headers.indexOf('英文正文');
  if ([slugColumn, titleColumn, contentColumn, titleEnColumn, contentEnColumn].some(index => index < 0)) throw new Error('Public Feed needs 标题, 网址标识, 正文, 英文标题 and 英文正文 columns.');
  return csv.slice(1).map(row => ({
    slug: String(row[slugColumn] || '').trim(),
    title: String(row[titleColumn] || '').trim(),
    content: String(row[contentColumn] || '').trim(),
    titleEn: String(row[titleEnColumn] || '').trim(),
    contentEn: String(row[contentEnColumn] || '').trim()
  })).filter(article => article.slug && article.title && /^[a-z0-9][a-z0-9-]*$/i.test(article.slug));
}

function setup() {
  if (!SCRIPT_CONFIG.siteUrl.startsWith('https://')) throw new Error('siteUrl must use HTTPS.');
  const subscribers = sheet_('Subscribers', SUBSCRIBER_HEADERS);
  subscribers.getRange('A:A').setNumberFormat('@');
  const seen = sheet_('SeenArticles', SEEN_HEADERS);
  sheet_('Deliveries', DELIVERY_HEADERS);
  const existing = new Set(rows_(seen).map(row => String(row[0])));
  const now = new Date();
  csvArticles_().forEach(article => {
    if (!existing.has(article.slug)) seen.appendRow([article.slug, now]);
  });
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'checkNewArticles').forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('checkNewArticles').timeBased().everyHours(1).create();
}

function webAppUrl_() {
  return ScriptApp.getService().getUrl();
}

function manageUrl_(action, token) {
  return webAppUrl_() + '?action=' + encodeURIComponent(action) + '&token=' + encodeURIComponent(token);
}

function reply_(nonce, result) {
  const payload = JSON.stringify({ type: 'blog-subscription', nonce: nonce, result: result });
  const html = '<!doctype html><meta charset="utf-8"><script>top.postMessage(' + payload.replace(/</g, '\\u003c') + ',"*");</script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const fields = e && e.parameter || {};
  const nonce = /^[a-zA-Z0-9_-]{16,100}$/.test(String(fields.nonce || '')) ? fields.nonce : '';
  if (!nonce || fields.website) return reply_(nonce, 'invalid');
  const email = email_(fields.email);
  const language = String(fields.language || '');
  if (!email || !['zh', 'en'].includes(language)) return reply_(nonce, 'invalid');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply_(nonce, 'error');
  try {
    const sheet = sheet_('Subscribers', SUBSCRIBER_HEADERS);
    const existing = rows_(sheet).findIndex(row => String(row[0]).toLowerCase() === email);
    if (existing >= 0) {
      const row = existing + 2;
      const values = sheet.getRange(row, 1, 1, SUBSCRIBER_HEADERS.length).getValues()[0];
      if (values[1] === 'ACTIVE') {
        sheet.getRange(row, 7).setValue(language);
        return reply_(nonce, 'accepted');
      }
      const token = Utilities.getUuid() + Utilities.getUuid();
      const now = new Date();
      sheet.getRange(row, 2, 1, 5).setValues([['ACTIVE', token, values[3] || now, now, '']]);
      sheet.getRange(row, 7).setValue(language);
      return reply_(nonce, 'accepted');
    }
    const token = Utilities.getUuid() + Utilities.getUuid();
    const now = new Date();
    sheet.appendRow([email, 'ACTIVE', token, now, now, '', language]);
    return reply_(nonce, 'accepted');
  } catch (error) {
    console.error('Subscription submission failed: ' + error.message);
    return reply_(nonce, 'error');
  } finally {
    lock.releaseLock();
  }
}

function page_(message) {
  return HtmlService.createHtmlOutput('<!doctype html><html lang="zh-Hans"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>邮件订阅</title><body style="font:16px/1.8 sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem"><h1>' + message + '</h1><p><a href="' + SCRIPT_CONFIG.siteUrl + '">返回伟政的线上笔记</a></p></body></html>');
}

function doGet(e) {
  const action = String(e && e.parameter && e.parameter.action || '');
  const token = String(e && e.parameter && e.parameter.token || '');
  if (action !== 'unsubscribe' || !/^[a-f0-9-]{72}$/.test(token)) return page_('链接无效。');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return page_('请稍后重试。');
  try {
    const sheet = sheet_('Subscribers', SUBSCRIBER_HEADERS);
    const index = rows_(sheet).findIndex(row => String(row[2]) === token);
    if (index < 0) return page_('链接无效或已过期。');
    const row = index + 2;
    const status = String(sheet.getRange(row, 2).getValue());
    if (status === 'UNSUBSCRIBED') return page_('已取消订阅。');
    sheet.getRange(row, 2).setValue('UNSUBSCRIBED');
    return page_('已取消订阅。');
  } finally {
    lock.releaseLock();
  }
}

function checkNewArticles() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const articles = csvArticles_();
    const seen = sheet_('SeenArticles', SEEN_HEADERS);
    const known = new Set(rows_(seen).map(row => String(row[0])));
    const deliveries = sheet_('Deliveries', DELIVERY_HEADERS);
    const sent = new Set(rows_(deliveries).map(row => String(row[0]) + '\n' + String(row[1]).toLowerCase()));
    const subscribers = rows_(sheet_('Subscribers', SUBSCRIBER_HEADERS))
      .filter(row => row[1] === 'ACTIVE' && email_(row[0]));
    for (const article of articles) {
      if (known.has(article.slug)) continue;
      let complete = true;
      for (const subscriber of subscribers) {
        const email = email_(subscriber[0]);
        const language = subscriber[6] === 'en' ? 'en' : 'zh';
        if (language === 'en' && (!article.titleEn || !article.contentEn)) continue;
        const title = language === 'en' ? article.titleEn : article.title;
        const content = language === 'en' ? article.contentEn : article.content;
        if (!content) continue;
        const key = article.slug + '\n' + email;
        if (sent.has(key)) continue;
        if (MailApp.getRemainingDailyQuota() < 1) { complete = false; break; }
        const link = SCRIPT_CONFIG.siteUrl.replace(/\/?$/, '/') + '?post=' + encodeURIComponent(article.slug) + (language === 'en' ? '&lang=en' : '');
        try {
          MailApp.sendEmail({
            to: email,
            subject: (language === 'en' ? 'New note: ' : '新笔记：') + title,
            body: title + '\n\n' + content + '\n\n' + (language === 'en' ? 'Read online: ' : '在线阅读：') + link + '\n\n' + (language === 'en' ? 'Unsubscribe: ' : '取消订阅：') + manageUrl_('unsubscribe', subscriber[2]),
            name: SCRIPT_CONFIG.siteName,
            replyTo: SCRIPT_CONFIG.replyTo
          });
          deliveries.appendRow([article.slug, email, new Date()]);
          sent.add(key);
        } catch (error) {
          console.error('Delivery failed for article ' + article.slug + ': ' + error.message);
          complete = false;
        }
      }
      if (complete) {
        seen.appendRow([article.slug, new Date()]);
        known.add(article.slug);
      }
    }
  } finally {
    lock.releaseLock();
  }
}
