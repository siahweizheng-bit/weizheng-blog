const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');

function makeSheet(headers, rows) {
  const data = [headers, ...rows];
  return {
    data,
    getLastRow: () => data.length,
    getLastColumn: () => headers.length,
    getRange(row, column, height, width) {
      return {
        getValues: () => data.slice(row - 1, row - 1 + height).map(values => values.slice(column - 1, column - 1 + width)),
        getValue: () => data[row - 1][column - 1],
        setValue: value => { data[row - 1][column - 1] = value; },
        setValues: values => values.forEach((line, rowOffset) => line.forEach((value, columnOffset) => { data[row - 1 + rowOffset][column - 1 + columnOffset] = value; }))
      };
    },
    appendRow: values => data.push(values)
  };
}

function run(sourceCsv, sheets) {
  const sent = [];
  const properties = new Map();
  const context = vm.createContext({
    Date,
    Set,
    console,
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => sheets[name] }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => sourceCsv }) },
    Utilities: {
      parseCsv: text => text.trim().split('\n').map(line => line.split(',')),
      getUuid: () => '12345678-1234-1234-1234-123456789abc',
      formatDate: () => '2026-10-13'
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: message => sent.push(message) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/example/exec' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 'allowall' }, createHtmlOutput: html => ({ html, setXFrameOptionsMode() { return this; } }) }
  });
  vm.runInContext(source, context);
  vm.runInContext("SCRIPT_CONFIG.subscriberSpreadsheetId = 'test-sheet-id'", context);
  return { context, sent };
}

test('subscription backend rejects invalid and formula-like email values', () => {
  const { context } = run('标题,网址标识\n', {});
  assert.equal(vm.runInContext("email_(' Reader@example.com ')", context), 'reader@example.com');
  assert.equal(vm.runInContext("email_('=IMPORTXML(foo)@example.com')", context), '');
  assert.equal(vm.runInContext("email_('bad address@example.com')", context), '');
});

test('new article goes only to active subscribers and is not resent', () => {
  const sheets = {
    Subscribers: makeSheet(['Email', 'Status', 'Token', 'CreatedAt', 'ConfirmedAt', 'LastConfirmationAt', 'Language'], [
      ['active@example.com', 'ACTIVE', 'token-active'],
      ['pending@example.com', 'PENDING', 'token-pending'],
      ['gone@example.com', 'UNSUBSCRIBED', 'token-gone']
    ]),
    SeenArticles: makeSheet(['Slug', 'SeenAt'], [['old-post', new Date()]]),
    Deliveries: makeSheet(['Slug', 'Email', 'SentAt'], [])
  };
  const { context, sent } = run('标题,网址标识,正文,英文标题,英文正文\n旧文章,old-post,旧正文,Old post,Old body\n新文章,new-post,新正文,New post,New body\n', sheets);
  vm.runInContext('checkNewArticles()', context);
  vm.runInContext('checkNewArticles()', context);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'active@example.com');
  assert.match(sent[0].body, /\?post=new-post/);
  assert.match(sent[0].body, /新正文/);
  assert.match(sent[0].body, /action=unsubscribe/);
  assert.equal(sheets.SeenArticles.data.length, 3);
  assert.equal(sheets.Deliveries.data.length, 2);
});

test('subscriber becomes active immediately, can unsubscribe, and can subscribe again', () => {
  const sheets = {
    Subscribers: makeSheet(['Email', 'Status', 'Token', 'CreatedAt', 'ConfirmedAt', 'LastConfirmationAt', 'Language'], [])
  };
  const { context, sent } = run('标题,网址标识\n', sheets);
  const nonce = 'abcdefghijklmnop';
  const post = vm.runInContext(`doPost({parameter:{nonce:'${nonce}',email:'reader@example.com',language:'en',website:''}})`, context);
  assert.match(post.html, /blog-subscription/);
  assert.equal(sent.length, 0);
  assert.equal(sheets.Subscribers.data[1][1], 'ACTIVE');
  assert.equal(sheets.Subscribers.data[1][6], 'en');
  const token = sheets.Subscribers.data[1][2];
  vm.runInContext(`doGet({parameter:{action:'unsubscribe',token:'${token}'}})`, context);
  assert.equal(sheets.Subscribers.data[1][1], 'UNSUBSCRIBED');
  vm.runInContext(`doPost({parameter:{nonce:'${nonce}',email:'reader@example.com',language:'zh',website:''}})`, context);
  assert.equal(sheets.Subscribers.data.length, 2);
  assert.equal(sheets.Subscribers.data[1][1], 'ACTIVE');
  assert.equal(sheets.Subscribers.data[1][6], 'zh');
  assert.equal(sent.length, 0);
});

test('old pending subscriptions become active on submission', () => {
  const sheets = {
    Subscribers: makeSheet(['Email', 'Status', 'Token', 'CreatedAt', 'ConfirmedAt', 'LastConfirmationAt'], [
      ['reader@example.com', 'PENDING', 'old-token', new Date(), '', new Date()]
    ])
  };
  const { context } = run('标题,网址标识\n', sheets);
  vm.runInContext("doPost({parameter:{nonce:'abcdefghijklmnop',email:'reader@example.com',language:'en',website:''}})", context);
  assert.equal(sheets.Subscribers.data[1][1], 'ACTIVE');
  assert.equal(sheets.Subscribers.data[0][6], 'Language');
  assert.equal(sheets.Subscribers.data[1][6], 'en');
});

test('English subscribers receive English body and skip articles without English text', () => {
  const sheets = {
    Subscribers: makeSheet(['Email', 'Status', 'Token', 'CreatedAt', 'ConfirmedAt', 'LastConfirmationAt', 'Language'], [
      ['english@example.com', 'ACTIVE', 'token-en', '', '', '', 'en'],
      ['chinese@example.com', 'ACTIVE', 'token-zh', '', '', '', 'zh']
    ]),
    SeenArticles: makeSheet(['Slug', 'SeenAt'], []),
    Deliveries: makeSheet(['Slug', 'Email', 'SentAt'], [])
  };
  const { context, sent } = run('标题,网址标识,正文,英文标题,英文正文\n双语,bilingual,中文正文,English title,English body\n仅中文,chinese-only,另一篇中文正文,,\n', sheets);
  vm.runInContext('checkNewArticles()', context);
  assert.equal(sent.length, 3);
  const english = sent.find(message => message.to === 'english@example.com');
  assert.match(english.body, /English body/);
  assert.match(english.body, /lang=en/);
  assert.doesNotMatch(english.body, /中文正文/);
  assert.equal(sent.filter(message => message.to === 'english@example.com').length, 1);
});
