// 统一事件管理
const initApp = () => {
  const captureBtn = document.getElementById("captureBtn");

  // 单一事件绑定
  captureBtn.addEventListener("click", () => {
    window.electronAPI
      .startSelection()
      .catch((err) => showError("截图启动失败"));
  });

  // 添加下载功能
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const img = document.getElementById("screenshot");
    const link = document.createElement("a");
    link.download = `screenshot-${Date.now()}.png`;
    link.href = img.src;
    link.click();
  });
};

// 添加用户反馈
const showFeedback = (message) => {
  const feedback = document.createElement("div");
  feedback.className = "feedback-toast";
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 2000);
};

window.electronAPI.onScreenshotTaken((result) => {
  const container = document.getElementById("screenshot-container");
  const dimensionElement = document.getElementById("dimensions-display");

  // 添加元素存在性检查
  if (!dimensionElement) {
    console.error("未找到尺寸显示元素");
    return;
  }

  const img = document.createElement("img");
  img.id = "screenshot";
  img.src = result.dataURL;
  img.style.maxWidth = "100%";

  container.innerHTML = "";
  container.appendChild(img);
  container.style.display = "block";

  dimensionElement.textContent = `尺寸: ${result.dimensions.width}x${result.dimensions.height}px`;
});

// 确保DOM加载完成后再执行
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("captureBtn").addEventListener("click", () => {
    window.electronAPI.startSelection();
  });
});

window.electronAPI.onError((error) => {
  const container = document.getElementById("screenshot-container");
  container.innerHTML = `<p class="error">错误: ${error}</p>`;
  container.style.display = "block"; // 显示错误信息
});
