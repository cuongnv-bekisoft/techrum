const API_BASE = "https://convert_news.mdchannelvn.workers.dev";

// =============================
// 🚀 CONVERT

// =============================
document.getElementById("convertBtn").addEventListener("click", async () => {
  const url = document.getElementById("urlInput").value.trim();
  const loadingEl = document.getElementById("loadingText");
  const output = document.getElementById("outputArea");

  if (!url) {
    alert("Vui lòng nhập URL!");
    return;
  }

  loadingEl.classList.add("show");
  output.value = "";

  try {
    const engine = document.getElementById("engineSelect").value;
    const model = document.getElementById("modelSelect").value;
    let isBot = bot === "1" ? 1 : 0;
    const modelParam = engine === "workersai" ? `&model=${encodeURIComponent(model)}` : "";
    const res = await fetch(`${API_BASE}/?engine=${engine}&bot=${isBot}${modelParam}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
    isBot = 0;

    if (!res.ok) {
      throw new Error("API trả về lỗi: " + res.status);
    }

    const json = await res.json();

    if (!json.data) {
      throw new Error("API trả về nội dung rỗng");
    }
    
    output.value = json.data.replace(/\\n/g, '\n');

    // Populate and show the publish form
    let titleVal = json.title_short || "";
    let contentVal = output.value;
    let categoryVal = json.forum_id || "technology";
    let tagsVal = [];

    try {
      const parsed = JSON.parse(json.data);
      if (parsed && typeof parsed === "object") {
        titleVal = titleVal || parsed.title || "";
        contentVal = parsed.content || "";
        categoryVal = json.forum_id || parsed.category_id || "technology";
        tagsVal = parsed.tags || [];
      }
    } catch (e) {
      // not a JSON, use plain text
    }

    let titleEnVal = json.title_short_en || "";
    let contentEnVal = json.data_en ? json.data_en.replace(/\\n/g, '\n') : "";

    document.getElementById("postTitle").value = titleVal;
    document.getElementById("postContent").value = contentVal;
    document.getElementById("postTitleEn").value = titleEnVal;
    document.getElementById("postContentEn").value = contentEnVal;
    document.getElementById("postCategory").value = categoryVal;
    selectedTags = tagsVal;
    renderTags();
    document.getElementById("publishForm").style.display = "block";

    // ⭐ refresh history sau khi convert
    loadHistory();
  } catch (err) {
    output.value = "Lỗi: " + err.message;
  } finally {
    loadingEl.classList.remove("show");
  }
});

// =============================
// 📝 PUBLISH FORM HANDLERS & STATE
// =============================
const systemTags = [
  'iOS', 'iPhone', 'Apple', 'Android', 'Windows', 'Windows 11', 'Microsoft',
  'ứng dụng', 'ứng dụng miễn phí', 'miễn phí', 'game', 'game miễn phí',
  'phần mềm', 'phần mềm miễn phí', 'Steam', 'Epic Games', 'Mobile'
];
let selectedTags = [];

function renderTags() {
  const activeTagsList = document.getElementById("activeTagsList");
  if (!activeTagsList) return;
  activeTagsList.innerHTML = "";
  selectedTags.forEach((tag, idx) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.title = tag;
    chip.innerHTML = `<span class="tag-text-span">${tag}</span><span class="remove-tag" data-index="${idx}" style="cursor:pointer; margin-left: 5px;">&times;</span>`;
    activeTagsList.appendChild(chip);
  });

  // Update system tag buttons active states
  const systemBtns = document.querySelectorAll(".system-tag-btn");
  systemBtns.forEach(btn => {
    const tag = btn.getAttribute("data-tag");
    if (selectedTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function addTag(tag) {
  if (!tag.trim()) return;
  const tags = tag.split(',').map(t => t.trim()).filter(t => t.length > 0);
  tags.forEach(t => {
    const exists = selectedTags.some(existing => existing.toLowerCase() === t.toLowerCase());
    if (!exists) {
      selectedTags.push(t);
    }
  });
  renderTags();
}

function initSystemTags() {
  const container = document.getElementById("systemTagsList");
  if (!container) return;
  container.innerHTML = "";
  systemTags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "system-tag-btn";
    btn.type = "button";
    btn.setAttribute("data-tag", tag);
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      const idx = selectedTags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
      if (idx >= 0) {
        selectedTags.splice(idx, 1);
      } else {
        selectedTags.push(tag);
      }
      renderTags();
    });
    container.appendChild(btn);
  });
}

// Add Tag Button Event
document.getElementById("addTagBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  const input = document.getElementById("tagInput");
  addTag(input.value);
  input.value = "";
});

document.getElementById("tagInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTag(e.target.value);
    e.target.value = "";
  }
});

document.getElementById("activeTagsList")?.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-tag")) {
    const idx = parseInt(e.target.getAttribute("data-index"));
    selectedTags.splice(idx, 1);
    renderTags();
  }
});

document.getElementById("isScheduled")?.addEventListener("change", function() {
  const wrapper = document.getElementById("scheduleTimeWrapper");
  if (wrapper) {
    wrapper.style.display = this.checked ? "block" : "none";
  }
});

let jwtToken = localStorage.getItem("post_token") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzkwMjMyZS0wMmRhLTQ4YzEtOWI0ZC1iMjcwYmY5YmQ2MjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwic3RhdHVzIjoiYWN0aXZlIiwiaWF0IjoxNzgwMTEzOTY5LCJleHAiOjE3ODA3MTg3Njl9.1Q2GXLut_m5jBBueU6mHO9mxvawDQNrat-rXDbmWwTA";
let pendingPostData = null;

const loginModal = document.getElementById("loginModal");
const closeLoginModal = document.getElementById("closeLoginModal");
const submitLoginBtn = document.getElementById("submitLoginBtn");

function showLoginModal(postData = null) {
  pendingPostData = postData;
  loginModal.classList.add("show");
}

function hideLoginModal() {
  loginModal.classList.remove("show");
  pendingPostData = null;
}

closeLoginModal?.addEventListener("click", hideLoginModal);
window.addEventListener("click", (e) => {
  if (e.target === loginModal) {
    hideLoginModal();
  }
});

const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Vui lòng nhập đầy đủ email và mật khẩu!");
    return;
  }

  submitLoginBtn.disabled = true;
  submitLoginBtn.textContent = "Đang xác thực...";

  try {
    const res = await fetch("https://techdeal-worker.mdchannelvn.workers.dev/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    const token = data.token || (data.data && data.data.token);

    if (res.ok && token) {
      jwtToken = token;
      localStorage.setItem("post_token", token);
      alert("Đăng nhập thành công!");
      hideLoginModal();
      
      if (pendingPostData) {
        publishPost(pendingPostData);
      }
    } else {
      alert(data.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản!");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Có lỗi xảy ra khi kết nối tới máy chủ đăng nhập!");
  } finally {
    submitLoginBtn.disabled = false;
    submitLoginBtn.textContent = "Đăng nhập";
  }
});

async function publishPost(postData) {
  const publishBtn = document.getElementById("publishBtn");
  publishBtn.disabled = true;
  publishBtn.textContent = "Đang xử lý...";

  try {
    const response = await fetch("https://techdeal-worker.mdchannelvn.workers.dev/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`
      },
      body: JSON.stringify(postData)
    });

    if (response.status === 401) {
      // Token expired or invalid, trigger login popup
      showLoginModal(postData);
      return;
    }

    const resJson = await response.json();
    if (response.ok && resJson.success) {
      alert(`Chúc mừng! Bài viết đã được ${postData.scheduled_at ? 'hẹn giờ đăng thành công!' : 'đăng thành công!'}`);
    } else {
      alert(resJson.message || "Có lỗi xảy ra khi đăng bài viết!");
    }
  } catch (err) {
    console.error("Publish error:", err);
    alert("Có lỗi xảy ra khi đăng bài viết!");
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "Đăng bài viết";
  }
}

