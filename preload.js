// preload.js
// Bridge web notifications to the main process so we can show native notifications
// with a Read button and focus behavior.

const { contextBridge, ipcRenderer } = require('electron');

const BRIDGE_SOURCE = 'steam-desktop-bridge';

function injectNotificationPatch() {
  const script = `
    (() => {
      const NativeNotification = window.Notification;
      if (!NativeNotification) return;

      class ForwardingNotification extends NativeNotification {
        constructor(title, options) {
          super(title, options);
          const payload = {
            title: String(title),
            body: options && options.body ? String(options.body) : ''
          };
          try {
            window.postMessage({ source: '${BRIDGE_SOURCE}', type: 'notification', payload }, '*');
          } catch {}

          this.addEventListener('click', () => {
            try {
              window.postMessage({ source: '${BRIDGE_SOURCE}', type: 'notification-click' }, '*');
            } catch {}
          });
        }

        static get permission() {
          return NativeNotification.permission;
        }

        static requestPermission(...args) {
          return NativeNotification.requestPermission(...args);
        }
      }

      // Preserve prototype chain and metadata
      ForwardingNotification.prototype = NativeNotification.prototype;
      try { ForwardingNotification.maxActions = NativeNotification.maxActions; } catch {}

      Object.defineProperty(window, 'Notification', {
        value: ForwardingNotification,
        configurable: false,
        writable: false,
      });
    })();
  `;

  const node = document.createElement('script');
  node.textContent = script;
  document.documentElement.appendChild(node);
  node.remove();
}

function setupMessageBridge() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.source !== BRIDGE_SOURCE) return;

    if (data.type === 'notification') {
      ipcRenderer.send('notification-from-web', data.payload || {});
    } else if (data.type === 'notification-click') {
      ipcRenderer.send('notification-click');
    }
  });
}

try {
  setupMessageBridge();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNotificationPatch, { once: true });
  } else {
    injectNotificationPatch();
  }
} catch (err) {
  console.error('Failed to wire notifications', err);
}

// Tiny API surface for future use without exposing Node.
contextBridge.exposeInMainWorld('steamDesktop', Object.freeze({}));
