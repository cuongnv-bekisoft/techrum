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
    const res = await fetch("https://techrum.cuongnv.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      throw new Error("API trả về lỗi: " + res.status);
    }

    const data = await res.text();

    if (!data.trim()) {
        throw new Error("API trả về nội dung rỗng");
    }

    output.value = data;
  } 
  catch (err) {
    output.value = "Lỗi: " + err.message;
  } 
  finally {
    loadingEl.style.display = "none";
  }
});