document.getElementById("publishBtn")?.addEventListener("click", async () => {
  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const titleEn = document.getElementById("postTitleEn").value.trim();
  const contentEn = document.getElementById("postContentEn").value.trim();
  const categoryId = document.getElementById("postCategory").value;
  const isScheduled = document.getElementById("isScheduled").checked;
  const scheduleDate = document.getElementById("scheduleDate").value;

  if (!title) {
    alert("Vui lòng điền tiêu đề bài viết!");
    return;
  }
  if (!content) {
    alert("Vui lòng nhập nội dung bài viết!");
    return;
  }

  const postData = {
    title,
    content,
    title_en: titleEn || undefined,
    content_en: contentEn || undefined,
    category_id: categoryId,
    tags: selectedTags,
    scheduled_at: isScheduled && scheduleDate ? new Date(scheduleDate).toISOString() : null
  };

  await publishPost(postData);
});

document.getElementById("engineSelect").addEventListener("change", function () {
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.style.display = this.value === "workersai" ? "block" : "none";
});

// =============================
// 📋 COPY 1 CLICK
// =============================
document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = document.getElementById("outputArea").value;

  if (!text) return alert("Không có nội dung để copy");

  await navigator.clipboard.writeText(text);

  const btn = document.getElementById("copyBtn");
  btn.textContent = "✅";
  setTimeout(() => (btn.textContent = "📋"), 1200);
});

// ===============================
// 🔄 BBCode ⇄ Preview
// ===============================

const bbBtn = document.getElementById("bbViewBtn");
const textarea = document.getElementById("outputArea");
const preview = document.getElementById("previewArea");

let isPreview = false;

bbBtn.addEventListener("click", () => {
  if (!isPreview) {
    const bbcode = textarea.value;

    if (!bbcode.trim()) return;

    preview.innerHTML = renderBBCode(bbcode);

    textarea.style.display = "none";
    preview.style.display = "block";

    bbBtn.textContent = "Preview";
    isPreview = true;
  } else {
    textarea.style.display = "block";
    preview.style.display = "none";

    bbBtn.textContent = "BBCode";
    isPreview = false;
  }
});

// ===============================
// 🧠 BBCode → HTML (basic)
// ===============================

