const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const screenshot = require("screenshot-desktop");
const sharp = require("sharp"); // 用于裁剪图片
const {postFileFun} = require( "./Api/index.js");

let mainWindow;
let screenshotWindow;
// 添加翻译窗口变量
let translationWindow;

// 创建翻译窗口函数
function createTranslationWindow(rect, text) {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;

  // 计算文本所需空间
  const avgCharWidth = 8; // 平均每个字符的宽度(像素)
  const lineHeight = 20; // 每行高度(像素)
  const padding = 20; // 窗口内边距
  const maxWidth = 400; // 最大窗口宽度
  const minWidth = 200; // 最小窗口宽度
  const minHeight = 100; // 最小窗口高度

  // 计算文本行数和最长行长度
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));

  // 计算窗口尺寸
  let windowWidth = Math.min(
      maxWidth,
      Math.max(minWidth, maxLineLength * avgCharWidth + padding * 2)
  );
  let windowHeight = Math.max(
      minHeight,
      lines.length * lineHeight + padding * 2
  );

  // 计算窗口位置（在截图区域右侧，如果空间不足则放在左侧）
  let x = rect.x + rect.width + 10;
  const y = rect.y;

  // 检查右侧是否有足够空间，如果没有则放在左侧
  const displayBounds = primaryDisplay.bounds;
  if (x + windowWidth > displayBounds.width) {
    x = rect.x - windowWidth - 10;
  }

  translationWindow = new BrowserWindow({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(windowWidth),
    height: Math.round(windowHeight),
    alwaysOnTop: true,
    frame: false,
    backgroundColor: '#fff',
    transparent: false, // 改为不透明以便更好显示文本
    resizable: true, // 允许用户手动调整大小
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  translationWindow.loadFile('translation.html');

  // 窗口加载完成后发送翻译文本
  translationWindow.webContents.on('did-finish-load', () => {
    translationWindow.webContents.send('set-translation', {
      text: text,
      width: windowWidth,
      height: windowHeight
    });
  });

  // 双击关闭窗口
  translationWindow.webContents.executeJavaScript(`
    document.addEventListener('dblclick', () => {
      window.electronAPI.closeTranslation();
    });
  `);
}

// 关闭翻译窗口
function closeTranslationWindow() {
  if (translationWindow) {
    translationWindow.close();
    translationWindow = null;
  }
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile("index.html");
}

function createScreenshotWindow() {
  const { screen } = require("electron");
  const displays = screen.getAllDisplays();

  // 计算所有显示器的联合边界
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  displays.forEach((display) => {
    const { x, y, width, height } = display.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  screenshotWindow = new BrowserWindow({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // 添加预加载脚本
      nodeIntegration: false, // 禁用 nodeIntegration 更安全
      contextIsolation: true, // 启用上下文隔离
    },
  });

  screenshotWindow.webContents.on("did-finish-load", () => {
    const [x, y] = screenshotWindow.getPosition();
    const scale = screen.getPrimaryDisplay().scaleFactor; // 直接获取系统缩放
    console.log("Screenshot window position:", x, y, scale);
    screenshotWindow.webContents.send("window-position", { x, y, scale });
  });
  screenshotWindow.loadFile("screenshot.html");
  screenshotWindow.setIgnoreMouseEvents(false);
  screenshotWindow.focus();
}

app.whenReady().then(() => {
  createWindow();

  // 注册全局快捷键 Ctrl+Shift+X
  globalShortcut.register("CommandOrControl+Shift+X", () => {
    if (!screenshotWindow) {
      createScreenshotWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("start-screenshot", () => {
  if (!screenshotWindow) {
    createScreenshotWindow();
  }
});

ipcMain.on("close-screenshot", () => {
  if (screenshotWindow) {
    // 在关闭窗口前发送清理消息
    screenshotWindow.webContents.send("cleanup-screenshot");
    // 延迟关闭以确保消息被处理
    setTimeout(() => {
      screenshotWindow.close();
      screenshotWindow = null;
    }, 50);
  }
});

//截图把图片传给后端并请求翻译
ipcMain.on("capture-screenshot", async (event, rect) => {
  try {
    const { screen } = require("electron");
    const displays = screen.getAllDisplays();

    // 获取主显示器
    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;

    // 计算所有显示器的联合边界
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    displays.forEach((display) => {
      const { x, y, width, height } = display.bounds;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // 捕获整个虚拟屏幕区域
    const imgBuffer = await screenshot({
      format: "png",
      screen: 0, // 捕获所有显示器
      width: maxX - minX,
      height: maxY - minY,
      left: minX,
      top: minY,
    });

    // 调整坐标系统（考虑多显示器偏移和缩放因子）
    const adjustedRect = {
      x: Math.round((rect.x - minX) * scaleFactor),
      y: Math.round((rect.y - minY) * scaleFactor),
      width: Math.round(rect.width * scaleFactor),
      height: Math.round(rect.height * scaleFactor),
    };


    const croppedBuffer = await sharp(imgBuffer)
      .extract({
        left: adjustedRect.x,
        top: adjustedRect.y,
        width: adjustedRect.width,
        height: adjustedRect.height,
      })
      .toBuffer();

    const dataURL = `data:image/png;base64,${croppedBuffer.toString("base64")}`;
    mainWindow.webContents.send("screenshot-captured", dataURL);

    // 调用翻译API
    mainWindow.webContents.send('translation-state',{text:'翻译中',code:1});
    const {data} = await postFileFun(dataURL); // 实现你的翻译API调用
    const {Result} = data;
    // 创建翻译窗口
    createTranslationWindow(rect, Result);
    mainWindow.webContents.send('translation-state',{text:'翻译完成',code:2,result:Result})
  } catch (error) {
    console.error("截图失败:", error);
    mainWindow.webContents.send('translation',{text:'翻译失败',code:0})
  }
});

// 添加关闭翻译窗口的IPC处理
ipcMain.on("close-translation", () => {
  closeTranslationWindow();
});