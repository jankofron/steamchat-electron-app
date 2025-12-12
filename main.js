const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, session, Notification } = require('electron');
const path = require('path');

const MODERN_CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const START_URL = 'https://steamcommunity.com/chat';
const PARTITION = 'persist:steamchat';
const APP_NAME = 'Steam Chat';
const APP_ICON = path.join(__dirname, 'icons', 'icon.png');

let win,
  tray,
  unread = 0;

function setUnread(count) {
  unread = Math.max(0, count | 0);
  const iconName = unread > 0 ? 'icon-unread.png' : 'icon.png';
  tray?.setImage(nativeImage.createFromPath(path.join(__dirname, 'icons', iconName)));
  tray?.setToolTip(unread > 0 ? `${APP_NAME} (${unread} unread)` : APP_NAME);
}

function markUnread() {
  setUnread(unread + 1);
}

function focusWindow() {
  if (!win) return;
  if (!win.isVisible()) win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}

function isSteamUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('steamcommunity.com') || host.endsWith('steampowered.com');
  } catch {
    return false;
  }
}

function allowSteamPermissions() {
  const ses = session.fromPartition(PARTITION);
  // Auto-allow notifications for Steam chat and login pages
  try {
    ses.setPermissionRequestHandler((wc, permission, callback, details) => {
      const origin = (details && details.requestingUrl) || (wc && wc.getURL && wc.getURL()) || '';
      if (permission === 'notifications' && (origin.startsWith('https://steamcommunity.com') || origin.startsWith('https://store.steampowered.com'))) {
        return callback(true);
      }
      return callback(false);
    });
  } catch {}
}

function showNativeNotification({ title, body } = {}) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: title || APP_NAME,
    body: body || '',
    icon: APP_ICON,
    actions: [{ type: 'button', text: 'Read' }],
    closeButtonText: 'Dismiss',
  });

  const handleOpen = () => {
    focusWindow();
    setUnread(0);
  };

  notification.once('click', handleOpen);
  notification.once('action', handleOpen);
  notification.show();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      partition: PARTITION,
    },
  });

  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // No menu bar
  win.setMenu(null);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSteamUrl(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.setUserAgent(MODERN_CHROME_UA);

  win.loadURL(START_URL);
  win.once('ready-to-show', () => win.show());

  win.webContents.on('did-navigate', (_e, url) => saveLastUrl(url));
  win.webContents.on('did-navigate-in-page', (_e, url) => saveLastUrl(url));

  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('focus', () => setUnread(0));
}

function saveLastUrl(url) {
  if (url && isSteamUrl(url)) {
    // Plug in persistence (electron-store, etc.) if you want to remember the last room.
  }
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(APP_ICON));
  tray.setToolTip(APP_NAME);

  const menu = Menu.buildFromTemplate([
    { label: 'Show', click: () => { focusWindow(); } },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Reload', click: () => win.webContents.reload() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);

  tray.on('click', () => {
    if (!win) return;
    if (win.isVisible()) win.hide(); else focusWindow();
  });

  setUnread(0);
}

ipcMain.on('notification-from-web', (_evt, payload) => {
  markUnread();
  showNativeNotification(payload);
});

ipcMain.on('notification-click', () => {
  focusWindow();
  setUnread(0);
});

app.userAgentFallback = MODERN_CHROME_UA;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.whenReady().then(() => {
    allowSteamPermissions();
    createWindow();
    createTray();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.on('window-all-closed', () => {
  // Keep running in tray
});