function renderBBCode(text) {
  return (
    text
      // ảnh
      .replace(
        /\[CENTER\]\[IMG\](.*?)\[\/IMG\]\[\/CENTER\]/gi,
        '<div style="text-align:center"><img src="$1"></div>',
      )

      // link
      .replace(
        /\[URL='(.*?)'\](.*?)\[\/URL\]/gi,
        '<a href="$1" target="_blank">$2</a>',
      )

      // right
      .replace(
        /\[RIGHT\](.*?)\[\/RIGHT\]/gi,
        '<div style="text-align:right">$1</div>',
      )

      // prebreak
      .replace(/\[prebreak\]\[\/prebreak\]/gi, "<hr>")

      // similar tag
      .replace(
        /\[similar\](.*?)\[\/similar\]/gi,
        '<div style="opacity:0.7">$1</div>',
      )

      // xuống dòng
      .replace(/\n/g, "<br>")
  );
}

// =============================
// 📚 LOAD HISTORY
// =============================
async function loadHistory() {
  const res = await fetch(API_BASE + "/api/history");
  const data = await res.json();

  const container = document.getElementById("historyList");
  if (!container) return;

  container.innerHTML = "";

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";

    const source = item.source ?? "unknown";
    const engine = item.engine ?? "unknown";
    const date = new Date(item.created_at.replace(" ", "T")).toLocaleString();

    div.innerHTML = `
      <strong>${source}</strong><br>
      <span class="engine-badge ${engine}">${engine}</span><br>
      <small>${date}</small>
      <div>
        <button onclick="viewItem(${item.id})">Xem</button>
        <button onclick="deleteItem(${item.id})">Xóa</button>
      </div>
    `;

    container.appendChild(div);
  });
}

// =============================
// 👁 XEM BÀI
// =============================
async function viewItem(id) {
  const res = await fetch(API_BASE + "/api/history");
  const data = await res.json();

  const item = data.find((i) => i.id === id);
  if (item) {
    document.getElementById("outputArea").value = item.result;

    // Populate and show the publish form
    let titleVal = "";
    let contentVal = item.result;
    let categoryVal = "technology";
    let tagsVal = [];

    try {
      const parsed = JSON.parse(item.result);
      if (parsed && typeof parsed === "object") {
        titleVal = parsed.title || "";
        contentVal = parsed.content || "";
        categoryVal = parsed.category_id || "technology";
        tagsVal = parsed.tags || [];
      }
    } catch (e) {
      // not a JSON, use plain text
    }

    document.getElementById("postTitle").value = titleVal;
    document.getElementById("postContent").value = contentVal;
    document.getElementById("postCategory").value = categoryVal;
    selectedTags = tagsVal;
    renderTags();
    document.getElementById("publishForm").style.display = "block";
  }
}

// =============================
// ❌ XÓA 1 BÀI
// =============================
async function deleteItem(id) {
  await fetch(`${API_BASE}/api/delete?id=${id}`);
  loadHistory();
}

// =============================
// 💣 CLEAR ALL
// =============================
document
  .getElementById("clearHistoryBtn")
  ?.addEventListener("click", async () => {
    if (!confirm("Xóa toàn bộ lịch sử?")) return;

    await fetch(API_BASE + "/api/clear");
    loadHistory();
  });

// =============================
// 🌓 Chuyển Dark Light mode
// =============================

const toggleBtn = document.getElementById("themeToggle");

function setTheme(mode) {
  if (mode === "dark") {
    document.body.classList.add("dark");
    toggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    toggleBtn.textContent = "🌙";
  }
  localStorage.setItem("theme", mode);
}

const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);

toggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  setTheme(isDark ? "light" : "dark");
});

const params = new URLSearchParams(window.location.search);
const incomingUrl = params.get("url");
const bot = params.get("bot");

if (incomingUrl) {
  const input = document.getElementById("urlInput");
  input.value = incomingUrl;
}

const engineParam = params.get("engine");
if (engineParam) {
  const select = document.getElementById("engineSelect");
  select.value = engineParam;
}

// =============================
// 🌓 LOAD HISTORY khi mở trang
// =============================
loadHistory();
initSystemTags();

// =============================
// 📝 ĐĂNG BÀI TRỰC TIẾP
// =============================
document.getElementById("directPublishBtn")?.addEventListener("click", () => {
  const publishForm = document.getElementById("publishForm");
  if (publishForm) {
    const isHidden = publishForm.style.display === "none" || publishForm.style.display === "";
    if (isHidden) {
      // Clear fields to show a fresh empty form
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
      document.getElementById("postCategory").value = "technology";
      selectedTags = [];
      renderTags();
      
      const isScheduled = document.getElementById("isScheduled");
      if (isScheduled) {
        isScheduled.checked = false;
      }
      const scheduleTimeWrapper = document.getElementById("scheduleTimeWrapper");
      if (scheduleTimeWrapper) {
        scheduleTimeWrapper.style.display = "none";
      }
      
      publishForm.style.display = "block";
      publishForm.scrollIntoView({ behavior: "smooth" });
    } else {
      publishForm.style.display = "none";
    }
  }
});
