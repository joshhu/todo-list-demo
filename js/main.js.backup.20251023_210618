/**
 * 主應用程式入口文件
 *
 * 這個文件負責初始化整個應用程式，載入所有必要的模組，
 * 並協調各個組件之間的交互。遵循 ES6+ 模組系統。
 */

import { App } from './modules/app.js';
import { Storage } from './modules/storage.js';
import { UI } from './modules/ui.js';
import { Utils } from './modules/utils.js';
import { Settings } from './config/settings.js';

/**
 * 安全地創建通知元素
 */
function createNotificationElement(message, type = 'info', title = null) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  const icon = document.createElement('div');
  icon.className = 'notification-icon';
  icon.textContent = getNotificationIcon(type);

  const content = document.createElement('div');
  content.className = 'notification-content';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'notification-title';
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.className = 'notification-message';
  messageEl.textContent = message;
  content.appendChild(messageEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.setAttribute('aria-label', '關閉通知');
  closeBtn.textContent = '✕';

  notification.appendChild(icon);
  notification.appendChild(content);
  notification.appendChild(closeBtn);

  // 添加關閉事件監聽器
  closeBtn.addEventListener('click', () => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  });

  return notification;
}

/**
 * 顯示通知的輔助函數
 */
function showNotification(message, type = 'info', title = null) {
  const notification = createNotificationElement(message, type, title);

  const container = document.getElementById('notificationContainer');
  if (container) {
    container.appendChild(notification);

    // 自動移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }
}

/**
 * 根據通知類型獲取圖標
 */
function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

/**
 * 顯示載入指示器
 */
function showLoadingIndicator() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.setAttribute('aria-hidden', 'false');
  }
}

/**
 * 隱藏載入指示器
 */
function hideLoadingIndicator() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.setAttribute('aria-hidden', 'true');
  }
}

/**
 * 顯示錯誤訊息
 */
function showErrorMessage(message) {
  hideLoadingIndicator();
  showNotification(message, 'error', '錯誤');
}

/**
 * 應用程式初始化函數
 */
async function initializeApp() {
  try {
    // 顯示載入指示器
    showLoadingIndicator();

    // 初始化設定
    const settings = new Settings();
    await settings.initialize();

    // 初始化儲存模組
    const storage = new Storage(settings);
    await storage.initialize();

    // 初始化工具模組
    const utils = new Utils(settings);

    // 初始化 UI 模組
    const ui = new UI(settings, utils);
    await ui.initialize();

    // 初始化主應用程式
    const app = new App(settings, storage, ui, utils);
    await app.initialize();

    // 隱藏載入指示器
    hideLoadingIndicator();

    // 註冊服務工作者（如果支援）
    registerServiceWorker();

    console.log('✅ Todo List 應用程式初始化完成');

  } catch (error) {
    console.error('❌ 應用程式初始化失敗:', error);
    showErrorMessage('應用程式初始化失敗，請重新載入頁面。');
  }
}

/**
 * 註冊服務工作者（用於 PWA 功能）
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('📦 Service Worker 註冊成功:', registration);
    } catch (error) {
      console.log('📦 Service Worker 註冊失敗:', error);
    }
  }
}

/**
 * 全域錯誤處理
 */
window.addEventListener('error', (event) => {
  console.error('全域錯誤:', event.error);
  showErrorMessage('發生未預期的錯誤，請重新載入頁面。');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  showErrorMessage('應用程式發生錯誤，請重新載入頁面。');
});

/**
 * 鍵盤快捷鍵處理
 */
document.addEventListener('keydown', (event) => {
  // Ctrl+Enter 或 Cmd+Enter：提交表單
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.form) {
      event.preventDefault();
      activeElement.form.requestSubmit();
    }
  }

  // / 鍵：聚焦搜索框
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return; // 如果已經在輸入框中，不觸發搜索
    }

    event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Escape 鍵：清除搜索或關閉模態框
  if (event.key === 'Escape') {
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('confirmModal');

    if (modal && modal.getAttribute('aria-hidden') === 'false') {
      // 關閉模態框
      modal.setAttribute('aria-hidden', 'true');
    } else if (searchInput && searchInput.value && document.activeElement === searchInput) {
      // 清除搜索
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }
  }
});

/**
 * 監聽線上/離線狀態
 */
window.addEventListener('online', () => {
  console.log('🌐 網路連線已恢復');
  showNotification('網路連線已恢復', 'success');
});

window.addEventListener('offline', () => {
  console.log('📶 網路連線已斷開');
  showNotification('網路連線已斷開，部分功能可能無法使用', 'warning');
});

/**
 * DOM 內容載入完成後初始化應用程式
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // 如果 DOM 已經載入完成，直接初始化
  initializeApp();
}

/**
 * 導出主要模組供其他腳本使用
 */
window.TodoApp = {
  App,
  Storage,
  UI,
  Utils,
  Settings
};

/**
 * 開發模式下的除錯工具
 */
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  window.TodoAppDebug = {
    // 開發專用的除錯方法
    logState: () => {
      console.log('應用程式狀態:', {
        readyState: document.readyState,
        online: navigator.onLine,
        storage: typeof Storage !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator
      });
    },

    // 清除所有資料
    clearAllData: () => {
      if (confirm('確定要清除所有資料嗎？此操作無法復原。')) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      }
    }
  };

  console.log('🔧 TodoList 開發模式已啟用');
  console.log('💡 使用 TodoAppDebug.logState() 查看應用程式狀態');
}