window.SITE_CONFIG = {
  // Paste the CSV link from Google Sheets > File > Share > Publish to web.
  // Publish only the "Public Feed" tab, in CSV format.
  publishedCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ25o3at7XPwYYuPrWDlcs03b65y8kx-DwBliM2lhxMK4aiXOAW1CjM92Ka3Wq98am97h3LGsl_18Dg/pub?gid=324209152&single=true&output=csv",
  spreadsheetUrl: "",
  // Paste the deployed Apps Script Web App /exec URL after setting up the private subscriber Sheet.
  subscriptionEndpoint: "https://script.google.com/macros/s/AKfycbzbYUQRNHAozZyAc4Jd00CRh8lv1732oJkzFtz9Y_FkQVzDacnud_snWlnLkVDaifG9/exec",
  // Keep the public placeholder hidden until a real article replaces it.
  hiddenArticleTitles: ["示例：写下一篇新文章"],
  // Add only Notion templates you intend to share publicly.
  // Example: { title: "模板名称", description: "模板简介", url: "https://www.notion.so/..." }
  notionTemplates: [
    {
      title: "Flashcard",
      description: "Spaced Repetition + Active Recall，帮助你在考试中轻松获得好成绩。",
      titleEn: "Flashcard",
      descriptionEn: "A study template for spaced repetition and active recall.",
      url: "https://sour-macaroni-e5a.notion.site/Flashcard-3fcf19bd65ea80dcad2aee0412ea5f54?source=copy_link"
    }
  ],
  // Add a public email address to show a Gmail contact card. Leave blank to hide it.
  contactEmail: "siahweizheng@gmail.com",
  // Add your public profile URLs here. Only platforms with links appear on the page.
  socialProfiles: {
    instagram: "https://www.instagram.com/weizheng_1021/",
    xiaohongshu: "https://www.rednote.com/user/profile/62cc3678000000000303ec0e",
    facebook: "https://www.facebook.com/siahweizheng",
    substack: "https://substack.com/@siahweizheng",
    threads: ""
  }
};
