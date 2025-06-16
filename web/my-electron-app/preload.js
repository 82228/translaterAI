//暴露API接口给渲染进程使用
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 统一截图功能
  captureScreenshot: (rect) => ipcRenderer.send("capture-screenshot", rect),
  // 统一关闭功能
  closeScreenshot: () => ipcRenderer.send("close-screenshot"),
  // 合并所有事件监听
  onWindowPosition: (callback) =>
    ipcRenderer.on("window-position", (event, position) => {
      console.log("position:", position);
      callback(event, position);
    }),
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on("screenshot-captured", (event, dataURL) =>
      callback(dataURL)
    ),
  // 创建截屏窗口
  createScreenshotWindow: () => ipcRenderer.send("start-screenshot"),
  closeTranslation: () => ipcRenderer.send("close-translation"),
  onSetTranslation: (callback) => ipcRenderer.on("set-translation", (event, text) => callback(text)),
  // 翻译状态显示
  translationState:(callback)=>ipcRenderer.on('translation-state',(event, state)=>callback(state))
});
