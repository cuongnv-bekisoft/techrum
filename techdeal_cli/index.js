#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';
import pc from 'picocolors';
import ora from 'ora';

// Config file path
const CONFIG_FILE = path.join(os.homedir(), '.techrum-cli.json');
const API_NEWS = 'https://getnews.mdchannelvn.workers.dev';
const API_CONVERT_BASE = 'https://convert_news.mdchannelvn.workers.dev';
const API_POST_BASE = 'https://techdeal-worker.mdchannelvn.workers.dev/api';

const CATEGORIES = [
  { title: 'Công nghệ (technology)', value: 'technology' },
  { title: 'Android', value: 'android' },
  { title: 'iOS', value: 'ios' },
  { title: 'Windows', value: 'windows' },
  { title: 'PC máy tính (pc)', value: 'pc' },
  { title: 'Thế giới Game (gaming)', value: 'gaming' },
  { title: 'Deals', value: 'deals' },
];

// Default config
let config = {
  jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzkwMjMyZS0wMmRhLTQ4YzEtOWI0ZC1iMjcwYmY5YmQ2MjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwic3RhdHVzIjoiYWN0aXZlIiwiaWF0IjoxNzgwMTEzOTY5LCJleHAiOjE3ODA3MTg3Njl9.1Q2GXLut_m5jBBueU6mHO9mxvawDQNrat-rXDbmWwTA', // default token from web app
};

// Load config
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    config = { ...config, ...data };
  }
} catch (e) {
  // Ignore error
}

// Save config
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error(pc.red('Không thể lưu cấu hình!'));
  }
}

// Helper to get article URL
function getArticleLink(article) {
  return (
    article?.link ||
    article?.url ||
    article?.original_link ||
    article?.originalLink ||
    article?.source_url ||
    article?.sourceUrl ||
    ""
  );
}

// Main Menu
async function mainMenu() {
  console.clear();
  console.log(pc.cyan('========================================'));
  console.log(pc.bold(pc.yellow('         TECHRUM CLI CONVERTER         ')));
  console.log(pc.cyan('========================================\n'));

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'Chọn chức năng:',
    choices: [
      { title: '📰 Xem nguồn tin & Lấy tin mới', value: 'sources' },
      { title: '🔗 Convert URL tin tức trực tiếp', value: 'convert' },
      { title: '💾 Xem danh sách tin đã lưu', value: 'saved' },
      { title: '🔑 Đăng nhập / Cập nhật JWT Token', value: 'login' },
      { title: '❌ Thoát', value: 'exit' }
    ]
  });

  switch (response.action) {
    case 'sources':
      await handleSources();
      break;
    case 'convert':
      await handleDirectConvert();
      break;
    case 'saved':
      await handleSavedArticles();
      break;
    case 'login':
      await handleLogin();
      break;
    case 'exit':
      console.log(pc.green('\nTạm biệt!'));
      process.exit(0);
      break;
    default:
      process.exit(0);
  }
}

// Handle Sources list
async function handleSources() {
  const spinner = ora('Đang tải danh sách nguồn tin...').start();
  let sources = [];
  try {
    const res = await fetch(`${API_NEWS}/sources`);
    sources = await res.json();
    spinner.succeed(pc.green(' Tải nguồn tin thành công!'));
  } catch (err) {
    spinner.fail(pc.red(' Lỗi tải nguồn tin: ' + err.message));
    await backToMenu();
    return;
  }

  if (sources.length === 0) {
    console.log(pc.yellow('\nKhông tìm thấy nguồn tin nào.'));
    await backToMenu();
    return;
  }

  const choices = sources.map(s => ({
    title: `${s.name} ${s.isBot ? pc.yellow('(Bot Check)') : ''}`,
    value: s
  }));
  choices.push({ title: pc.red('⬅ Quay lại'), value: 'back' });

  const response = await prompts({
    type: 'select',
    name: 'source',
    message: 'Chọn nguồn tin muốn xem:',
    choices
  });

  if (!response.source || response.source === 'back') {
    mainMenu();
    return;
  }

  await viewArticles(response.source, 1);
}

