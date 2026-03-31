// ===== THEME =====

const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  if (themeToggle) themeToggle.textContent = "☀️";
}

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");

  localStorage.setItem("theme", dark ? "dark" : "light");

  themeToggle.textContent = dark ? "☀️" : "🌙";
});

// ===== SIDEBAR =====

const menuBtn = document.getElementById("menuBtn");

menuBtn?.addEventListener("click", () => {
  document.querySelector(".sidebar")?.classList.toggle("open");
  document.getElementById("overlay")?.classList.toggle("show");
});

function closeSidebar() {
  document.querySelector(".sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}
