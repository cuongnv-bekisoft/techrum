const API_BASE = "https://techrum.cuongnv.workers.dev";

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

  loadingEl.style.display = "block";
  output.value = "";

  try {
    const engine = document.getElementById("engineSelect").value;
    let isBot = bot === "1" ? 1 : 0;
    const res = await fetch(`${API_BASE}/?engine=${engine}&bot=${isBot}`, {
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

    const data = await res.text();

    if (!data.trim()) {
      throw new Error("API trả về nội dung rỗng");
    }

    output.value = data;

    // ⭐ refresh history sau khi convert
    loadHistory();
  } catch (err) {
    output.value = "Lỗi: " + err.message;
  } finally {
    loadingEl.style.display = "none";
  }
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

    div.innerHTML = `
      <strong>${item.source}</strong><br>
      <span class="engine-badge">${item.engine || "unknown"}</span><br>
      <small>${new Date(item.created_at).toLocaleString()}</small>
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