// View Articles with Pagination
async function viewArticles(source, page = 1) {
  const limit = 10;
  const spinner = ora(`Đang tải tin mới từ ${source.name} (Trang ${page})...`).start();
  let data;
  try {
    const res = await fetch(`${API_NEWS}/?url=${encodeURIComponent(source.url)}&page=${page}&limit=${limit}`);
    data = await res.json();
    spinner.succeed(pc.green(` Tải tin từ ${source.name} thành công!`));
  } catch (err) {
    spinner.fail(pc.red(' Lỗi tải tin: ' + err.message));
    await handleSources();
    return;
  }

  const articles = data.articles || [];
  if (articles.length === 0) {
    console.log(pc.yellow('\nKhông có bài viết nào ở trang này.'));
    const navigation = [];
    if (page > 1) navigation.push({ title: '⬅ Trang trước', value: 'prev' });
    navigation.push({ title: '⬅ Quay lại nguồn tin', value: 'back' });

    const navResponse = await prompts({
      type: 'select',
      name: 'action',
      message: 'Điều hướng:',
      choices: navigation
    });

    if (navResponse.action === 'prev') {
      await viewArticles(source, page - 1);
    } else {
      await handleSources();
    }
    return;
  }

  const choices = articles.map((art, idx) => ({
    title: `${idx + 1}. ${art.title_vi || art.title}`,
    value: art
  }));

  // Pagination navigation options
  choices.push({ title: pc.cyan('➡️ Trang tiếp theo'), value: 'next' });
  if (page > 1) {
    choices.push({ title: pc.cyan('⬅️ Trang trước'), value: 'prev' });
  }
  choices.push({ title: pc.red('⬅ Quay lại danh sách nguồn'), value: 'back' });

  const response = await prompts({
    type: 'select',
    name: 'selected',
    message: `Chọn bài viết từ ${source.name} (Trang ${page}):`,
    choices
  });

  if (!response.selected) {
    await handleSources();
    return;
  }

  if (response.selected === 'next') {
    await viewArticles(source, page + 1);
  } else if (response.selected === 'prev') {
    await viewArticles(source, page - 1);
  } else if (response.selected === 'back') {
    await handleSources();
  } else {
    await handleArticleDetails(response.selected, source, page);
  }
}

// Article Action Details Menu
async function handleArticleDetails(article, source, returnPage) {
  console.clear();
  console.log(pc.cyan('========================================'));
  console.log(pc.bold(pc.green(article.title_vi || article.title)));
  console.log(pc.cyan('========================================'));
  const link = getArticleLink(article);
  console.log(`${pc.bold('Link gốc:')} ${pc.underline(pc.blue(link))}`);
  if (article.image) {
    console.log(`${pc.bold('Ảnh minh họa:')} ${article.image}`);
  }
  console.log('\n');

  const actionResponse = await prompts({
    type: 'select',
    name: 'action',
    message: 'Bạn muốn làm gì với bài viết này?',
    choices: [
      { title: '💾 Lưu bài viết này', value: 'save' },
      { title: '🔗 Chuyển đổi (Convert) tin tức', value: 'convert' },
      { title: '⬅ Quay lại danh sách tin', value: 'back' }
    ]
  });

  if (actionResponse.action === 'save') {
    const spinner = ora('Đang lưu bài viết...').start();
    try {
      const payload = {
        title: article.title_vi || article.title,
        link: link,
        image: article.image || "",
        source_id: source.id
      };
      const res = await fetch(`${API_NEWS}/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        spinner.succeed(pc.green(' Lưu bài viết thành công!'));
      } else {
        spinner.fail(pc.red(' Không thể lưu bài viết.'));
      }
    } catch (e) {
      spinner.fail(pc.red(' Lỗi kết nối: ' + e.message));
    }
    // Quay lại danh sách bài viết thay vì menu chính
    await prompts({
      type: 'text',
      name: 'pressEnter',
      message: 'Nhấn Enter để quay lại danh sách bài viết...'
    });
    await viewArticles(source, returnPage);
  } else if (actionResponse.action === 'convert') {
    await runConvertFlow(link, source.isBot ? 1 : 0);
  } else {
    await viewArticles(source, returnPage);
  }
}

// Direct Convert Handler
async function handleDirectConvert() {
  console.log(pc.cyan('\n--- CONVERT URL TRỰC TIẾP ---'));
  const response = await prompts([
    {
      type: 'text',
      name: 'url',
      message: 'Nhập URL bài viết cần convert:'
    },
    {
      type: 'confirm',
      name: 'isBot',
      message: 'Site này có bị Cloudflare bot check không?',
      initial: false
    }
  ]);

  if (!response.url) {
    mainMenu();
    return;
  }

  await runConvertFlow(response.url, response.isBot ? 1 : 0);
}

// Core Convert Flow
async function runConvertFlow(url, isBot = 0) {
  // Lựa chọn Engine / Model
  const engineResponse = await prompts({
    type: 'select',
    name: 'engine',
    message: 'Chọn AI Engine để convert:',
    choices: [
      { title: '✨ Gemini (Khuyên dùng)', value: 'gemini' },
      { title: '⚡ Workers AI', value: 'workersai' }
    ],
    initial: 0 // Ưu tiên Gemini đầu tiên
  });

  if (!engineResponse.engine) {
    mainMenu();
    return;
  }

  let modelParam = "";
  if (engineResponse.engine === 'workersai') {
    const modelResponse = await prompts({
      type: 'select',
      name: 'model',
      message: 'Chọn model Workers AI:',
      choices: [
        { title: 'Qwen 3 70B', value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
        { title: 'Gemma 3 12B', value: '@cf/google/gemma-3-12b-it' }
      ]
    });
    if (modelResponse.model) {
      modelParam = `&model=${encodeURIComponent(modelResponse.model)}`;
    }
  }

  const spinner = ora('Đang gửi yêu cầu chuyển đổi (AI có thể mất 10-30s)...').start();

  try {
    const res = await fetch(`${API_CONVERT_BASE}/?engine=${engineResponse.engine}&bot=${isBot}${modelParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      throw new Error("API trả về mã lỗi: " + res.status);
    }

    const json = await res.json();
    if (!json.data) {
      throw new Error("Không nhận được nội dung từ AI");
    }

    spinner.succeed(pc.green(' Chuyển đổi thành công!'));

    let titleVal = json.title_short || "";
    let contentVal = json.data.replace(/\\n/g, '\n');
    let categoryVal = "technology";
    let tagsVal = [];

    // Parse if AI returned JSON format
    try {
      const parsed = JSON.parse(json.data);
      if (parsed && typeof parsed === "object") {
        titleVal = titleVal || parsed.title || "";
        contentVal = parsed.content || "";
        categoryVal = parsed.category_id || "technology";
        tagsVal = parsed.tags || [];
      }
    } catch (e) {
      // not JSON format, keep default plain text
    }

    console.log(pc.cyan('\n=== NỘI DUNG SAU CONVERT ==='));
    console.log(`${pc.bold('Tiêu đề dự kiến:')} ${titleVal}`);
    console.log(`${pc.bold('Danh mục:')} ${categoryVal}`);
    console.log(`${pc.bold('Tags:')} ${tagsVal.join(', ') || 'Không có'}`);
    console.log(pc.gray('----------------------------------------'));
    console.log(contentVal.substring(0, 500) + (contentVal.length > 500 ? '\n... (và phần còn lại)' : ''));
    console.log(pc.cyan('=============================\n'));

    // Hàm đệ quy/vòng lặp nội bộ để xử lý hành động sau khi convert mà không phải chạy lại API
    async function showActionsMenu() {
      const postAction = await prompts({
        type: 'select',
        name: 'action',
        message: 'Bạn muốn làm gì tiếp theo?',
        choices: [
          { title: '🚀 Đăng tải lên Techdeal ngay lập tức', value: 'publish' },
          { title: '📝 Xem toàn bộ nội dung đã convert', value: 'show_all' },
          { title: '⬅ Quay lại Menu chính', value: 'menu' }
        ]
      });

      if (postAction.action === 'show_all') {
        console.clear();
        console.log(pc.yellow(contentVal));
        console.log('\n');
        const actionAfterShow = await prompts({
          type: 'select',
          name: 'action',
          message: 'Lựa chọn:',
          choices: [
            { title: '🚀 Đăng tải lên Techdeal', value: 'publish' },
            { title: '⬅ Quay lại menu hành động bài viết', value: 'back_to_actions' }
          ]
        });

        if (actionAfterShow.action === 'publish') {
          await runPublishFlow({ title: titleVal, content: contentVal, category_id: categoryVal, tags: tagsVal });
        } else {
          // Quay lại menu hành động mà không cần convert lại
          console.clear();
          console.log(pc.cyan('\n=== NỘI DUNG SAU CONVERT (XEM LẠI) ==='));
          console.log(`${pc.bold('Tiêu đề dự kiến:')} ${titleVal}`);
          console.log(`${pc.bold('Danh mục:')} ${categoryVal}`);
          console.log(`${pc.bold('Tags:')} ${tagsVal.join(', ') || 'Không có'}`);
          console.log(pc.gray('----------------------------------------'));
          console.log(contentVal.substring(0, 500) + (contentVal.length > 500 ? '\n... (và phần còn lại)' : ''));
          console.log(pc.cyan('=============================\n'));
          await showActionsMenu();
        }
      } else if (postAction.action === 'publish') {
        await runPublishFlow({ title: titleVal, content: contentVal, category_id: categoryVal, tags: tagsVal });
      } else {
        mainMenu();
      }
    }

    await showActionsMenu();

  } catch (err) {
    spinner.fail(pc.red(' Lỗi chuyển đổi: ' + err.message));
    await backToMenu();
  }
}

// Core Publish Flow
async function runPublishFlow(postData) {
  // Confirm and Edit details before publish
  const editDetails = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Xác nhận/Sửa tiêu đề bài đăng (Dùng phím mũi tên Trái/Phải để sửa):',
      initial: postData.title
    },
    {
      type: 'select',
      name: 'category_id',
      message: 'Chọn danh mục bài viết:',
      choices: CATEGORIES,
      initial: Math.max(0, CATEGORIES.findIndex(c => c.value === postData.category_id))
    },
    {
      type: 'text',
      name: 'tags',
      message: 'Nhập tags (phân cách bằng dấu phẩy):',
      initial: postData.tags.join(', ')
    },
    {
      type: 'confirm',
      name: 'confirmPublish',
      message: 'Bạn có chắc chắn muốn đăng bài viết này?',
      initial: true
    }
  ]);

  if (!editDetails.confirmPublish) {
    console.log(pc.yellow('Hủy đăng bài.'));
    await backToMenu();
    return;
  }

  const payload = {
    title: editDetails.title,
    content: postData.content,
    category_id: editDetails.category_id,
    tags: editDetails.tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
    scheduled_at: null
  };

  const spinner = ora('Đang đăng bài viết lên Techdeal...').start();
  try {
    const res = await fetch(`${API_POST_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    const resJson = await res.json();
    if (res.ok && resJson.success) {
      spinner.succeed(pc.green(' Đăng bài viết lên Techdeal thành công!'));
    } else {
      spinner.fail(pc.red(' Đăng bài viết thất bại: ' + (resJson.message || 'Mã lỗi ' + res.status)));
    }
  } catch (err) {
    spinner.fail(pc.red(' Lỗi gửi bài viết: ' + err.message));
  }
  await backToMenu();
}

// View Saved Articles
async function handleSavedArticles() {
  const spinner = ora('Đang tải danh sách nguồn tin...').start();
  let sources = [];
  try {
    const res = await fetch(`${API_NEWS}/sources`);
    sources = await res.json();
    spinner.succeed(pc.green(' Tải danh sách nguồn thành công!'));
  } catch (err) {
    spinner.fail(pc.red(' Lỗi tải nguồn tin: ' + err.message));
    await backToMenu();
    return;
  }

  if (sources.length === 0) {
    console.log(pc.yellow('\nKhông tìm thấy nguồn tin nào.'));
    await backToMenu();
    return;
  }

  const choices = sources.map(s => ({
    title: `${s.name} ${s.isBot ? pc.yellow('(Bot Check)') : ''}`,
    value: s
  }));
  choices.push({ title: pc.red('⬅ Quay lại'), value: 'back' });

  const response = await prompts({
    type: 'select',
    name: 'source',
    message: 'Chọn nguồn tin để xem các bài viết đã lưu:',
    choices
  });

  if (!response.source || response.source === 'back') {
    mainMenu();
    return;
  }

  await viewSavedArticlesBySource(response.source, 1);
}

// View Saved Articles by Source with Pagination
async function viewSavedArticlesBySource(source, page = 1) {
  const limit = 10;
  const spinner = ora(`Đang tải bài viết đã lưu từ ${source.name} (Trang ${page})...`).start();
  let data;
  try {
    const res = await fetch(`${API_NEWS}/saved?source=${source.id}&limit=${limit}&page=${page}`);
    data = await res.json();
    spinner.succeed(pc.green(` Tải bài viết đã lưu từ ${source.name} thành công!`));
  } catch (err) {
    spinner.fail(pc.red(' Lỗi tải bài viết: ' + err.message));
    await handleSavedArticles();
    return;
  }

  const articles = data.articles || [];
  if (articles.length === 0) {
    console.log(pc.yellow('\nKhông có bài viết đã lưu nào ở trang này.'));
    const navigation = [];
    if (page > 1) navigation.push({ title: '⬅ Trang trước', value: 'prev' });
    navigation.push({ title: '⬅ Quay lại chọn nguồn', value: 'back' });

    const navResponse = await prompts({
      type: 'select',
      name: 'action',
      message: 'Điều hướng:',
      choices: navigation
    });

    if (navResponse.action === 'prev') {
      await viewSavedArticlesBySource(source, page - 1);
    } else {
      await handleSavedArticles();
    }
    return;
  }

  const choices = articles.map((art, idx) => ({
    title: `${idx + 1}. ${art.title}`,
    value: art
  }));

  // Pagination navigation options
  choices.push({ title: pc.cyan('➡️ Trang tiếp theo'), value: 'next' });
  if (page > 1) {
    choices.push({ title: pc.cyan('⬅️ Trang trước'), value: 'prev' });
  }
  choices.push({ title: pc.red('⬅ Quay lại danh sách nguồn'), value: 'back' });

  const response = await prompts({
    type: 'select',
    name: 'selected',
    message: `Bài viết đã lưu từ ${source.name} (Trang ${page}):`,
    choices
  });

  if (!response.selected) {
    await handleSavedArticles();
    return;
  }

  if (response.selected === 'next') {
    await viewSavedArticlesBySource(source, page + 1);
  } else if (response.selected === 'prev') {
    await viewSavedArticlesBySource(source, page - 1);
  } else if (response.selected === 'back') {
    await handleSavedArticles();
  } else {
    await handleSavedArticleDetails(response.selected, source, page);
  }
}

// Saved Article Actions
async function handleSavedArticleDetails(article, source, returnPage) {
  console.clear();
  console.log(pc.cyan('========================================'));
  console.log(pc.bold(pc.green(article.title)));
  console.log(pc.cyan('========================================'));
  console.log(`${pc.bold('Link gốc:')} ${pc.underline(pc.blue(article.link))}`);
  console.log('\n');

  const act = await prompts({
    type: 'select',
    name: 'action',
    message: 'Hành động:',
    choices: [
      { title: '🔗 Chuyển đổi (Convert) tin này', value: 'convert' },
      { title: '❌ Xóa khỏi danh sách lưu', value: 'delete' },
      { title: '⬅ Quay lại danh sách', value: 'back' }
    ]
  });

  if (act.action === 'delete') {
    const delSpinner = ora('Đang xóa...').start();
    try {
      const res = await fetch(`${API_NEWS}/saved/${article.id}`, { method: 'DELETE' });
      if (res.ok) {
        delSpinner.succeed(pc.green(' Đã xóa bài viết thành công.'));
      } else {
        delSpinner.fail(pc.red(' Xóa thất bại.'));
      }
    } catch (e) {
      delSpinner.fail(pc.red(' Lỗi kết nối: ' + e.message));
    }
    // Quay lại danh sách bài đã lưu của nguồn này
    await prompts({
      type: 'text',
      name: 'pressEnter',
      message: 'Nhấn Enter để quay lại...'
    });
    await viewSavedArticlesBySource(source, returnPage);
  } else if (act.action === 'convert') {
    await runConvertFlow(article.link, source.isBot ? 1 : 0);
  } else {
    await viewSavedArticlesBySource(source, returnPage);
  }
}

async function handleLogin() {
  console.log(pc.cyan('\n--- ĐĂNG NHẬP TECHDEAL ---'));
  const credentials = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Nhập email:',
      initial: 'admin@techdeal.vn'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Nhập mật khẩu:'
    }
  ]);

  if (!credentials.email || !credentials.password) {
    console.log(pc.red('Hủy đăng nhập.'));
    await backToMenu();
    return;
  }

  const spinner = ora('Đang xác thực...').start();
  try {
    const res = await fetch(`${API_POST_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });
    const data = await res.json();
    const token = data.token || (data.data && data.data.token);

    if (res.ok && token) {
      spinner.succeed(pc.green(' Đăng nhập thành công!'));
      config.jwtToken = token;
      saveConfig();
    } else {
      spinner.fail(pc.red(' Đăng nhập thất bại: ' + (data.message || 'Sai thông tin')));
    }
  } catch (err) {
    spinner.fail(pc.red(' Lỗi kết nối máy chủ: ' + err.message));
  }
  await backToMenu();
}

async function backToMenu() {
  await prompts({
    type: 'text',
    name: 'pressEnter',
    message: 'Nhấn Enter để quay lại Menu chính...'
  });
  mainMenu();
}

// Khởi chạy
mainMenu();
